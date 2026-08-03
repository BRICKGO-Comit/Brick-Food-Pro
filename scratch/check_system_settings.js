const https = require('https');

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

function fetchTable(table) {
  return new Promise((resolve) => {
    https.get(`https://kgcmbbesrzldoiwkckke.supabase.co/rest/v1/${table}?select=*`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); } catch (e) { resolve({ status: res.statusCode, data: [] }); }
      });
    });
  });
}

async function main() {
  const result = await fetchTable('system_settings');
  console.log('SYSTEM SETTINGS TABLE STATUS:', result.status);
  console.log('SYSTEM SETTINGS ROWS:', result.data);
}

main();
