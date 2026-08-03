const https = require('https');

const logos = {
  mtn_1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/MTN_Logo.svg/512px-MTN_Logo.svg.png',
  mtn_2: 'https://images.seeklogo.com/logo-png/38/1/mtn-logo-png_seeklogo-382903.png',
  orange: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/512px-Orange_logo.svg.png',
  wave: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Wave_logo.png/512px-Wave_logo.png',
  moov: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Moov_Africa_logo.png/512px-Moov_Africa_logo.png',
  visa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/512px-Visa_Inc._logo.svg.png'
};

function checkUrl(name, url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      console.log(`[${name}] Status: ${res.statusCode} | Content-Type: ${res.headers['content-type']}`);
      resolve(res.statusCode === 200);
    }).on('error', err => {
      console.error(`[${name}] Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  for (const [key, val] of Object.entries(logos)) {
    await checkUrl(key, val);
  }
}

main();
