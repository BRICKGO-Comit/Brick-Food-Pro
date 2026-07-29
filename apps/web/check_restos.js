const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../api/.env');
let serviceKey = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)/);
  if (match) serviceKey = match[1].trim().replace(/"/g, '');
}

const supabaseUrl = 'https://kgcmbbesrzldoiwkckke.supabase.co';
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log('--- RESTAURANTS ---');
  const { data: restos, error } = await supabase.from('restaurants').select('*');
  if (error) {
    console.error(error);
  } else {
    restos.forEach(r => {
      console.log(`ID: ${r.id}, Name: ${r.name}, Agent ID: ${r.agent_id}`);
    });
  }
}

run();
