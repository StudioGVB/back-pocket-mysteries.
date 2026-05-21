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
  const email = 'hello@studiogvb.com';
  const password = 'Password123!';

  console.log(`Attempting sign in as ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in failed:', error.message);
  } else {
    console.log('Successfully signed in! User:', data.user.id);
    
    // Now let's fetch mysteries for this user
    const { data: mysteries, error: mErr } = await supabase
      .from('mysteries')
      .select('id, title, created_by');
      
    if (mErr) {
      console.error('Error fetching mysteries:', mErr.message);
    } else {
      console.log('Mysteries owned/visible to hello@studiogvb.com:', mysteries);
    }
  }
}

run();
