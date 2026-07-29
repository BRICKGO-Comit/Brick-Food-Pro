const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kgcmbbesrzldoiwkckke.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function run() {
  const email = `testagent_${Date.now()}@brickfood.com`;
  console.log('Registering user:', email);
  const { data, error } = await client.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: {
        full_name: 'Test Agent',
        role: 'agent',
        phone: '123456789'
      }
    }
  });

  if (error) {
    console.error('Signup error:', error);
    return;
  }
  console.log('User created in Auth with ID:', data.user.id);

  // Now query profile using service key
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../api/.env');
  let serviceKey = '';
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)/);
    if (match) serviceKey = match[1].trim().replace(/"/g, '');
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  const { data: profile, error: pError } = await adminClient.from('profiles').select('*').eq('id', data.user.id).single();
  if (pError) {
    console.error('Profile fetch error:', pError.message);
  } else {
    console.log('Profile successfully created:', profile);
  }
}

run();
