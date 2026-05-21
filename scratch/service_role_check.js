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

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) {
    console.error('Error fetching profiles:', pError);
  } else {
    console.log('Profiles list:');
    profiles.forEach(p => {
      console.log(`ID: ${p.id}, Full Name: ${p.full_name}, Email: ${p.email}`);
    });
  }

  const { data: guests, error: gError } = await supabase.from('guests').select('*');
  if (gError) {
    console.error('Error fetching guests:', gError);
  } else {
    console.log(`\nTotal guests in DB: ${guests.length}`);
    guests.forEach(g => {
      console.log(`Guest ID: ${g.id}, Name: ${g.name}, User ID: ${g.user_id}, Gender: ${g.gender}`);
    });
  }
}

run();
