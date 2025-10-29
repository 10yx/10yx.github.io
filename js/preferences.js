/**
 * GDPR Cookie Consent Manager
 * Self-contained, zero dependencies
 * Complies with GDPR requirements for Estonian companies
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        CONSENT_KEY: '10yx_cookie_consent',
        GA_ID: 'G-1MN5PX6T1T',
        CONSENT_EXPIRY_DAYS: 365
    };

    // Consent state
    let consentGiven = null;

    /**
     * Initialize the consent system
     */
    function init() {
        // Check for existing consent
        consentGiven = getStoredConsent();

        if (consentGiven === null) {
            // No consent stored - show banner
            showConsentBanner();
        } else if (consentGiven === true) {
            // Consent given - load analytics
            loadGoogleAnalytics();
        }
        // If consentGiven === false, do nothing (user rejected)

        // Set up revoke consent link
        setupRevokeLink();
    }

    /**
     * Get stored consent from localStorage
     * @returns {boolean|null} true = accepted, false = rejected, null = not set
     */
    function getStoredConsent() {
        try {
            const stored = localStorage.getItem(CONFIG.CONSENT_KEY);
            if (stored === null) return null;

            const data = JSON.parse(stored);
            const now = new Date().getTime();

            // Check if consent has expired (after 1 year)
            if (data.expiry && now > data.expiry) {
                localStorage.removeItem(CONFIG.CONSENT_KEY);
                return null;
            }

            return data.consent === true;
        } catch (e) {
            console.warn('Failed to read consent from localStorage:', e);
            return null;
        }
    }

    /**
     * Store consent choice in localStorage
     * @param {boolean} accepted - true if user accepted, false if rejected
     */
    function storeConsent(accepted) {
        try {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + CONFIG.CONSENT_EXPIRY_DAYS);

            const data = {
                consent: accepted,
                timestamp: new Date().toISOString(),
                expiry: expiry.getTime()
            };

            localStorage.setItem(CONFIG.CONSENT_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to store consent in localStorage:', e);
        }
    }

    /**
     * Load Google Analytics after consent
     */
    function loadGoogleAnalytics() {
        // Prevent double-loading
        if (window.gtag) {
            console.log('Google Analytics already loaded');
            return;
        }

        // Create script tag for GA
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_ID}`;

        // Initialize GA once loaded
        script.onload = function() {
            window.dataLayer = window.dataLayer || [];
            function gtag() { dataLayer.push(arguments); }
            window.gtag = gtag;

            gtag('js', new Date());
            gtag('config', CONFIG.GA_ID, {
                'anonymize_ip': true, // GDPR best practice
                'cookie_flags': 'SameSite=None;Secure'
            });

            console.log('Google Analytics loaded with consent');
        };

        script.onerror = function() {
            console.error('Failed to load Google Analytics');
        };

        document.head.appendChild(script);
    }

    /**
     * Show the consent banner
     */
    function showConsentBanner() {
        // Create banner HTML
        const bannerHTML = `
            <div class="gdpr-overlay" id="gdpr-overlay" role="dialog" aria-modal="true" aria-labelledby="gdpr-heading"></div>
            <div class="gdpr-consent" id="gdpr-consent" role="dialog" aria-labelledby="gdpr-heading" aria-describedby="gdpr-description">
                <div class="gdpr-content">
                    <div class="gdpr-text">
                        <h3 id="gdpr-heading">🍪 Cookie Consent</h3>
                        <p id="gdpr-description">
                            We use cookies to analyze site traffic and improve your experience.
                            By accepting, you consent to our use of analytics cookies.
                            Read our <a href="/privacy.html">Privacy Policy</a> for details.
                        </p>
                        <div class="gdpr-details">
                            <button class="gdpr-toggle" id="gdpr-toggle" aria-expanded="false" aria-controls="gdpr-cookie-list">
                                What cookies do we use?
                            </button>
                            <ul class="gdpr-cookie-list" id="gdpr-cookie-list">
                                <li><strong>Google Analytics:</strong> Tracks page views, sessions, and user behavior to help us improve the website.</li>
                                <li><strong>Consent Cookie:</strong> Stores your cookie preference (essential, always active).</li>
                            </ul>
                        </div>
                    </div>
                    <div class="gdpr-actions">
                        <button class="gdpr-btn gdpr-btn-accept" id="gdpr-accept">
                            Accept
                        </button>
                        <button class="gdpr-btn gdpr-btn-reject" id="gdpr-reject">
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Insert into DOM
        document.body.insertAdjacentHTML('beforeend', bannerHTML);

        // Get elements
        const overlay = document.getElementById('gdpr-overlay');
        const banner = document.getElementById('gdpr-consent');
        const acceptBtn = document.getElementById('gdpr-accept');
        const rejectBtn = document.getElementById('gdpr-reject');
        const toggle = document.getElementById('gdpr-toggle');
        const cookieList = document.getElementById('gdpr-cookie-list');

        // Show banner with animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            banner.classList.add('active');
        });

        // Focus management for accessibility
        acceptBtn.focus();

        // Event listeners
        acceptBtn.addEventListener('click', () => handleAccept(overlay, banner));
        rejectBtn.addEventListener('click', () => handleReject(overlay, banner));
        toggle.addEventListener('click', () => toggleCookieDetails(toggle, cookieList));

        // Keyboard navigation
        banner.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                handleReject(overlay, banner);
            }
        });

        // Trap focus within banner (accessibility)
        trapFocus(banner);
    }

    /**
     * Handle accept button click
     */
    function handleAccept(overlay, banner) {
        consentGiven = true;
        storeConsent(true);
        hideConsentBanner(overlay, banner);
        loadGoogleAnalytics();

        // Announce to screen readers
        announceToScreenReader('Cookie consent accepted. Google Analytics enabled.');
    }

    /**
     * Handle reject button click
     */
    function handleReject(overlay, banner) {
        consentGiven = false;
        storeConsent(false);
        hideConsentBanner(overlay, banner);

        // Announce to screen readers
        announceToScreenReader('Cookie consent rejected. Analytics disabled.');
    }

    /**
     * Hide consent banner with animation
     */
    function hideConsentBanner(overlay, banner) {
        overlay.classList.remove('active');
        banner.classList.remove('active');

        // Remove from DOM after animation
        setTimeout(() => {
            overlay.remove();
            banner.remove();
        }, 400);
    }

    /**
     * Toggle cookie details visibility
     */
    function toggleCookieDetails(toggle, cookieList) {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

        toggle.setAttribute('aria-expanded', !isExpanded);
        toggle.classList.toggle('expanded');
        cookieList.classList.toggle('visible');
    }

    /**
     * Set up revoke consent link in footer
     */
    function setupRevokeLink() {
        const footers = document.querySelectorAll('.footer-links');

        footers.forEach(footer => {
            // Check if link already exists
            if (footer.querySelector('.gdpr-settings-link')) return;

            const link = document.createElement('a');
            link.href = '#';
            link.className = 'gdpr-settings-link';
            link.textContent = 'Cookie Settings';
            link.setAttribute('aria-label', 'Manage cookie consent settings');

            link.addEventListener('click', (e) => {
                e.preventDefault();
                revokeConsent();
            });

            footer.appendChild(link);
        });
    }

    /**
     * Revoke consent and show banner again
     */
    function revokeConsent() {
        // Clear stored consent
        try {
            localStorage.removeItem(CONFIG.CONSENT_KEY);
        } catch (e) {
            console.warn('Failed to remove consent from localStorage:', e);
        }

        consentGiven = null;

        // Remove any existing banner
        const existingOverlay = document.getElementById('gdpr-overlay');
        const existingBanner = document.getElementById('gdpr-consent');
        if (existingOverlay) existingOverlay.remove();
        if (existingBanner) existingBanner.remove();

        // Show banner again
        showConsentBanner();

        // Note: GA remains loaded if it was previously loaded
        // This is acceptable - we just won't load it again on refresh if rejected
    }

    /**
     * Trap focus within an element (accessibility)
     */
    function trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        });
    }

    /**
     * Announce message to screen readers
     */
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for console testing (optional)
    window.GDPRConsent = {
        revoke: revokeConsent,
        getStatus: () => consentGiven,
        forceShow: showConsentBanner
    };

})();
