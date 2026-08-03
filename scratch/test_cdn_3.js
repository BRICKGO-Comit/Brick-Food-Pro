const https = require('https');

const list = {
  mtn_momo: 'https://i.imgur.com/vH9Z2Wz.png',
  orange_money: 'https://i.imgur.com/u3a0H3e.png',
  wave_money: 'https://i.imgur.com/D4s6h0E.png',
  moov_money: 'https://i.imgur.com/8QnZ0h5.png',
  cb_visa: 'https://i.imgur.com/S3yJ9B4.png',
};

// Let's test Wikimedia direct PNGs with custom header
const wikimedia = {
  mtn: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/MTN_Logo.svg/200px-MTN_Logo.svg.png',
  orange: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/200px-Orange_logo.svg.png',
  visa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png',
  mastercard: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png'
};

function check(name, urlStr) {
  return new Promise((resolve) => {
    https.get(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      console.log(`[${name}] Status: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    }).on('error', (e) => {
      console.error(`[${name}] Error:`, e.message);
      resolve(false);
    });
  });
}

async function main() {
  console.log('--- TESTING WIKIMEDIA PNG LOGOS ---');
  for (const [k, v] of Object.entries(wikimedia)) {
    await check(k, v);
  }
}
main();
