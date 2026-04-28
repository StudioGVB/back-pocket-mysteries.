import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Testing inquiries insert...');
  const res1 = await supabase.from('inquiries').insert({ name: 'Test', email: 'test@example.com', message: 'Test message', status: 'pending' });
  console.log('inquiries error:', res1.error ? res1.error : 'Success');

  console.log('Testing reviews insert...');
  const res2 = await supabase.from('reviews').insert({ name: 'Test', rating: 5, review_text: 'Test review', status: 'pending' });
  console.log('reviews error:', res2.error ? res2.error : 'Success');

  console.log('Testing leads insert...');
  const res3 = await supabase.from('leads').insert({ email: 'test@example.com', full_name: 'Test' });
  console.log('leads error:', res3.error ? res3.error : 'Success');
}

run();
