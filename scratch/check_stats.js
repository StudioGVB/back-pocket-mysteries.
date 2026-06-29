const fs = require('fs');
const env = fs.readFileSync('.env.development.local', 'utf8') + '\n' + fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n]+)/)?.[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\n]+)/)?.[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\n]+)/)?.[1];

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users } = await supabase.from('user_profiles').select('*');
  const { data: orders } = await supabase.from('orders').select('*');
  console.log('Total Users:', users?.length);
  console.log('Total Orders:', orders?.length);
}

check();
