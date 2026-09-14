import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fix() {
  const { data: chars } = await supabase.from('characters').select('*').eq('mystery_id', '69b65a91-1cc2-4267-94a4-59297428af28');
  for (const char of chars) {
    if (!char.profile_data || !char.profile_data.bio || char.profile_data.bio.trim() === '') {
      console.log(`Missing bio for: ${char.name}`);
      // Patch it locally based on some info
      char.profile_data.bio = `An enigmatic guest at the reunion. Not much is known about their recent activities, but they certainly brought drama to the island.`;
      await supabase.from('characters').update({ profile_data: char.profile_data }).eq('id', char.id);
    }
  }
}
fix();
