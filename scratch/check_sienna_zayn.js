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
    .select('*')
    .eq('mystery_id', '69b65a91-1cc2-4267-94a4-59297428af28')
    .ilike('title', '%Zayn%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  clues.forEach(c => {
    console.log('ID:', c.id);
    console.log('Title:', c.title);
    console.log('Description:', c.description);
    console.log('Prompt:', c.generation_prompt);
    console.log('Static Image URL:', c.static_image_url);
    console.log('-------------------------------------------');
  });
}

run();
