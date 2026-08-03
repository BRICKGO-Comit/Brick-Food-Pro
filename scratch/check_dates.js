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
        try { resolve(JSON.parse(body)); } catch (e) { resolve([]); }
      });
    });
  });
}

async function main() {
  const restaurants = await fetchTable('restaurants');
  const offers = await fetchTable('offers');
  const orders = await fetchTable('orders');

  console.log('RESTAURANTS CREATED DATES:', restaurants.map(r => ({ name: r.name, created_at: r.created_at })));
  console.log('OFFERS CREATED DATES:', offers.map(o => ({ title: o.title, created_at: o.created_at })));
  console.log('ORDERS CREATED DATES:', orders.map(o => ({ id: o.id, created_at: o.created_at })));
}

main();
