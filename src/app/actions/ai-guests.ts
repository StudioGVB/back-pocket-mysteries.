'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logAiUsage } from '@/utils/ai-logger';
import { getAllCachedMysteries, updateCachedMysteryCharacters } from '@/lib/live-session-store';

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

    const rawGender = (guestData.gender || 'unspecified').toLowerCase();
    const isMasculine = rawGender === 'masculine' || rawGender === 'male';
    const isFeminine = rawGender === 'feminine' || rawGender === 'female';

    if (guestData.avatar_url) {
      try {
        const url = new URL(guestData.avatar_url);
        
        const hl = url.searchParams.get('hairLength');
        const ht = url.searchParams.get('hairTexture');
        const tex = (ht || 'straight').toLowerCase();
        
        if (hl) {
          if (hl === 'Bald') {
            hairStyle = 'bald / no hair';
          } else if (['Hijab', 'Turban', 'Beanie'].includes(hl)) {
            hairStyle = `wearing a ${hl.toLowerCase()}`;
          } else if (isMasculine) {
            if (hl === 'Short') {
              hairStyle = `men's short cropped barbershop haircut (neat tapered sides and back, short ${tex} texture on top)`;
            } else if (hl === 'Medium') {
              hairStyle = `men's medium-length barbershop haircut (cropped well above the ears and collar, neat tapered sides with a medium-length ${tex} textured top, strictly a masculine men's cut, NOT long hair and NOT touching the shoulders)`;
            } else if (hl === 'Shoulder-Length') {
              hairStyle = `men's shoulder-length ${tex} texture hair`;
            } else {
              hairStyle = `men's ${hl.toLowerCase()} length, ${tex} texture hair`;
            }
          } else {
            hairStyle = `${hl} length, ${ht || 'straight'} texture`;
          }
        } else {
          const top = url.searchParams.get('top');
          if (top) {
            if (top === 'none' || top === 'noHair') {
              hairStyle = 'bald / no hair';
            } else if (isMasculine && (top === 'curvy' || top === 'shortCurly')) {
              hairStyle = `men's short-to-medium curly barbershop haircut (cropped above the ears and collar, strictly NOT long hair)`;
            } else {
              hairStyle = top.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/[0-9]/g, '').trim() + ' hair';
            }
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
    const faceShapes = isMasculine
      ? ['square', 'angular', 'rectangular', 'chiseled oval', 'broad', 'oblong']
      : ['oval', 'round', 'heart-shaped', 'diamond-shaped', 'softly contoured', 'elegant'];
    const jawlines = isMasculine
      ? ['strong', 'sharp', 'squared', 'chiseled', 'defined masculine', 'broad']
      : ['soft', 'defined', 'delicate', 'rounded', 'smooth', 'graceful'];
    const noseShapes = isMasculine
      ? ['straight', 'strong', 'slightly wide', 'distinctive', 'subtle aquiline', 'structured']
      : ['straight', 'button', 'narrow', 'distinctive', 'soft rounded', 'elegant'];
    
    const faceShape = faceShapes[parseInt(hashHex.substring(0, 2), 16) % faceShapes.length];
    const jawline = jawlines[parseInt(hashHex.substring(2, 4), 16) % jawlines.length];
    const noseShape = noseShapes[parseInt(hashHex.substring(4, 6), 16) % noseShapes.length];
    const uniqueFacialStructure = `${faceShape} face, ${jawline} jawline, and a ${noseShape} nose`;

    let genderLabel = guestData.gender || 'unspecified';
    let subjectNoun = 'individual';
    let genderGuardrail = '';
    if (isMasculine) {
      genderLabel = 'Male (Man, explicitly masculine facial structure)';
      subjectNoun = 'man';
      genderGuardrail = ' CRITICAL FOR MALE SUBJECT: The subject MUST be an unmistakably masculine 24-year-old man with male facial bone structure, masculine brow ridge, strong masculine jaw, no makeup, and a men\'s haircut. Do NOT generate feminine features or women\'s long hairstyles.';
    } else if (isFeminine) {
      genderLabel = 'Female (Woman)';
      subjectNoun = 'woman';
    } else if (rawGender === 'neutral' || rawGender === 'adaptable') {
      genderLabel = 'Androgynous / Non-binary (Neutral features)';
      subjectNoun = 'person';
    }

    const prompt = `A clean, front-facing shoulders-up studio headshot photograph of a ${subjectNoun} who is 24 years old, photographed against a completely plain, solid, seamless pure white studio background (#FFFFFF / #F4F4F4). Physical features: Gender: ${genderLabel}, Ethnicity: ${guestData.ethnicity || 'unspecified'}, Eye color: ${eyeColor}, Hair style: ${hairStyle}, Hair color: ${hairColor}, Skin color: ${skinColor}, Facial hair: ${facialHair}, Build/Body Type: ${build}, Facial Bone Structure: ${uniqueFacialStructure}, Distinctive Features: ${distinctiveFeatures}, Accessories/Eyewear: ${accessories}, Height: ${guestData.height || 'unspecified'}. The subject is looking directly at the camera with a natural, neutral-to-slight expression, wearing a simple plain white or black crew-neck t-shirt or tank top (NO suits, NO blazers, NO costumes). The framing MUST show everything from the shoulders up, including the full top of their hair, centered in the frame. Soft, even, flat studio headshot lighting (like a clean casting agency digital polaroid).${genderGuardrail} CRITICAL BACKGROUND RULE: The background MUST be 100% plain solid white or very light neutral studio paper with ZERO outdoor scenery, ZERO trees, ZERO buildings, and ZERO props. CRITICAL REALISM RULE: This is a real, live-action studio headshot photograph taken with a DSLR camera (85mm portrait lens). Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations.`;
    
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
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] }
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
        const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        base64Str = imgPart?.inlineData?.data || data.predictions?.[0]?.bytesBase64Encoded || '';
      } else if (response) {
        try {
          rawData = await response.json();
        } catch (e) {
          rawData = { status: response.status, statusText: response.statusText };
        }
      }

      if (base64Str) {
        await logAiUsage({
          model_name: 'gemini-2.5-flash-image',
          feature_name: 'generate_guest_avatar',
          usageMetadata: rawData?.usageMetadata,
        });

        // Upload to Supabase Storage, with local public/generated-avatars fallback
        const buffer = Buffer.from(base64Str, 'base64');
        const fileName = `${guestId}-${promptHash.slice(0, 32)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('character-images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('character-images')
            .getPublicUrl(fileName);
          dataUri = publicUrl;
        } else {
          try {
            const outDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'generated-avatars');
            fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(path.join(outDir, fileName), buffer);
            dataUri = `/generated-avatars/${fileName}`;
          } catch {
            dataUri = `data:image/jpeg;base64,${base64Str}`;
          }
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

    await supabase
      .from('guests')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', guestId);

    // Propagate the new AI avatar URL, accent, age, and gender to any character assigned to this guest in the live session cache & DB
    try {
      let extractedAccent: string | undefined;
      let extractedAge: string | undefined;
      try {
        const parsedUrl = new URL(newAvatarUrl);
        extractedAccent = parsedUrl.searchParams.get('accent') || undefined;
        extractedAge = parsedUrl.searchParams.get('age') || undefined;
      } catch {
        const accMatch = newAvatarUrl.match(/[?&]accent=([^&]+)/);
        if (accMatch) extractedAccent = decodeURIComponent(accMatch[1]);
        const ageMatch = newAvatarUrl.match(/[?&]age=([^&]+)/);
        if (ageMatch) extractedAge = decodeURIComponent(ageMatch[1]);
      }

      const allCached = getAllCachedMysteries();
      for (const [mId, cachedMystery] of Object.entries(allCached || {})) {
        const chars = cachedMystery?.characters || [];
        let changed = false;
        const nextChars = chars.map((c: any) => {
          const pd = c.profile_data || {};
          if (
            pd.guest_id === guestId ||
            (guestData?.name &&
              pd.guest_name &&
              String(pd.guest_name).toLowerCase() === String(guestData.name).toLowerCase())
          ) {
            changed = true;
            const nextPd = {
              ...pd,
              avatar_url: newAvatarUrl,
              ...(extractedAccent ? { accent: extractedAccent } : {}),
              ...(extractedAge ? { age: extractedAge } : {}),
              ...(guestData?.gender ? { gender: guestData.gender } : {}),
            };
            supabase
              .from('characters')
              .update({ profile_data: nextPd })
              .eq('id', c.id)
              .then(() => {});
            return { ...c, profile_data: nextPd };
          }
          return c;
        });
        if (changed) {
          updateCachedMysteryCharacters(mId, nextChars);
        }
      }
    } catch {
      // Non-fatal if cache propagation fails
    }

    return { publicUrl: newAvatarUrl };
    
  } catch (err: any) {
    console.error('Error generating guest avatar', err);
    throw new Error(err.message || 'Failed to generate guest avatar');
  }
}
