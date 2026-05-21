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
  const email = 'test_circus_host@example.com';
  const password = 'Password123!';

  console.log('Attempting sign up...');
  let { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.log('Sign up error:', signUpError.message);
    console.log('Attempting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      console.error('Sign in error:', signInError.message);
      return;
    }
    signUpData = signInData;
  }

  const user = signUpData.user;
  console.log('Successfully authenticated! User ID:', user.id);

  console.log('Attempting mystery insert under User ID:', user.id);
  const { data: insertData, error: insertError } = await supabase
    .from('mysteries')
    .insert({
      title: 'Circus Mystery Test',
      theme: 'Circus',
      status: 'draft',
      min_players: 4,
      max_players: 6,
      complexity: 'medium',
      spice_level: 'medium',
      description: 'A circus mystery test',
      created_by: user.id
    })
    .select();

  if (insertError) {
    console.error('Insert error:', insertError.message);
  } else {
    console.log('Success! Inserted mystery:', insertData);
    
    // Clean up
    console.log('Cleaning up inserted test mystery...');
    await supabase.from('mysteries').delete().eq('id', insertData[0].id);
  }
}

run();
