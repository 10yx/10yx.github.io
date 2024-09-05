const blockedCountries = ['PK', 'CN']; // Add country codes here

async function blockCountries() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    if (blockedCountries.includes(data.country_code)) {
      document.body.innerHTML = '<h1>Access Denied</h1><p>This website is not available in your country.</p>';
    }
  } catch (error) {
    console.error('Error checking country:', error);
  }
}

blockCountries();
