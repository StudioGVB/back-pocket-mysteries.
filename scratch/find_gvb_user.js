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
  // Let's search by full_name or other fields for hello@studiogvb.com
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }
  
  console.log('Profiles list:');
  profiles.forEach(p => {
    console.log(`ID: ${p.id}, Full Name: ${p.full_name}, User ID: ${p.user_id}`);
  });

  // Let's also check guests count or entries to see where they are
  const { data: guests, error: gError } = await supabase.from('guests').select('*');
  console.log(`\nTotal guests in DB: ${guests?.length || 0}`);
}

run();
