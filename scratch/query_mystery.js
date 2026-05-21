const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const mysteryId = '69b65a91-1cc2-4267-94a4-59297428af28';
  
  const { data: mystery, error: mystError } = await supabase
    .from('mysteries')
    .select('*')
    .eq('id', mysteryId)
    .single();
    
  if (mystError) {
    console.error('Error fetching mystery:', mystError);
    return;
  }
  
  console.log('Mystery Base:', {
    id: mystery.id,
    title: mystery.title,
    theme: mystery.theme,
    description: mystery.description,
  });
  
  const { data: characters, error: charError } = await supabase
    .from('characters')
    .select('id, name, is_victim, plot_role')
    .eq('mystery_id', mysteryId);
    
  if (charError) {
    console.error('Error fetching characters:', charError);
    return;
  }
  
  console.log('Characters in DB:', characters);
}

run();
