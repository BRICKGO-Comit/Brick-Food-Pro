const https = require('https');

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

// Check if we can execute a patch with authorization
const logoUrl = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500';
const coverUrl = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200';

async function main() {
  console.log('--- UPDATING PARISIEN IN SUPABASE ---');

  const data = JSON.stringify({
    logo_url: logoUrl,
    cover_url: coverUrl,
    category: 'restaurant'
  });

  const req = https.request('https://kgcmbbesrzldoiwkckke.supabase.co/rest/v1/restaurants?id=eq.65da24be-4230-40d4-a4ec-a78cc7f647fd', {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => console.log('PATCH RESTAURANT RESPONSE:', res.statusCode, body));
  });

  req.write(data);
  req.end();
}

main();
