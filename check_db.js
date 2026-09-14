import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const env = dotenv.parse(fs.readFileSync('.env.local'));
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await client.from('characters').select('name, archetype, plot_role').eq('mystery_id', '69b65a91-1cc2-4267-94a4-59297428af28');
  console.log(JSON.stringify(data, null, 2));
}

run();
