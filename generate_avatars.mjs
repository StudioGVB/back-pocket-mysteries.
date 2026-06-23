import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const email = 'hello@studiogvb.com';
  
  // 1. Get the user
  const { data: userProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', email)
    .single();
    
  if (profileErr || !userProfile) {
    console.error('User not found:', profileErr);
    process.exit(1);
  }
  
  console.log(`Found user: ${userProfile.full_name} (${userProfile.id})`);
  
  // 2. Get guests
  const { data: guests, error: guestsErr } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', userProfile.id)
    .is('avatar_url', null); // only ones without avatar
    
  if (guestsErr) {
    console.error('Error fetching guests:', guestsErr);
    process.exit(1);
  }
  
  console.log(`Found ${guests.length} guests without avatars.`);
  
  for (const guest of guests) {
    console.log(`Generating avatar for ${guest.name}...`);
    try {
      const prompt = `A cinematic, moody noir portrait headshot of an individual with the following features: Gender: ${guest.gender || 'unspecified'}, Eye color: ${guest.eye_color || 'unspecified'}, Height: ${guest.height || 'unspecified'}. Personality traits: ${(guest.traits || []).join(', ')}. Bio: ${guest.bio || 'A mysterious guest'}. The subject is facing the camera. High quality, photorealistic, cinematic lighting, 8k resolution, professional portrait photography.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "1:1" }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Imagen API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const base64Str = data.predictions?.[0]?.bytesBase64Encoded;
      
      if (!base64Str) {
        throw new Error('No image bytes returned from API');
      }
      
      const fileName = `${guest.id}_avatar_${Date.now()}.png`;
      const imageBuffer = Buffer.from(base64Str, 'base64');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mystery-assets')
        .upload(`guests/${fileName}`, imageBuffer, {
          contentType: 'image/png',
          upsert: true
        });
        
      if (uploadError) {
        throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('mystery-assets')
        .getPublicUrl(`guests/${fileName}`);
        
      // Update the guest record
      const { error: updateError } = await supabase
        .from('guests')
        .update({ avatar_url: publicUrl })
        .eq('id', guest.id);

      if (updateError) {
          throw new Error(`Failed to update guest: ${updateError.message}`);
      }
      
      console.log(`✅ Success: ${guest.name} -> ${publicUrl}`);
      
      // sleep a bit to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      console.error(`❌ Error generating for ${guest.name}:`, e);
    }
  }
  
  console.log('Finished!');
}

main();
