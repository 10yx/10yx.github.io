const blockedCountries = ['PK', 'CN']; // Add country codes here

fetch('https://get.geojs.io/v1/ip/country.json')
  .then(response => response.json())
  .then(data => {
    if (blockedCountries.includes(data.country)) {
      document.body.innerHTML = '<h1>Access Denied</h1><p>This website is not available in your country.</p>';
    }
  })
  .catch(error => {
    console.error('Geo-blocking error:', error);
  });
