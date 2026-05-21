const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1]] = val;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function run() {
  const { data: { session }, error: sErr } = await supabase.auth.getSession();
  console.log('Session user ID:', session?.user?.id);
  console.log('Session user email:', session?.user?.email);

  const { count, error: countErr } = await supabase
    .from('guests')
    .select('*', { count: 'exact', head: true });
  
  console.log('Guests count:', count, 'Error:', countErr);

  const { data: guests, error: guestsErr } = await supabase
    .from('guests')
    .select('*')
    .limit(5);
  console.log('Guests fetched:', guests?.length || 0, 'Error:', guestsErr);
}

run();
