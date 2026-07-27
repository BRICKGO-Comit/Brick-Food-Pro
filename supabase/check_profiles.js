global.WebSocket = class DummyWebSocket {};
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env file
const envPath = path.join(__dirname, '../apps/api/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://kgcmbbesrzldoiwkckke.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not defined');
  process.exit(1);
}

class DummyWebSocket {}
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    WebSocket: DummyWebSocket
  }
});

async function check() {
  const { data: usersData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Auth users fetch error:', authError);
  } else {
    const users = usersData?.users || [];
    console.log('--- AUTH USERS ---');
    users.forEach(u => console.log(`Email: ${u.email}, ID: ${u.id}, Confirmed At: ${u.email_confirmed_at || u.confirmed_at || 'NOT CONFIRMED'}, Last Sign In: ${u.last_sign_in_at || 'NEVER'}, Metadata Role: ${u.user_metadata?.role}`));
  }

  const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
  if (profError) {
    console.error('Profiles fetch error:', profError);
  } else {
    console.log('--- PROFILES TABLE ---');
    profiles.forEach(p => console.log(`ID: ${p.id}, Email: ${p.email}, Role: ${p.role}, Name: ${p.full_name}`));
  }
}

check();
