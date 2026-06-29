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
  const { data: cache, error: cacheErr } = await supabase
    .from('image_generation_cache')
    .select('*')
    .limit(5);
    
  if (cacheErr) {
    console.error('Error fetching cache:', cacheErr);
  } else {
    console.log('Cache records count:', cache.length);
    cache.forEach(c => {
      console.log('Prompt hash:', c.prompt_hash);
      console.log('Image URL length:', c.image_url.length);
      console.log('Created at:', c.created_at);
    });
  }
  
  const { data: mysteries, error: mystErr } = await supabase
    .from('mysteries')
    .select('id, title, theme, image_url')
    .limit(5);
    
  if (mystErr) {
    console.error('Error fetching mysteries:', mystErr);
  } else {
    console.log('Mysteries:', mysteries);
  }
}

run();
