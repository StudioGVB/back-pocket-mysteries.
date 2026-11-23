'use server';

import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logAiUsage } from '@/utils/ai-logger';
import { getAllCachedMysteries, updateCachedMysteryCharacters } from '@/lib/live-session-store';

export async function generateGuestAvatarAction(
  guestId: string,
  guestData: any,
  options?: { forceRegenerate?: boolean; isHostProfile?: boolean }
) {
  try {
    let hairColor = 'unspecified';
    let skinColor = 'unspecified';
    let facialHair = 'none';
    let build = guestData.build || guestData.avatar_config?.build || 'unspecified';
    let distinctiveFeatures =
      Array.isArray(guestData.avatar_config?.distinctiveFeatures) &&
      guestData.avatar_config.distinctiveFeatures.length > 0
        ? guestData.avatar_config.distinctiveFeatures.join(', ')
        : 'none';
    let accessories = guestData.avatar_config?.accessories || 'none';
    let hairStyle = 'unspecified';
    let ethnicity =
      guestData.ethnicity || guestData.avatar_config?.ethnicity || 'unspecified';
    let height =
      guestData.height || guestData.avatar_config?.height || 'unspecified';
    let ageBracket =
      guestData.age || guestData.avatar_config?.age || 'young';

    let eyeColor =
      guestData.eye_color ||
      guestData.eyeColor ||
      guestData.avatar_config?.eyeColor ||
      'unspecified';

    const rawGender = (
      guestData.gender ||
      (guestData.pronouns?.toLowerCase().includes('she')
        ? 'female'
        : guestData.pronouns?.toLowerCase().includes('he')
        ? 'male'
        : 'unspecified')
    ).toLowerCase();
    const isMasculine = rawGender === 'masculine' || rawGender === 'male';
    const isFeminine = rawGender === 'feminine' || rawGender === 'female';

    const hairColorMap: Record<string, string> = {
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
      '00b894': 'Mint Green',
    };

    const skinColorMap: Record<string, string> = {
      'ffe0bd': 'Porcelain',
      'ffcd94': 'Fair',
      'eac086': 'Light',
      'd08b5b': 'Olive',
      'ae5d29': 'Light Brown',
      '8d5524': 'Medium Brown',
      '614335': 'Dark Brown',
      '3b2219': 'Deep',
    };

    // Extract from avatar_config directly if provided
    if (guestData.avatar_config) {
      const cfg = guestData.avatar_config;
      if (cfg.hairColor) {
        const cleanHex = String(cfg.hairColor).replace('#', '').toLowerCase();
        hairColor = hairColorMap[cleanHex] || `matching hex #${cleanHex}`;
      }
      if (cfg.skinColor) {
        const cleanHex = String(cfg.skinColor).replace('#', '').toLowerCase();
        skinColor = skinColorMap[cleanHex] || `matching hex #${cleanHex}`;
      }
      if (cfg.hairLength) {
        const hl = cfg.hairLength;
        const tex = (cfg.hairTexture || 'straight').toLowerCase();
        if (hl === 'Bald') hairStyle = 'bald / no hair';
        else if (['Hijab', 'Turban', 'Beanie'].includes(hl))
          hairStyle = `wearing a ${hl.toLowerCase()}`;
        else if (isMasculine)
          hairStyle = `men's ${hl.toLowerCase()} length, ${tex} texture haircut`;
        else hairStyle = `${hl} length, ${cfg.hairTexture || 'straight'} texture`;
      }
      if (cfg.facialHair) {
        facialHair = String(cfg.facialHair).replace(/([A-Z])/g, ' $1').toLowerCase();
      }
      if (cfg.accessories && cfg.accessories !== 'none') {
        accessories =
          cfg.accessories === 'prescription01'
            ? 'glasses'
            : String(cfg.accessories).replace(/([A-Z])/g, ' $1').toLowerCase();
      }
    }

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
        } else if (hairStyle === 'unspecified') {
          const top = url.searchParams.get('top');
          if (top) {
            if (top === 'none' || top === 'noHair') {
              hairStyle = 'bald / no hair';
            } else if (isMasculine && (top === 'curvy' || top === 'shortCurly')) {
              hairStyle = `men's short-to-medium curly barbershop haircut (cropped above the ears and collar, strictly NOT long hair)`;
            } else {
              hairStyle =
                top
                  .replace(/([A-Z])/g, ' $1')
                  .toLowerCase()
                  .replace(/[0-9]/g, '')
                  .trim() + ' hair';
            }
          }
        }

        const hc = url.searchParams.get('hairColor');
        if (hc) {
          const cleanHex = hc.replace('#', '').toLowerCase();
          hairColor = hairColorMap[cleanHex] || `matching hex #${cleanHex}`;
        }

        const sc = url.searchParams.get('skinColor');
        if (sc) {
          const cleanHex = sc.replace('#', '').toLowerCase();
          skinColor = skinColorMap[cleanHex] || `matching hex #${cleanHex}`;
        }
        const fh = url.searchParams.get('facialHair');
        if (fh) facialHair = fh.replace(/([A-Z])/g, ' $1').toLowerCase();

        const b = url.searchParams.get('build');
        if (b) build = b;

        const ec = url.searchParams.get('eyeColor');
        if (ec && eyeColor === 'unspecified') eyeColor = ec;

        const hParam = url.searchParams.get('height');
        if (hParam && height === 'unspecified') height = hParam;

        const ethParam = url.searchParams.get('ethnicity');
        if (ethParam && ethnicity === 'unspecified') ethnicity = ethParam;

        const ageParam = url.searchParams.get('age');
        if (ageParam) ageBracket = ageParam;

        const df = url.searchParams.get('distinctiveFeatures');
        if (df) distinctiveFeatures = df;

        const acc = url.searchParams.get('accessories');
        if (acc && acc !== 'none') {
          if (acc === 'prescription01') accessories = 'glasses';
          else accessories = acc.replace(/([A-Z])/g, ' $1').toLowerCase();
        }
      } catch {
        // Ignore invalid URL
      }
    }

    if (String(eyeColor).toLowerCase().includes('hazel')) {
      eyeColor =
        'true hazel (a natural, warm, muted blend of light brown and olive green, predominantly brown in the center)';
    }

    const ageYearsDesc =
      ageBracket === 'old'
        ? '55 years old'
        : ageBracket === 'middle_aged'
        ? '38 years old'
        : '26 years old';

    // Generate a unique facial structure based on the guest ID to prevent "same-face syndrome"
    const hashHex = crypto
      .createHash('md5')
      .update(guestId || guestData.id || guestData.name || 'default')
      .digest('hex');
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
      genderGuardrail = ` CRITICAL FOR MALE SUBJECT: The subject MUST be an unmistakably masculine ${ageYearsDesc} man with male facial bone structure, masculine brow ridge, strong masculine jaw, no makeup, and a men's haircut. Do NOT generate feminine features or women's long hairstyles.`;
    } else if (isFeminine) {
      genderLabel = 'Female (Woman)';
      subjectNoun = 'woman';
    } else if (rawGender === 'neutral' || rawGender === 'adaptable') {
      genderLabel = 'Androgynous / Non-binary (Neutral features)';
      subjectNoun = 'person';
    }

    const prompt = `A clean, front-facing shoulders-up studio headshot photograph of a ${subjectNoun} who is ${ageYearsDesc}, photographed against a completely plain, solid, seamless pure white studio background (#FFFFFF / #F4F4F4). Physical features: Gender: ${genderLabel}, Ethnicity: ${ethnicity}, Eye color: ${eyeColor}, Hair style: ${hairStyle}, Hair color: ${hairColor}, Skin color: ${skinColor}, Facial hair: ${facialHair}, Build/Body Type: ${build}, Facial Bone Structure: ${uniqueFacialStructure}, Distinctive Features: ${distinctiveFeatures}, Accessories/Eyewear: ${accessories}, Height: ${height}. The subject is looking directly at the camera with a natural, warm, neutral-to-slight expression, wearing a simple plain white or black crew-neck t-shirt or tank top (NO suits, NO blazers, NO costumes). The framing MUST show everything from the shoulders up, including the full top of their hair, centered in the frame. Soft, even, flat studio headshot lighting (like a clean casting agency digital polaroid).${genderGuardrail} CRITICAL BACKGROUND RULE: The background MUST be 100% plain solid white or very light neutral studio paper with ZERO outdoor scenery, ZERO trees, ZERO buildings, and ZERO props. CRITICAL REALISM RULE: This is a real, live-action studio headshot photograph taken with a DSLR camera (85mm portrait lens). Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations.`;

    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized: You must be signed in to generate guest avatars.');
    }

    let dataUri = '';

    // 1. Check cache first (unless forceRegenerate is explicitly requested with identical traits)
    if (!options?.forceRegenerate) {
      const { data: cached } = await supabase
        .from('image_generation_cache')
        .select('image_url')
        .eq('prompt_hash', promptHash)
        .maybeSingle();

      if (cached?.image_url) {
        dataUri = cached.image_url;
      }
    }

    if (!dataUri) {
      // 2. Generate via Gemini Imagen
      let response;
      let retries = 0;

      while (retries < 3) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ['IMAGE'] },
            }),
          }
        );

        if (response.status === 429 || response.status === 403) {
          retries++;
          await new Promise((r) => setTimeout(r, 2000 * retries));
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
        base64Str =
          imgPart?.inlineData?.data || data.predictions?.[0]?.bytesBase64Encoded || '';
      } else if (response) {
        try {
          rawData = await response.json();
        } catch {
          rawData = { status: response.status, statusText: response.statusText };
        }
      }

      if (base64Str) {
        await logAiUsage({
          model_name: 'gemini-2.5-flash-image',
          feature_name: 'generate_guest_avatar',
          usageMetadata: rawData?.usageMetadata,
        });

        const buffer = Buffer.from(base64Str, 'base64');
        const fileName = `${guestId}-${promptHash.slice(0, 16)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('character-images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('character-images').getPublicUrl(fileName);
          dataUri = publicUrl;
        } else {
          try {
            const outDir = path.join(
              /*turbopackIgnore: true*/ process.cwd(),
              'public',
              'generated-avatars'
            );
            fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(path.join(outDir, fileName), buffer);
            dataUri = `/generated-avatars/${fileName}`;
          } catch {
            dataUri = `data:image/jpeg;base64,${base64Str}`;
          }
        }

        // Save to image_generation_cache
        try {
          await supabase.from('image_generation_cache').upsert(
            {
              prompt_hash: promptHash,
              image_url: dataUri,
            },
            { onConflict: 'prompt_hash' }
          );
        } catch {
          // ignore cache write error
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
        throw new Error(
          `Google AI Generation Failed (Status ${response?.status || 'Unknown'}): ${errorMsg}`
        );
      }
    }

    // Build updated avatar_url containing &aiPhotoUrl=...
    let newAvatarUrl = guestData.avatar_url || '';
    if (newAvatarUrl.includes('aiPhotoUrl=')) {
      newAvatarUrl = newAvatarUrl.replace(/[?&]aiPhotoUrl=[^&]*/g, '');
    }
    if (newAvatarUrl.includes('aiPhotoHash=')) {
      newAvatarUrl = newAvatarUrl.replace(/[?&]aiPhotoHash=[^&]*/g, '');
    }

    if (newAvatarUrl.includes('?')) {
      newAvatarUrl += `&aiPhotoUrl=${encodeURIComponent(dataUri)}`;
    } else if (newAvatarUrl) {
      newAvatarUrl += `?aiPhotoUrl=${encodeURIComponent(dataUri)}`;
    } else {
      newAvatarUrl = dataUri;
    }

    const isHost =
      Boolean(options?.isHostProfile) ||
      guestId === user.id ||
      guestId === '4903bd39-e54f-42e4-b679-2af5d128bb8f';

    // Update manual guests table if applicable
    await supabase
      .from('guests')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', guestId)
      .eq('user_id', user.id);

    // If this is the Host Profile, also persist aiPhotoUrl into profiles.avatar_config and profiles.avatar_url
    if (isHost) {
      try {
        const { data: existingProf } = await (supabase as any)
          .from('profiles')
          .select('avatar_config')
          .eq('id', user.id)
          .maybeSingle();

        const nextConfig = {
          ...(existingProf?.avatar_config || guestData.avatar_config || {}),
          aiPhotoUrl: dataUri,
        };

        await (supabase as any)
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email,
              avatar_url: newAvatarUrl,
              avatar_config: nextConfig,
            },
            { onConflict: 'id' }
          );
      } catch (profErr) {
        console.warn('Could not persist host aiPhotoUrl to profiles:', profErr);
      }
    }

    // Propagate the new AI avatar URL and invalidate stale standard_character_photo_url on assigned characters
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

      const targetNameLower = String(guestData?.name || '').trim().toLowerCase();

      // Update characters in Supabase DB for mysteries owned by this user
      const { data: userMysteries } = await supabase
        .from('mysteries')
        .select('id')
        .eq('created_by', user.id);

      const mysteryIds = (userMysteries || []).map((m: any) => m.id);
      if (mysteryIds.length > 0) {
        const { data: dbChars } = await supabase
          .from('characters')
          .select('id, profile_data')
          .in('mystery_id', mysteryIds);

        for (const ch of dbChars || []) {
          const pd = (ch.profile_data as any) || {};
          const nameMatches =
            targetNameLower &&
            String(pd.guest_name || '').trim().toLowerCase() === targetNameLower;
          if (pd.guest_id === guestId || nameMatches) {
            const nextPd = {
              ...pd,
              avatar_url: newAvatarUrl,
              ...(extractedAccent ? { accent: extractedAccent } : {}),
              ...(extractedAge ? { age: extractedAge } : {}),
              ...(guestData?.gender ? { gender: guestData.gender } : {}),
            };
            delete nextPd.standard_character_photo_url;
            delete nextPd.standard_character_photo_hash;
            await supabase
              .from('characters')
              .update({ profile_data: nextPd })
              .eq('id', ch.id);
          }
        }
      }

      // Also update in-memory/disk live session cache
      const allCached = getAllCachedMysteries();
      for (const cachedMystery of allCached || []) {
        const mId = cachedMystery?.id;
        if (!mId) continue;
        if (cachedMystery?.created_by && cachedMystery.created_by !== user.id) continue;
        const chars = cachedMystery?.characters || [];
        let changed = false;
        const nextChars = chars.map((c: any) => {
          const pd = c.profile_data || {};
          const nameMatches =
            targetNameLower &&
            String(pd.guest_name || '').trim().toLowerCase() === targetNameLower;
          if (pd.guest_id === guestId || nameMatches) {
            changed = true;
            const nextPd = {
              ...pd,
              avatar_url: newAvatarUrl,
              ...(extractedAccent ? { accent: extractedAccent } : {}),
              ...(extractedAge ? { age: extractedAge } : {}),
              ...(guestData?.gender ? { gender: guestData.gender } : {}),
            };
            delete nextPd.standard_character_photo_url;
            delete nextPd.standard_character_photo_hash;
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

    return { publicUrl: newAvatarUrl, aiPhotoUrl: dataUri };
  } catch (err: any) {
    console.error('Error generating guest avatar', err);
    throw new Error(err.message || 'Failed to generate guest avatar');
  }
}
