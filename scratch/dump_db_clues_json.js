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
  const { data: clues, error } = await supabase
    .from('clues')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (error) {
    console.error('Error fetching clues:', error.message);
    return;
  }

  fs.writeFileSync('scratch/db_clues_dump.json', JSON.stringify(clues, null, 2));
  console.log(`Dumped ${clues.length} clues to scratch/db_clues_dump.json`);
}

run();
