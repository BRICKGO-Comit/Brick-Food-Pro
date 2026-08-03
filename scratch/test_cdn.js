const https = require('https');

const urls = {
  mtn: 'https://raw.githubusercontent.com/ever-pay/easypay-flutter/main/assets/images/mtn.png',
  orange: 'https://raw.githubusercontent.com/ever-pay/easypay-flutter/main/assets/images/orange.png',
  wave: 'https://raw.githubusercontent.com/ever-pay/easypay-flutter/main/assets/images/wave.png',
  moov: 'https://raw.githubusercontent.com/ever-pay/easypay-flutter/main/assets/images/moov.png',
  cb: 'https://raw.githubusercontent.com/ever-pay/easypay-flutter/main/assets/images/visa.png'
};

function check(name, u) {
  return new Promise((res) => {
    https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      console.log(`[${name}] HTTP Status:`, r.statusCode);
      res(r.statusCode === 200);
    }).on('error', e => {
      console.error(`[${name}] Error:`, e.message);
      res(false);
    });
  });
}

async function run() {
  for (const [k, v] of Object.entries(urls)) {
    await check(k, v);
  }
}
run();
