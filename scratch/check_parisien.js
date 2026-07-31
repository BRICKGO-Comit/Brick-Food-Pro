const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kgcmbbesrzldoiwkckke.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- FETCHING ALL RESTAURANTS FROM SUPABASE ---');
  const { data, error } = await supabase.from('restaurants').select('*');
  if (error) {
    console.error('Error fetching restaurants:', error);
    return;
  }
  console.log('Total restaurants found:', data.length);
  data.forEach((r, idx) => {
    console.log(`\n[${idx + 1}] ID: ${r.id}`);
    console.log(`  Name: "${r.name}"`);
    console.log(`  Address: "${r.address}"`);
    console.log(`  Phone: "${r.phone}"`);
    console.log(`  Category: "${r.category}"`);
    console.log(`  Logo URL: "${r.logo_url}"`);
    console.log(`  Cover URL: "${r.cover_url}"`);
  });
}

main();
