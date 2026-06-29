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
  console.log('Testing select single from non-existent table...');
  try {
    const res = await supabase
      .from('image_generation_cache')
      .select('image_url')
      .eq('prompt_hash', 'test_hash')
      .single();
    console.log('Result:', res);
  } catch (e) {
    console.error('Exception thrown:', e);
  }
}

run();
