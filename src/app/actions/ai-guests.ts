'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import crypto from 'crypto';

export async function generateGuestAvatarAction(guestId: string, guestData: any) {
  try {
    let hairColor = 'unspecified';
    let skinColor = 'unspecified';
    let facialHair = 'none';
    let build = 'unspecified';
    let distinctiveFeatures = 'none';
    let accessories = 'none';
    let hairStyle = 'unspecified';
    
    let eyeColor = guestData.eye_color || 'unspecified';
    if (eyeColor.toLowerCase().includes('hazel')) {
      eyeColor = 'true hazel (a natural, warm, muted blend of light brown and olive green, predominantly brown in the center)';
    }

    if (guestData.avatar_url) {
      try {
        const url = new URL(guestData.avatar_url);
        
        const hl = url.searchParams.get('hairLength');
        const ht = url.searchParams.get('hairTexture');
        
        if (hl) {
          if (hl === 'Bald') hairStyle = 'bald / no hair';
          else if (['Hijab', 'Turban', 'Beanie'].includes(hl)) hairStyle = `wearing a ${hl.toLowerCase()}`;
          else hairStyle = `${hl} length, ${ht || 'straight'} texture`;
        } else {
          const top = url.searchParams.get('top');
          if (top) {
            if (top === 'none' || top === 'noHair') hairStyle = 'bald / no hair';
            else hairStyle = top.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/[0-9]/g, '').trim() + ' hair';
          }
        }

        const hc = url.searchParams.get('hairColor');
        if (hc) {
          const cleanHex = hc.replace('#', '').toLowerCase();
          const mapping: Record<string, string> = {
            '282828': 'Black',
            '4a3123': 'Dark Brown',
            'a0785a': 'Light Brown',
            'a55728': 'Auburn',
            'c2a67e': 'Ash Blonde',
            'e8b07d': 'Strawberry Blonde',
            'd6b370': 'Golden Blonde',
            'f4f0e6': 'White Blonde',
            'd95319': 'Orange Red',
            'ca4444': 'Cherry Red',
            'e8e1e1': 'Silver / White',
            'f59797': 'Pastel Pink',
            'e84393': 'Hot Pink',
            '4b0082': 'Indigo',
            '00a8ff': 'Bright Blue',
            '00b894': 'Mint Green'
          };
          hairColor = mapping[cleanHex] || `matching hex #${cleanHex}`;
        }
        
        const sc = url.searchParams.get('skinColor');
        if (sc) {
          const cleanHex = sc.replace('#', '').toLowerCase();
          const mapping: Record<string, string> = {
            'ffe0bd': 'Porcelain',
            'ffcd94': 'Fair',
            'eac086': 'Light',
            'd08b5b': 'Olive',
            'ae5d29': 'Light Brown',
            '8d5524': 'Medium Brown',
            '614335': 'Dark Brown',
            '3b2219': 'Deep'
          };
          skinColor = mapping[cleanHex] || `matching hex #${cleanHex}`;
        }
        const fh = url.searchParams.get('facialHair');
        if (fh) facialHair = fh.replace(/([A-Z])/g, ' $1').toLowerCase();
        
        const b = url.searchParams.get('build');
        if (b) build = b;
        
        const df = url.searchParams.get('distinctiveFeatures');
        if (df) distinctiveFeatures = df;
        
        const acc = url.searchParams.get('accessories');
        if (acc && acc !== 'none') {
          if (acc === 'prescription01') accessories = 'glasses';
          else accessories = acc.replace(/([A-Z])/g, ' $1').toLowerCase();
        }
      } catch (e) {
        // Ignore invalid URL
      }
    }
    
    // Generate a unique facial structure based on the guest ID to prevent "same-face syndrome"
    const hashHex = crypto.createHash('md5').update(guestData.id || guestData.name || 'default').digest('hex');
    const faceShapes = ['oval', 'round', 'square', 'heart-shaped', 'diamond-shaped', 'oblong', 'angular', 'softly contoured'];
    const jawlines = ['soft', 'sharp', 'squared', 'rounded', 'defined', 'delicate', 'strong', 'smooth'];
    const noseShapes = ['straight', 'button', 'slightly wide', 'narrow', 'distinctive', 'subtle aquiline', 'soft rounded', 'elegant'];
    
    const faceShape = faceShapes[parseInt(hashHex.substring(0, 2), 16) % faceShapes.length];
    const jawline = jawlines[parseInt(hashHex.substring(2, 4), 16) % jawlines.length];
    const noseShape = noseShapes[parseInt(hashHex.substring(4, 6), 16) % noseShapes.length];
    const uniqueFacialStructure = `${faceShape} face, ${jawline} jawline, and a ${noseShape} nose`;

    let genderLabel = guestData.gender || 'unspecified';
    let subjectNoun = 'individual';
    if (genderLabel.toLowerCase() === 'masculine' || genderLabel.toLowerCase() === 'male') {
      genderLabel = 'Male (Man, explicitly masculine facial structure)';
      subjectNoun = 'man';
    } else if (genderLabel.toLowerCase() === 'feminine' || genderLabel.toLowerCase() === 'female') {
      genderLabel = 'Female (Woman)';
      subjectNoun = 'woman';
    } else if (genderLabel.toLowerCase() === 'neutral' || genderLabel.toLowerCase() === 'adaptable') {
      genderLabel = 'Androgynous / Non-binary (Neutral features)';
      subjectNoun = 'person';
    }

    const prompt = `A clear, well-lit, shoulders-up portrait photograph of a ${subjectNoun} who is exactly 24 years old with the following features: Gender: ${genderLabel}, Ethnicity: ${guestData.ethnicity || 'unspecified'}, Eye color: ${eyeColor}, Hair style: ${hairStyle}, Hair color: ${hairColor}, Skin color: ${skinColor}, Facial hair: ${facialHair}, Build/Body Type: ${build} (modest and professional), Facial Bone Structure: ${uniqueFacialStructure}, Distinctive Features: ${distinctiveFeatures}, Accessories/Eyewear: ${accessories}, Height: ${guestData.height || 'unspecified'}. Personality traits: ${(guestData.traits || []).join(', ')}. The subject is facing the camera. The framing MUST show everything from the shoulders up, including the full top of their hair. Bright, broad daylight lighting, completely clear visibility, 8k resolution, professional portrait photography. CRITICAL: This is a real, live-action photograph taken with a DSLR camera. The image MUST be highly photorealistic and the person MUST look exactly 24 years old. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art, NO vector graphics. Maintain a professional, family-friendly appearance.`;
    
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
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
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
      let rawData = null;

      if (response && response.ok) {
        const data = await response.json();
        rawData = data;
        base64Str = data.predictions?.[0]?.bytesBase64Encoded;
      } else if (response) {
        try {
          rawData = await response.json();
        } catch (e) {
          rawData = { status: response.status, statusText: response.statusText };
        }
      }

      if (base64Str) {
        // Upload to Supabase Storage instead of saving base64 directly to database
        const buffer = Buffer.from(base64Str, 'base64');
        const fileName = `${guestId}-${promptHash}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('character-images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error('Failed to upload the generated image to Supabase Storage.');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('character-images')
            .getPublicUrl(fileName);
          
          dataUri = publicUrl;
          console.log('Saved to storage with public URL:', dataUri);
        }
      } else {
        let errorMsg = rawData?.error?.message;
        if (!errorMsg && rawData?.promptFeedback?.blockReason) {
          errorMsg = `Safety Filter Blocked: ${rawData.promptFeedback.blockReason}`;
        } else if (!errorMsg && Object.keys(rawData || {}).length === 0) {
          errorMsg = `Safety Filter Blocked: The AI generated an image that triggered a strict safety filter. Please click regenerate to try again.`;
        } else if (!errorMsg) {
          errorMsg = `Unknown API Error. Payload: ${JSON.stringify(rawData).substring(0, 200)}`;
        }
        console.error('Image generation failed:', errorMsg);
        throw new Error(`Google AI Generation Failed (Status ${response?.status || 'Unknown'}): ${errorMsg}`);
      }
    }
      
    // Update the guest record
    // We want to KEEP the existing DiceBear URL but append the AI Photo Url
    // so that the frontend can still render the 2D avatar, but the admin can fetch the 3D photo.
    let newAvatarUrl = guestData.avatar_url || '';
    if (newAvatarUrl.includes('aiPhotoUrl=')) {
      // Remove any existing aiPhotoUrl (whether preceded by ? or &)
      newAvatarUrl = newAvatarUrl.replace(/[?&]aiPhotoUrl=[^&]*/g, '');
    }
    
    // We also need to remove aiPhotoHash if it exists from previous attempts
    if (newAvatarUrl.includes('aiPhotoHash=')) {
      newAvatarUrl = newAvatarUrl.replace(/[?&]aiPhotoHash=[^&]*/g, '');
    }
    
    if (newAvatarUrl.includes('?')) {
      newAvatarUrl += `&aiPhotoUrl=${encodeURIComponent(dataUri)}`;
    } else if (newAvatarUrl) {
      newAvatarUrl += `?aiPhotoUrl=${encodeURIComponent(dataUri)}`;
    } else {
      // If no avatar_url exists, just use the data URI (fallback)
      newAvatarUrl = dataUri;
    }

    const { data: updateData, error: updateError } = await supabase
      .from('guests')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', guestId)
      .select();

    if (updateError || !updateData || updateData.length === 0) {
      throw new Error(updateError?.message || 'Failed to update guest (RLS blocked update or guest not found)');
    }

    return { publicUrl: newAvatarUrl };
    
  } catch (err: any) {
    console.error('Error generating guest avatar', err);
    throw new Error(err.message || 'Failed to generate guest avatar');
  }
}
