const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const envUrlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const envKeyMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = envUrlMatch ? envUrlMatch[1].trim() : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envKeyMatch ? envKeyMatch[1].trim() : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('subplots')
    .select('*, subplot_beats (*)')
    .limit(1);
    
  console.log('Error:', error);
}

run();
