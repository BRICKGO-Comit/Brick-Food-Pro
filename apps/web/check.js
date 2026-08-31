global.WebSocket = class DummyWebSocket {};
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read service role key from apps/api/.env
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

async function check() {
  console.log('--- USERS IN AUTH ---');
  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
  } else {
    usersData.users.forEach(u => {
      console.log(`Email: ${u.email}, ID: ${u.id}, Metadata:`, u.user_metadata);
    });
  }

  console.log('--- PROFILES IN DB ---');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) {
    console.error(pError);
  } else {
    profiles.forEach(p => {
      console.log(`Email: ${p.email}, ID: ${p.id}, Role: ${p.role}, Name: ${p.full_name}`);
    });
  }
}

check();
