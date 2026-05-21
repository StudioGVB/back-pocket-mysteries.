const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tlmgiveaotdhhvhebwvc.supabase.co',
  'sb_publishable_MoN-CPhkCwE3L8rMBGagOw_3qhDnP6O'
);

async function run() {
  const { data: sp, error: spErr } = await supabase.from('subplots').select('*').limit(1);
  console.log('subplots:', spErr ? 'ERROR: ' + JSON.stringify(spErr) : 'OK');

  const { data: sb, error: sbErr } = await supabase.from('subplot_beats').select('*').limit(1);
  console.log('subplot_beats:', sbErr ? 'ERROR: ' + JSON.stringify(sbErr) : 'OK');
}

run();
