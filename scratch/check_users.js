const https = require('https');

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

function fetchTable(table) {
  return new Promise((resolve) => {
    https.get(`https://kgcmbbesrzldoiwkckke.supabase.co/rest/v1/${table}?select=*`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });
  });
}

async function main() {
  const profiles = await fetchTable('profiles');
  console.log('PROFILES:', JSON.stringify(profiles, null, 2));
}

main();
