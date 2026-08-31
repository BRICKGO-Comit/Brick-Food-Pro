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
  const { data: sampleOrder, error } = await supabase.from('orders').select('*').limit(1);
  if (error) console.error('Orders error:', error);
  else console.log('Orders sample keys:', Object.keys(sampleOrder[0] || {}));
}

check();
