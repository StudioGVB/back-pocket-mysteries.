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
    .select('id, title, description, generation_prompt, mystery_id')
    .order('title');

  if (error) {
    console.error('Error fetching clues:', error.message);
  } else {
    console.log(`Total clues fetched: ${clues.length}`);
    const lotrClues = clues.filter(c => 
      c.title.includes('Text') || 
      c.title.includes('Chat') || 
      c.title.includes('DM') || 
      c.title.includes('Note') || 
      c.title.includes('Napkin') || 
      c.title.includes('History') || 
      c.title.includes('Warning') || 
      c.title.includes('Argument') || 
      c.title.includes('Audio') || 
      c.title.includes('Photo') || 
      c.title.includes('File')
    );
    console.log('Sample Clues:', lotrClues.map(c => ({ id: c.id, title: c.title, mystery_id: c.mystery_id })).slice(0, 20));
  }
}

run();
