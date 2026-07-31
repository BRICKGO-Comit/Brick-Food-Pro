const https = require('https');

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

function updateResto(id, logoUrl, coverUrl) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      logo_url: logoUrl,
      cover_url: coverUrl
    });

    const req = https.request(`https://kgcmbbesrzldoiwkckke.supabase.co/rest/v1/restaurants?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('--- UPDATING PARISIEN & RESTAURANTS LOGO / COVER IN SUPABASE ---');

  // Parisien
  const parisienRes = await updateResto(
    '65da24be-4230-40d4-a4ec-a78cc7f647fd',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500', // Gourmet chicken & restaurant logo
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200'  // Grilled BBQ chicken cover
  );
  console.log('Parisien update result:', parisienRes);

  // Le Bateau Ivoire
  await updateResto(
    '2f73b154-817d-4f28-8f77-9fea2a70c9bc',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200'
  );

  // Toni Fast Food
  await updateResto(
    'cd745f52-5326-4b1c-bcca-4a8eaaafb9e8',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200'
  );

  // Le QG Lounge
  await updateResto(
    '4add9e13-78c1-4d0a-8934-5901007dae64',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=500',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200'
  );

  // Chez Georges
  await updateResto(
    'cbfea81b-4eed-4d2a-97d7-605be79feaff',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200'
  );

  // Tonight
  await updateResto(
    '8316e931-62b0-40dc-a1f2-e2b4dcb01d30',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=500',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200'
  );

  console.log('--- ALL RESTAURANTS UPDATED SUCCESSFULLY ---');
}

main();
