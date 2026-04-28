import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
);

async function testInsert() {
  const mysteryId = '4b18b04c-3131-4a6b-9e36-a45cdc846769';
  
  const beats = [{
    mystery_id: mysteryId,
    beat_number: 1,
    sort_order: 1,
    event_title: 'Test Beat',
    description: 'Test description',
    beat_type: 'confrontation',
    timeline_phase: 'pre_crime',
    intensity_level: 5,
    characters_involved: [],
    is_required: true,
  }];

  const { data, error } = await supabase.from('plot_beats').insert(beats);
  console.log("Service Role Insert Error:", error);
}

testInsert();
