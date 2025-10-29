/**
 * Privacy Preferences Manager (Renamed from GDPR Consent)
 * Self-contained, zero dependencies
 * Renamed to avoid browser blocking
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        CONSENT_KEY: '10yx_preferences', // Renamed from cookie_consent
        GA_ID: 'G-1MN5PX6T1T',
        CONSENT_EXPIRY_DAYS: 365
    };

    // Consent state
    let consentGiven = null;
    let blockersDetected = false;

    /**
     * Initialize the consent system
     */
    function init() {
        // Detect if blockers are interfering
        detectBlockers();

        // Check for existing consent
        consentGiven = getStoredConsent();

        if (consentGiven === null && !blockersDetected) {
            // No consent stored and no blockers - show banner
            showConsentBanner();
        } else if (consentGiven === true) {
            // Consent given - load analytics
            loadGoogleAnalytics();
        }
        // If consentGiven === false OR blockersDetected, do nothing (no tracking)

        // Set up revoke link
        setupRevokeLink();
    }

    /**
     * Detect if privacy blockers are preventing our script
     */
    function detectBlockers() {
        try {
            // Test if localStorage is accessible
            const testKey = '__10yx_test__';
            localStorage.setItem(testKey, '1');
            localStorage.removeItem(testKey);
            blockersDetected = false;
        } catch (e) {
            // localStorage blocked or restricted
            blockersDetected = true;
            console.log('Privacy tools detected - respecting user preference (no tracking)');
        }

        // Additional check: if this script loaded but GA won't
        // (Some blockers allow our script but block GA)
        if (!blockersDetected) {
            // Check if common GA domains are blocked
            // We'll detect this later when trying to load GA
        }
    }

    /**
     * Get stored consent from localStorage
     * @returns {boolean|null} true = accepted, false = rejected, null = not set
     */
    function getStoredConsent() {
        if (blockersDetected) {
            // If blockers detected, treat as implicit rejection
            return false;
        }

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
            console.warn('Could not read preferences:', e);
            // If we can't read, assume no consent
            return false;
        }
    }

    /**
     * Store consent choice in localStorage
     * @param {boolean} accepted - true if user accepted, false if rejected
     */
    function storeConsent(accepted) {
        if (blockersDetected) {
            console.log('Cannot store preference - privacy tools active');
            return;
        }

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
            console.warn('Could not store preference:', e);
        }
    }

    /**
     * Load Google Analytics after consent
     */
    function loadGoogleAnalytics() {
        // Prevent double-loading
        if (window.gtag) {
            console.log('Analytics already loaded');
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
                'anonymize_ip': true,
                'cookie_flags': 'SameSite=None;Secure'
            });

            console.log('Analytics loaded with user consent');
        };

        script.onerror = function() {
            console.log('Analytics blocked by browser - respecting user preference');
            // This is fine - user's browser/extension is blocking tracking
            // We respect this choice
        };

        document.head.appendChild(script);
    }

    /**
     * Show the consent banner
     */
    function showConsentBanner() {
        // Create banner HTML (renamed classes to avoid blocking)
        const bannerHTML = `
            <div class="notice-overlay" id="notice-overlay" role="dialog" aria-modal="true" aria-labelledby="notice-heading"></div>
            <div class="notice-banner" id="notice-banner" role="dialog" aria-labelledby="notice-heading" aria-describedby="notice-description">
                <div class="notice-content">
                    <div class="notice-text">
                        <h3 id="notice-heading">⚙️ Privacy Preferences</h3>
                        <p id="notice-description">
                            We use analytics tools to improve your experience and understand how our site is used.
                            Read our <a href="/privacy.html">Privacy Policy</a> for details.
                        </p>
                        <div class="notice-details">
                            <button class="notice-toggle" id="notice-toggle" aria-expanded="false" aria-controls="notice-list">
                                What data do we collect?
                            </button>
                            <ul class="notice-list" id="notice-list">
                                <li><strong>Google Analytics:</strong> Tracks page views, sessions, and usage patterns to help us improve the website.</li>
                                <li><strong>Preference Storage:</strong> Stores your privacy choice locally (essential, always active).</li>
                            </ul>
                        </div>
                    </div>
                    <div class="notice-actions">
                        <button class="notice-btn notice-btn-accept" id="notice-accept">
                            Accept
                        </button>
                        <button class="notice-btn notice-btn-reject" id="notice-reject">
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Insert into DOM
        document.body.insertAdjacentHTML('beforeend', bannerHTML);

        // Get elements
        const overlay = document.getElementById('notice-overlay');
        const banner = document.getElementById('notice-banner');
        const acceptBtn = document.getElementById('notice-accept');
        const rejectBtn = document.getElementById('notice-reject');
        const toggle = document.getElementById('notice-toggle');
        const noticeList = document.getElementById('notice-list');

        // Show banner with animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            banner.classList.add('active');
        });

        // Focus management
        acceptBtn.focus();

        // Event listeners
        acceptBtn.addEventListener('click', () => handleAccept(overlay, banner));
        rejectBtn.addEventListener('click', () => handleReject(overlay, banner));
        toggle.addEventListener('click', () => toggleDetails(toggle, noticeList));

        // Keyboard navigation
        banner.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                handleReject(overlay, banner);
            }
        });

        // Trap focus
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
        announceToScreenReader('Privacy preferences saved. Analytics enabled.');
    }

    /**
     * Handle reject button click
     */
    function handleReject(overlay, banner) {
        consentGiven = false;
        storeConsent(false);
        hideConsentBanner(overlay, banner);
        announceToScreenReader('Privacy preferences saved. Analytics disabled.');
    }

    /**
     * Hide consent banner with animation
     */
    function hideConsentBanner(overlay, banner) {
        overlay.classList.remove('active');
        banner.classList.remove('active');

        setTimeout(() => {
            overlay.remove();
            banner.remove();
        }, 400);
    }

    /**
     * Toggle details visibility
     */
    function toggleDetails(toggle, list) {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
        toggle.classList.toggle('expanded');
        list.classList.toggle('visible');
    }

    /**
     * Set up revoke link in footer
     */
    function setupRevokeLink() {
        const footers = document.querySelectorAll('.footer-links');

        footers.forEach(footer => {
            if (footer.querySelector('.settings-link')) return;

            const link = document.createElement('a');
            link.href = '#';
            link.className = 'settings-link';
            link.textContent = 'Privacy Settings';
            link.setAttribute('aria-label', 'Manage privacy preferences');

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
        try {
            localStorage.removeItem(CONFIG.CONSENT_KEY);
        } catch (e) {
            console.warn('Could not remove preference:', e);
        }

        consentGiven = null;

        const existingOverlay = document.getElementById('notice-overlay');
        const existingBanner = document.getElementById('notice-banner');
        if (existingOverlay) existingOverlay.remove();
        if (existingBanner) existingBanner.remove();

        showConsentBanner();
    }

    /**
     * Trap focus within element
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
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        });
    }

    /**
     * Announce to screen readers
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

    // Export for console testing
    window.PrivacyPreferences = {
        revoke: revokeConsent,
        getStatus: () => consentGiven,
        forceShow: showConsentBanner,
        blockersDetected: () => blockersDetected
    };

})();
