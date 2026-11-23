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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized: You must be signed in to generate guest avatars.');
    }

    // ---------------------------------------------------------------------------
    // 8-AXIS ROSTER-AWARE ANTI-CLONE DIVERSITY ENGINE
    // Guarantees that even when multiple guests share the exact same base traits
    // (e.g. fair skin + straight brown hair + hazel eyes), every guest in the
    // user's roster receives a distinct slot index (0..7) across 8 high-contrast
    // visual axes: hair parting/styling, hair shade undertone, macro facial bone
    // structure, regional phenotype, expression/pose, top color/neckline, exact age,
    // and studio lighting direction.
    // ---------------------------------------------------------------------------
    let rosterSlotIndex = 0;
    const isHostTarget =
      Boolean(options?.isHostProfile) ||
      guestId === user.id ||
      guestId === '4903bd39-e54f-42e4-b679-2af5d128bb8f';

    if (!isHostTarget) {
      try {
        const { data: rosterGuests } = await supabase
          .from('guests')
          .select('id, name, gender, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (Array.isArray(rosterGuests) && rosterGuests.length > 0) {
          const sameGenderList = rosterGuests.filter((g: any) => {
            const gRaw = String(g.gender || '').toLowerCase();
            const gMasc = gRaw === 'masculine' || gRaw === 'male';
            const gFem = gRaw === 'feminine' || gRaw === 'female';
            return isMasculine ? gMasc : isFeminine ? gFem : true;
          });
          const idx = sameGenderList.findIndex(
            (g: any) =>
              g.id === guestId ||
              (guestData.name &&
                String(g.name || '').toLowerCase() === String(guestData.name).toLowerCase())
          );
          if (idx >= 0) {
            // Reserve slot 0 for the Host so guest #1 starts at slot 1
            rosterSlotIndex = idx + 1;
          }
        }
      } catch {
        // Fallback to deterministic hash below
      }
    }

    const hashSeed = `${guestId || guestData.id || ''}:${guestData.name || 'default'}`;
    const hashHex = crypto.createHash('md5').update(hashSeed).digest('hex');
    if (!isHostTarget && rosterSlotIndex === 0) {
      rosterSlotIndex = (parseInt(hashHex.substring(0, 4), 16) % 7) + 1;
    }

    const slot = rosterSlotIndex;
    const subHash = parseInt(hashHex.substring(4, 8), 16);

    // Axis 1: Exact Age within Age Bracket
    const youngAges = [28, 22, 33, 25, 31, 24, 35, 27];
    const midAges = [38, 44, 36, 47, 41, 49, 39, 45];
    const oldAges = [55, 63, 58, 68, 60, 71, 56, 65];
    const exactAge =
      ageBracket === 'old'
        ? oldAges[slot % oldAges.length]
        : ageBracket === 'middle_aged'
        ? midAges[slot % midAges.length]
        : youngAges[slot % youngAges.length];
    const ageYearsDesc = `${exactAge} years old`;

    // Axis 2: Hair Shade Undertone Nuance (within the user's chosen hair color)
    const lowerHairColor = hairColor.toLowerCase();
    if (lowerHairColor.includes('brown') || lowerHairColor === 'black') {
      const brownVariants = [
        'deep cool-toned espresso dark brown',
        'warm medium-golden chestnut brown with subtle sun-kissed caramel dimension',
        'rich dark chocolate brown with warm mahogany undertones',
        'medium sandy ash-brown (cool bronde-brown)',
        'glossy raven-black dark brown',
        'warm cinnamon-walnut medium brown',
        'rich mocha brown with subtle honey-brown face-framing highlights',
        'deep sable brown',
      ];
      hairColor = `${hairColor} (specifically: ${brownVariants[slot % brownVariants.length]})`;
    } else if (lowerHairColor.includes('blonde')) {
      const blondeVariants = [
        'warm honey golden blonde',
        'icy cool platinum-ash blonde',
        'champagne sandy blonde with natural darker roots',
        'bright buttery sunlit blonde',
        'warm strawberry-caramel blonde',
        'beige-pearlescent Scandinavian blonde',
      ];
      hairColor = `${hairColor} (specifically: ${blondeVariants[slot % blondeVariants.length]})`;
    }

    // Axis 3: Distinct Hair Parting & Styling Variation (within their chosen length & texture!)
    const lowerHairStyle = hairStyle.toLowerCase();
    let hairStylingVariation = '';
    if (!isMasculine && lowerHairStyle.includes('long') && lowerHairStyle.includes('straight')) {
      const longStraightStyles = [
        'sleek middle part with hair tucked cleanly behind BOTH ears to fully expose the cheekbones and jawline',
        'voluminous 90s layered blowout with a deep left side part swept asymmetrically over one shoulder',
        'soft wispy forehead curtain bangs / fringe framing the eyebrows and temples, with straight hair pulled behind the shoulders',
        'half-up, half-down crown styling (top half pinned back high at the crown exposing the full forehead and ears, long straight ends behind the neck)',
        'chic collarbone-grazing blunt-cut straight layers with a sharp right side part tucked behind one ear',
        'sleek high snatched ponytail with long straight hair cascading from the crown and two delicate face-framing tendrils',
        'soft feathered face-framing layers with a deep off-center part and airy volume at the roots',
        'sleek straight hair swept completely back over the shoulders with a side-swept fringe across the forehead',
      ];
      hairStylingVariation = longStraightStyles[slot % longStraightStyles.length];
    } else if (!isMasculine && lowerHairStyle.includes('straight')) {
      const femStraightStyles = [
        'sleek side-parted cut tucked behind one ear',
        'textured French bob/lob with soft wispy forehead bangs',
        'voluminous side-swept blowout exposing the jawline',
        'half-up pinned crown style exposing the ears and cheekbones',
        'blunt-cut ends with face-framing curtain fringe',
        'sleek off-center part tucked cleanly behind both ears',
      ];
      hairStylingVariation = femStraightStyles[slot % femStraightStyles.length];
    } else if (isMasculine) {
      const mascStyles = [
        'textured quiff brushed up at the front with clean tapered fade on the sides',
        'classic side-parted barbershop cut with neat scissor-trimmed sides',
        'messy tousled textured crop with a short Caesar fringe',
        'slicked-back modern crew cut exposing the full forehead',
        'short Ivy League taper brushed slightly to the right',
        'modern buzzed-side fade with a spiky textured top',
      ];
      hairStylingVariation = mascStyles[slot % mascStyles.length];
    }

    // Axis 4: Eye Color & Eye Shape Nuance
    if (String(eyeColor).toLowerCase().includes('hazel') || String(eyeColor).toLowerCase().includes('brown')) {
      const eyeVariants = [
        'warm golden-amber hazel with a dark limbal ring',
        'olive-green dominant hazel with golden-brown flecks',
        'deep espresso-chocolate brown eyes',
        'light honey-chestnut brown eyes',
        'moss-green and warm taupe hazel eyes',
        'rich dark velvet brown eyes',
      ];
      eyeColor = `${eyeColor} (${eyeVariants[slot % eyeVariants.length]})`;
    }

    // Axis 5: Macro-Anatomical Facial Bone Structure (High-Contrast Proportions)
    const femFaceArchetypes = [
      'Heart-shaped face with a delicate pointed chin, high curved eyebrows, and soft apple cheeks',
      'Round, full-cheeked youthful face with a shorter face length, wide-set large round doe eyes, a small upturned button nose, and deep cheek dimples',
      'Long, narrow, sculpted angular face with razor-sharp hollow cheekbones, a longer straight aquiline nose bridge, and thick straight horizontal brows',
      'Strong square jawline with a defined chin, wide-spaced cat-tilted almond eyes, full plush lips with a sharp Cupid’s bow, and a petite nose',
      'Broad high Slavic cheekbones with a shorter wide jaw, hooded expressive eyes, a slightly wider structured nose, and a naturally full lower lip',
      'Petite gamine diamond-shaped face with prominent brow bones, large heavy-lidded eyes, a narrow delicate nose, and a wide expressive smile',
      'Sculpted oval face with a prominent cleft chin, bold feathered eyebrows, deep-set almond eyes, and high cheekbone definition',
      'Soft rectangular face with a strong jaw, rosy rounded cheeks, ligeramente downturned dreamy eyes, and a classic straight nose',
    ];
    const mascFaceArchetypes = [
      'Broad square jawline with a pronounced chin cleft, thick dark brows, and deep-set eyes',
      'Long angular rectangular face with high hollow cheekbones, a prominent aquiline Roman nose, and sharp jaw',
      'Rounder approachable face with full cheeks, warm crinkling eyes, and a softer wide jaw',
      'Chiseled diamond-shaped face with a narrow chin, sharp brow ridge, and narrow straight nose',
      'Strong wide jaw with a broader athletic neck, hooded eyes, and a slightly crooked distinctive nose bridge',
      'Oval face with high Nordic cheekbones, wide-spaced eyes, and a clean sculpted jawline',
    ];
    const uniqueFacialStructure = isMasculine
      ? mascFaceArchetypes[slot % mascFaceArchetypes.length]
      : femFaceArchetypes[slot % femFaceArchetypes.length];

    // Axis 6: Regional / Cultural Heritage Phenotype (when Ethnicity is unspecified)
    let phenotypeNuance = ethnicity;
    if (!ethnicity || ethnicity === 'unspecified') {
      const phenotypes = [
        'Western European / British facial phenotype',
        'Celtic / Irish-Scottish facial phenotype (porcelain-rose complexion with a visible dusting of natural freckles across the nose bridge and cheeks)',
        'Mediterranean / Southern European facial phenotype (warm olive-ivory undertone, thick dark eyelashes, bold sculpted dark eyebrows)',
        'Scandinavian / Northern European facial phenotype (crisp angular bone structure, high forehead, bright clear complexion)',
        'French / Continental gamine facial phenotype (expressive asymmetrical charm, sharp cheekbones, natural effortless look)',
        'Eastern European / Slavic facial phenotype (striking high cheekbones, wider eye spacing, heart-shaped lips)',
        'Iberian / Levantine-Mediterranean facial phenotype (warm ivory skin, striking dark-lashed eyes, defined brow arch)',
        'Central European / Alpine facial phenotype (rosy cheeks, strong bone structure, expressive eyes)',
      ];
      phenotypeNuance = phenotypes[slot % phenotypes.length];
    }

    // Axis 7: Distinct Expression & Camera Micro-Pose (Breaks identical 0° passport mugshots)
    const expressionAndPoses = [
      'looking directly at the camera with a warm, confident closed-lip smile',
      'flashing a big, joyful, open-mouth toothy grin showing upper teeth with crinkling smiling eyes, head tilted 10 degrees to the left',
      'posed in a clever editorial three-quarter angle (shoulders turned 25 degrees to the right, chin slightly lifted, playful knowing smirk with one eyebrow subtly raised)',
      'caught in a candid, warm mid-laugh expression showing a bright toothy smile and deep cheek dimples, shoulders angled 20 degrees to the left',
      'giving a cool, intense, mysterious editorial gaze with lips softly parted and a slight chin tuck, three-quarter shoulder turn',
      'smiling with a friendly, asymmetrical wry side-smile, lively spark in the eyes, and a subtle head tilt to the right',
      'beaming with a wide, radiant toothy smile and relaxed approachable posture, angled slightly toward the key light',
      'posing with a poised,sharp detective-style half-smile and piercing direct eye contact, shoulders turned 15 degrees',
    ];
    const chosenExpressionPose = expressionAndPoses[(slot + (subHash % 2)) % expressionAndPoses.length];

    // Axis 8: Distinct Studio Top Color & Neckline (Breaks identical black crew-neck clones!)
    const femTopWardrobe = [
      'a simple classic black scoop-neck top',
      'a crisp pure white V-neck t-shirt',
      'a rich emerald-green scoop-neck top',
      'a warm burgundy / wine ribbed boat-neck top',
      'a classic navy-blue casual V-neck tee',
      'a terracotta / rust-orange ribbed tank top',
      'a soft heather-grey scoop-neck t-shirt',
      'a warm cream / oatmeal knit mock-neck top',
    ];
    const mascTopWardrobe = [
      'a simple classic charcoal-black crew-neck t-shirt',
      'a crisp pure white crew-neck t-shirt',
      'a navy-blue casual Henley t-shirt',
      'a heather-grey crew-neck t-shirt',
      'a forest-green casual crew-neck t-shirt',
      'a burgundy / maroon crew-neck t-shirt',
      'a slate-blue V-neck t-shirt',
      'an oatmeal / cream knit crew-neck t-shirt',
    ];
    const chosenTopWardrobe = isMasculine
      ? mascTopWardrobe[slot % mascTopWardrobe.length]
      : femTopWardrobe[slot % femTopWardrobe.length];

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

    const regenSalt = options?.forceRegenerate ? ` (Unique Variation Seed: ${Date.now() % 10000})` : '';

    const prompt = `A clean, shoulders-up editorial casting headshot photograph of a ${subjectNoun} who is ${ageYearsDesc}, photographed against a completely plain, solid, seamless pure white/light-grey studio background (#F4F4F4).
CRITICAL ANTI-CLONE UNIQUENESS DIRECTIVE: This subject MUST look like a completely distinct, unique real individual with unmistakable personal character — NOT a generic symmetrical AI fashion model.
- Gender: ${genderLabel}
- Cultural / Regional Facial Phenotype: ${phenotypeNuance}
- Macro Facial Bone Structure & Proportions: ${uniqueFacialStructure}
- Eye Color & Shape: ${eyeColor}
- Hair Length & Texture: ${hairStyle}${hairStylingVariation ? ` — SPECIFIC STYLING: ${hairStylingVariation}` : ''}
- Hair Color & Undertone: ${hairColor}
- Skin Complexion: ${skinColor}
- Facial Hair: ${facialHair}
- Build / Body Type: ${build}
- Distinctive Features: ${distinctiveFeatures}
- Accessories / Eyewear: ${accessories}
- Height: ${height}
- Expression & Camera Pose: The subject is ${chosenExpressionPose}.
- Wardrobe: Wearing ${chosenTopWardrobe} (NO suits, NO blazers, NO formal costumes).
The framing MUST show everything from the chest/shoulders up, including the full top of their hair, centered in the frame. Dimensional portrait studio lighting (85mm f/2.0 lens, sharp focus on the eyes, natural skin texture with visible pores).${genderGuardrail} CRITICAL BACKGROUND RULE: The background MUST be 100% plain solid white or very light neutral studio paper with ZERO outdoor scenery, ZERO props. CRITICAL REALISM RULE: Real DSLR live-action photograph, zero CGI, zero 3D render, zero illustration.${regenSalt}`;

    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');

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
