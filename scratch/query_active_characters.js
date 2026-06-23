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
  const mysteryId = '69b65a91-1cc2-4267-94a4-59297428af28';

  console.log('Querying characters...');
  const { data: chars, error: cErr } = await supabase
    .from('characters')
    .select('*');

  if (cErr) {
    console.error('Characters Error:', cErr.message);
  } else {
    console.log('Characters:', chars.map(c => ({ id: c.id, name: c.name, plot_role: c.plot_role, guest_id: c.guest_id, mystery_id: c.mystery_id })));
  }

  console.log('Querying guests...');
  const { data: guests, error: gErr } = await supabase
    .from('guests')
    .select('*');

  if (gErr) {
    console.error('Guests Error:', gErr.message);
  } else {
    console.log('Guests:', guests.map(g => ({ id: g.id, name: g.name, hair_color: g.hair_color, skin_tone: g.skin_tone, gender: g.gender })));
  }
}

run();
