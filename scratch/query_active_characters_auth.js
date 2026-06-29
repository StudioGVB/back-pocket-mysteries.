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

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function run() {
  const email = 'hello@studiogvb.com';
  const password = 'Password123!';

  console.log(`Signing in as ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('Sign in failed:', authError.message);
    return;
  }

  const mysteryId = '69b65a91-1cc2-4267-94a4-59297428af28';

  console.log('Querying characters...');
  const { data: chars, error: cErr } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (cErr) {
    console.error('Characters Error:', cErr.message);
  } else {
    console.log('Characters count:', chars.length);
    console.log('Characters details:', chars.map(c => ({
      id: c.id,
      name: c.name,
      plot_role: c.plot_role,
      gender: c.gender,
      is_victim: c.is_victim,
      profile_data: c.profile_data
    })));
  }

  console.log('Querying guests...');
  const { data: guests, error: gErr } = await supabase
    .from('guests')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (gErr) {
    console.error('Guests Error:', gErr.message);
  } else {
    console.log('Guests count:', guests.length);
    console.log('Guests details:', guests.map(g => ({
      id: g.id,
      name: g.name,
      hair_color: g.hair_color,
      skin_tone: g.skin_tone,
      gender: g.gender,
      avatar_url: g.avatar_url,
      profile: g.profile
    })));
  }
}

run();
