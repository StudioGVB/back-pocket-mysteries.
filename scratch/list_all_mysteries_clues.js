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
  const { data: mysteries, error: mError } = await supabase
    .from('mysteries')
    .select('id, title');

  if (mError) {
    console.error('Error fetching mysteries:', mError.message);
    return;
  }

  console.log('Mysteries in DB:', mysteries);

  const { data: clues, error: cError } = await supabase
    .from('clues')
    .select('id, title, generation_prompt, mystery_id');

  if (cError) {
    console.error('Error fetching clues:', cError.message);
    return;
  }

  console.log(`Total clues in DB: ${clues.length}`);
  clues.forEach(clue => {
    console.log(`- Clue ID: ${clue.id}, Mystery ID: ${clue.mystery_id}, Title: "${clue.title}"`);
    console.log(`  Prompt: "${clue.generation_prompt}"`);
  });
}

run();
