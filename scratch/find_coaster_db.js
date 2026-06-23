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
  const { data: clues, error } = await supabase
    .from('clues')
    .select('id, title, generation_prompt, mystery_id');

  if (error) {
    console.error('Error fetching clues:', error.message);
    return;
  }

  console.log(`Searching through ${clues.length} clues...`);
  clues.forEach(clue => {
    if (clue.generation_prompt && (
      clue.generation_prompt.toLowerCase().includes('coaster') ||
      clue.generation_prompt.toLowerCase().includes('lipstick') ||
      clue.generation_prompt.toLowerCase().includes('cardboard')
    )) {
      console.log(`Match found!`);
      console.log(`ID: ${clue.id}`);
      console.log(`Title: ${clue.title}`);
      console.log(`Mystery ID: ${clue.mystery_id}`);
      console.log(`Prompt: ${clue.generation_prompt}`);
      console.log('---');
    }
  });
}

run();
