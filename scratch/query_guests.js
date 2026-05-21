const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Query manual guests
  const { data: guests, error: guestsErr } = await supabase
    .from('guests')
    .select('*')
    .limit(10);
    
  if (guestsErr) {
    console.error('Error fetching guests:', guestsErr);
  } else {
    console.log('Sample Guests:', guests);
  }
  
  // Query a character's profile data
  const { data: characters, error: charErr } = await supabase
    .from('characters')
    .select('id, name, gender, profile_data')
    .limit(3);
    
  if (charErr) {
    console.error('Error fetching characters:', charErr);
  } else {
    console.log('Sample Characters Profile Data:', characters);
  }
}

run();
