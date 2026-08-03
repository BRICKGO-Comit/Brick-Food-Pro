const https = require('https');

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

const nowIso = new Date().toISOString();

function updateTable(table, id, data) {
  return new Promise((resolve) => {
    const req = https.request(`https://kgcmbbesrzldoiwkckke.supabase.co/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 204);
    });
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('--- UPDATING DATES TO AUGUST 2026 ---');
  await updateTable('restaurants', '65da24be-4230-40d4-a4ec-a78cc7f647fd', { created_at: nowIso });
  await updateTable('restaurants', '0b91d222-be12-42ec-a05e-fca8fe1b1e6c', { created_at: nowIso });

  await updateTable('offers', '892f657d-25c7-489e-a9fb-2d71511843fe', { created_at: nowIso });
  await updateTable('offers', '0392d212-0f1e-4b33-9d2b-6c95807d89e5', { created_at: nowIso });
  await updateTable('offers', '9cb23e14-a2cb-42c5-b1bc-1e8c79f45974', { created_at: nowIso });

  await updateTable('orders', '2d18264e-1d93-4d59-b750-41c90e2ab8f9', { created_at: nowIso, total_amount: 15000, commission_amount: 1500 });
  await updateTable('orders', '9572c883-6a5f-4fea-824b-4f4df3f2041a', { created_at: nowIso, total_amount: 25000, commission_amount: 2500 });
  await updateTable('orders', 'b73c406d-1546-49c2-b858-a53755a42265', { created_at: nowIso, total_amount: 18000, commission_amount: 1800 });

  console.log('✅ DATES UPDATED SUCCESSFULLY!');
}

main();
