import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const mysteryId = '69b65a91-1cc2-4267-94a4-59297428af28';

async function main() {
  console.log('Fetching characters for Love On The Rocks...');
  const { data: characters, error } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (error) {
    console.error('Error fetching characters:', error);
    return;
  }

  console.log(`Found ${characters.length} characters.`);

  for (const char of characters) {
    console.log(`Expanding bio for ${char.name}...`);
    const currentBio = char.profile_data?.bio || char.archetype || 'No background provided.';
    
    const prompt = `You are a master mystery writer. Expand the following character biography into a detailed, compelling 2-3 paragraph backstory. 
Make it dramatic, juicy, and fit for a murder mystery party titled "Love On The Rocks". 
The character's name is ${char.name.split('|')[0]}.
Here is their current short bio/background:
"${currentBio}"

Focus on adding rich flavor, deep secrets, and dramatic flair. Do not change any fundamental facts given, just expand and embellish them beautifully. Return ONLY the expanded bio text.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      const newProfileData = { ...(char.profile_data || {}), bio: text };
      
      await supabase
        .from('characters')
        .update({ profile_data: newProfileData })
        .eq('id', char.id);
        
      console.log(`✅ Updated bio for ${char.name}`);
    } catch (e) {
      console.error(`❌ Failed to update ${char.name}:`, e);
    }
  }
  
  console.log('Done!');
}

main();
