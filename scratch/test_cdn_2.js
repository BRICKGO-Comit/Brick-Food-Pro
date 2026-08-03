const https = require('https');

const list = {
  wave: 'https://cdn-icons-png.flaticon.com/512/10096/10096417.png',
  mtn: 'https://cdn-icons-png.flaticon.com/512/888/888870.png',
  orange: 'https://cdn-icons-png.flaticon.com/512/888/888865.png',
  moov: 'https://cdn-icons-png.flaticon.com/512/888/888874.png',
  cb: 'https://cdn-icons-png.flaticon.com/512/179/179457.png',
  // Official logos
  mtn_official: 'https://seeklogo.com/images/M/mtn-logo-459E44670D-seeklogo.com.png',
  orange_official: 'https://seeklogo.com/images/O/orange-logo-A277BA17BE-seeklogo.com.png',
};

function check(name, urlStr) {
  return new Promise((resolve) => {
    const req = https.get(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      console.log(`[${name}] Status: ${res.statusCode}`);
      resolve(res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302);
    });
    req.on('error', (e) => {
      console.error(`[${name}] Error:`, e.message);
      resolve(false);
    });
  });
}

async function main() {
  for (const [k, v] of Object.entries(list)) {
    await check(k, v);
  }
}
main();
