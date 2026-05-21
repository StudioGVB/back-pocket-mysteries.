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
  console.log('Fetching active clues for mystery ID:', mysteryId);
  const { data: clues, error: fetchErr } = await supabase
    .from('clues')
    .select('id, title, description, generation_prompt')
    .eq('mystery_id', mysteryId);

  if (fetchErr) {
    console.error('Error fetching clues:', fetchErr.message);
    return;
  }

  console.log(`Found ${clues.length} clues.`);
  clues.forEach(c => {
    console.log(`- Title: "${c.title}"`);
    console.log(`  Prompt: "${c.generation_prompt ? c.generation_prompt.substring(0, 100) + '...' : 'none'}"`);
  });
}

run();
