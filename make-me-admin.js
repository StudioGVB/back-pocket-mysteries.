const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We need the service role key to bypass RLS. Let's see if it's in env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching profiles...');
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('No profiles found.');
    return;
  }
  
  console.log(`Found ${profiles.length} profiles.`);
  
  // Find gabriella's profile or the first one
  const myProfile = profiles.find(p => p.full_name && p.full_name.toLowerCase().includes('gabby')) || profiles[0];
  
  console.log('Target profile:', myProfile.id, myProfile.full_name);
  
  // Upsert superadmin role
  console.log('Elevating to superadmin...');
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: myProfile.id, role: 'superadmin' }, { onConflict: 'user_id' })
    .select();
    
  if (roleError) {
    console.error('Error elevating role:', roleError);
  } else {
    console.log('Success!', roleData);
  }
}

run();
