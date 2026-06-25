'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import crypto from 'crypto';

export async function generateGuestAvatarAction(guestId: string, guestData: any) {
  try {
    const prompt = `A cinematic, moody noir portrait headshot photograph of an individual between 25 and 30 years old with the following features: Gender: ${guestData.gender || 'unspecified'}, Eye color: ${guestData.eye_color || 'unspecified'}, Height: ${guestData.height || 'unspecified'}. Personality traits: ${(guestData.traits || []).join(', ')}. Bio: ${guestData.bio || 'A mysterious guest'}. The subject is facing the camera. High quality, cinematic lighting, 8k resolution, professional portrait photography. CRITICAL: This is a real, live-action photograph taken with a DSLR camera. The image MUST be highly photorealistic and the person MUST look between 25 and 30 years old. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art, NO vector graphics.`;
    
    // Hash the prompt to use as cache key
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
    
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {}
        }
      }
    );

    // 1. Check cache first
    const { data: cached } = await supabase
      .from('image_generation_cache')
      .select('image_url')
      .eq('prompt_hash', promptHash)
      .single();

    let dataUri = '';

    if (cached?.image_url) {
      dataUri = cached.image_url;
    } else {
      // 2. Generate if not cached
      let response;
      let retries = 0;
      let isRateLimited = false;
      
      while (retries < 3) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { 
              sampleCount: 1, 
              aspectRatio: "1:1",
              personGeneration: "allow_adult"
            }
          })
        });
        
        if (response.status === 429 || response.status === 403) {
          isRateLimited = true;
          retries++;
          await new Promise(r => setTimeout(r, 2000 * retries)); // Exponential backoff
          continue;
        }
        break;
      }
      
      let base64Str = '';

      if (response && response.ok) {
        const data = await response.json();
        base64Str = data.predictions?.[0]?.bytesBase64Encoded;
      }

      if (base64Str) {
        dataUri = `data:image/jpeg;base64,${base64Str}`;
        
        // Save to cache
        await supabase.from('image_generation_cache').insert({
          prompt_hash: promptHash,
          image_url: dataUri
        });
        console.log('Saved to image cache');
      } else {
        // Fallback placeholder image if quota exceeded or error
        console.warn('Image generation failed or quota exceeded, using fallback placeholder');
        // Simple 1x1 gray pixel data URI as fallback or a UI-generated avatar could be used
        dataUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(guestData.bio?.substring(0, 2) || 'G')}&background=random&size=512`;
      }
    }
      
    // Update the guest record
    const { data: updateData, error: updateError } = await supabase
      .from('guests')
      .update({ avatar_url: dataUri })
      .eq('id', guestId)
      .select();

    if (updateError || !updateData || updateData.length === 0) {
      throw new Error(updateError?.message || 'Failed to update guest (RLS blocked update or guest not found)');
    }

    return { publicUrl: dataUri };
    
  } catch (err: any) {
    console.error('Error generating guest avatar', err);
    throw new Error(err.message || 'Failed to generate guest avatar');
  }
}
