const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.development.local', 'utf8') + '\n' + fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    env[match[1]] = val;
  }
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
supabase.from('orders').select(`id, amount, status, created_at, mystery:mysteries!mystery_id(title)`).limit(1)
  .then(res => {
    if (res.error) console.error("ERROR:", JSON.stringify(res.error, null, 2));
    else console.log("SUCCESS:", res.data);
  });
