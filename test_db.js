const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data } = await supabase.from('guests').select('id, user_id').ilike('name', 'Elia').limit(1);
  if (data && data.length > 0) {
    console.log(data[0]);
  }
}
test();
