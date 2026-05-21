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
  env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] // Let's use the anon key since service role key is not in .env.local
);

async function run() {
  const { data, error } = await supabase
    .from('mysteries')
    .select('id, title, created_by')
    .limit(5);

  if (error) {
    console.error('Error fetching mysteries:', error);
  } else {
    console.log('Mysteries:', data);
  }
}

run();
