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
  const { data, error } = await supabase
    .from('mysteries')
    .insert({
      title: 'Circus Mystery Test RLS Bypass',
      theme: 'Circus',
      status: 'draft',
      min_players: 4,
      max_players: 6,
      complexity: 'medium',
      spice_level: 'medium',
      description: 'A circus mystery test',
      created_by: '4903bd39-e54f-42e4-b679-2af5d128bb8f'
    })
    .select();

  if (error) {
    console.error('Error inserting mystery:', error.message);
  } else {
    console.log('Inserted Mystery:', data);
    // Cleanup
    await supabase.from('mysteries').delete().eq('id', data[0].id);
  }
}

run();
