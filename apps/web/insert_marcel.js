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
  const { error } = await supabase.from('profiles').insert({
    id: '05fdf6ab-13e9-49f2-9cf9-8f4b501c3b76',
    email: 'marcel@gmail.com',
    full_name: 'Marcel',
    role: 'agent',
    phone: '0141628232'
  });
  if (error) {
    console.error('Error inserting Marcel:', error.message);
  } else {
    console.log('Marcel profile successfully inserted!');
  }
}

run();
