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
    .eq('mystery_id', mysteryId)
    .order('round_number', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching clues:', error.message);
  } else {
    console.log(`Successfully fetched ${clues.length} clues.`);
    fs.writeFileSync('scratch/lotr_clues_dump.json', JSON.stringify(clues, null, 2));
    clues.forEach((c, idx) => {
      console.log(`[${idx+1}] ID: ${c.id}\nTitle: "${c.title}"\nDescription: "${c.description}"\nPrompt: "${c.generation_prompt}"\n---`);
    });
  }
}

run();
