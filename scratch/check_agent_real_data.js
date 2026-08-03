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
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve([]);
        }
      });
    });
  });
}

async function main() {
  const restaurants = await fetchTable('restaurants');
  const offers = await fetchTable('offers');
  const orders = await fetchTable('orders');

  console.log('RESTAURANTS COUNT:', restaurants.length);
  console.log('OFFERS COUNT:', offers.length);
  console.log('ORDERS COUNT:', orders.length);

  console.log('\nSAMPLE OFFERS:', offers.slice(0, 3).map(o => ({ id: o.id, title: o.title, type: o.type, status: o.status, agent_id: o.agent_id })));
  console.log('\nSAMPLE ORDERS:', orders.slice(0, 3).map(o => ({ id: o.id, total_amount: o.total_amount, status: o.status, agent_id: o.agent_id })));
}

main();
