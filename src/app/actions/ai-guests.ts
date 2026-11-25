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

    let rawHairLength = guestData.avatar_config?.hairLength || '';
    let rawHairTexture = guestData.avatar_config?.hairTexture || 'Straight';
    let rawHairStyleCut = guestData.avatar_config?.hairStyle || '';
    let rawFaceShape = guestData.avatar_config?.faceShape || '';
    let rawLikenessNotes = guestData.avatar_config?.likenessNotes || '';

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
      if (cfg.facialHair) {
        const fhRaw = String(cfg.facialHair);
        facialHair =
          fhRaw === 'stubbleLight'
            ? 'light 5 o’clock shadow stubble'
            : fhRaw === 'beardLight'
              ? 'short neatly trimmed beard'
              : fhRaw === 'beardMedium'
                ? 'full medium trimmed beard'
                : fhRaw === 'beardMajestic'
                  ? 'long full majestic beard'
                  : fhRaw === 'goatee'
                    ? 'trimmed goatee beard'
                    : fhRaw.replace(/([A-Z])/g, ' $1').toLowerCase();
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
        const hs = url.searchParams.get('hairStyle');
        const fsParam = url.searchParams.get('faceShape');
        const lnParam = url.searchParams.get('likenessNotes');

        if (hl) rawHairLength = hl;
        if (ht) rawHairTexture = ht;
        if (hs) rawHairStyleCut = hs;
        if (fsParam) rawFaceShape = fsParam;
        if (lnParam) rawLikenessNotes = lnParam;

        if (!rawHairLength) {
          const top = url.searchParams.get('top');
          if (top === 'none' || top === 'noHair') {
            rawHairLength = 'Bald';
          } else if (top === 'theCaesar') {
            rawHairLength = 'Buzz / Crew Cut';
          } else if (top === 'shortCurly') {
            rawHairLength = 'Short';
            if (!ht) rawHairTexture = 'Curly';
          } else if (top === 'shortWaved') {
            rawHairLength = 'Short';
            if (!ht) rawHairTexture = 'Wavy';
          } else if (top) {
            rawHairLength = isMasculine ? 'Short' : 'Long';
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
        const fh = url.searchParams.get('facialHairStyle') || url.searchParams.get('facialHair');
        if (fh) {
          facialHair =
            fh === 'stubbleLight'
              ? 'light 5 o’clock shadow stubble'
              : fh === 'beardLight'
                ? 'short neatly trimmed beard'
                : fh === 'beardMedium'
                  ? 'full medium trimmed beard'
                  : fh === 'beardMajestic'
                    ? 'long full majestic beard'
                    : fh === 'goatee'
                      ? 'trimmed goatee beard'
                      : fh.replace(/([A-Z])/g, ' $1').toLowerCase();
        }

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

    // Build accurate base hairStyle description from rawHairLength & rawHairTexture
    const texLower = (rawHairTexture || 'Straight').toLowerCase();
    const isCurlyTex =
      texLower.includes('curly') || texLower.includes('loose curls') || texLower.includes('coily');
    const isWavyTex = texLower.includes('wavy') || texLower.includes('waves');

    if (rawHairLength === 'Bald') {
      hairStyle = 'bald / shaved head (no hair on top)';
    } else if (['Hijab', 'Turban', 'Beanie', 'Baseball Cap'].includes(rawHairLength)) {
      hairStyle = `wearing a ${rawHairLength.toLowerCase()}`;
    } else if (rawHairLength === 'Buzz / Crew Cut') {
      hairStyle = isMasculine
        ? "men's ultra-short clipper buzz cut / tight crew cut with faded sides"
        : 'ultra-short clipper buzz cut';
    } else if (isMasculine) {
      if (rawHairLength === 'Short' || !rawHairLength) {
        if (isCurlyTex) {
          hairStyle =
            "men's thick curly crop haircut (voluminous, well-defined natural curls and ringlets on top, 2.5 to 3.5 inches of dense curl volume on top with curls falling naturally onto the upper forehead, paired with neat shorter tapered sides and back — strictly NOT a flat buzzcut, NOT a straight crew cut, and NOT short bristle hair)";
        } else if (isWavyTex) {
          hairStyle =
            "men's short haircut with a fuller 2.5-to-3 inch textured wavy top and neat tapered sides";
        } else if (texLower.includes('afro')) {
          hairStyle = "men's short rounded afro taper haircut with neat faded sides";
        } else if (texLower.includes('dreads')) {
          hairStyle = "men's short dreadlocks / locs with tapered sides";
        } else {
          hairStyle =
            "men's short barbershop haircut with neat tapered sides and a styled 2-inch straight top";
        }
      } else if (rawHairLength === 'Medium') {
        if (isCurlyTex) {
          hairStyle =
            "men's medium-length voluminous curly haircut (thick, springy 3.5-to-4.5 inch curls on top and framing the upper forehead and temples, cropped above the collar)";
        } else {
          hairStyle = `men's medium-length barbershop haircut (3 to 4.5 inches of ${texLower} textured hair on top, cropped above the collar, strictly a masculine cut)`;
        }
      } else if (rawHairLength === 'Shoulder-Length') {
        hairStyle = `men's shoulder-length ${texLower} texture hair`;
      } else {
        hairStyle = `men's ${rawHairLength.toLowerCase()} length, ${texLower} texture hair`;
      }
    } else {
      hairStyle = `${rawHairLength || 'Long'} length, ${rawHairTexture || 'Straight'} texture`;
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
    // visual axes without EVER overriding the user's selected hair color, hair
    // texture, hairstyle cut, face shape, or likeness notes!
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
    const youngAges = [26, 23, 29, 25, 28, 24, 30, 27];
    const midAges = [38, 44, 36, 47, 41, 49, 39, 45];
    const oldAges = [55, 63, 58, 68, 60, 71, 56, 65];
    const exactAge =
      ageBracket === 'old'
        ? oldAges[slot % oldAges.length]
        : ageBracket === 'middle_aged'
        ? midAges[slot % midAges.length]
        : youngAges[slot % youngAges.length];
    const ageYearsDesc = `${exactAge} years old`;

    // Axis 2: Hair Shade Undertone Nuance (strictly within the user's chosen hair color — NEVER turn Black into Brown!)
    const lowerHairColor = hairColor.toLowerCase();
    if (lowerHairColor === 'black') {
      const blackVariants = [
        'deep natural jet-black hair (#121212) — strictly black hair, NOT brown',
        'rich glossy raven-black hair (#101014) — strictly black hair, NOT brown',
        'deep ink-black hair (#161616) — strictly black hair, NOT brown',
      ];
      hairColor = `Black (specifically: ${blackVariants[slot % blackVariants.length]})`;
    } else if (lowerHairColor === 'dark brown') {
      const darkBrownVariants = [
        'deep cool-toned espresso dark brown',
        'rich dark chocolate brown with deep mahogany undertones',
        'deep sable dark brown',
        'dark mocha-espresso brown',
      ];
      hairColor = `Dark Brown (specifically: ${darkBrownVariants[slot % darkBrownVariants.length]})`;
    } else if (lowerHairColor === 'light brown') {
      const lightBrownVariants = [
        'warm golden-chestnut light brown',
        'medium sandy ash-brown',
        'warm cinnamon-walnut light brown',
        'caramel-honey light brown',
      ];
      hairColor = `Light Brown (specifically: ${lightBrownVariants[slot % lightBrownVariants.length]})`;
    } else if (lowerHairColor === 'golden blonde') {
      const goldenBlondeVariants = [
        'natural warm honey-golden dirty blonde with darker sandy-blonde roots (#C8A464) — strictly warm golden/sandy blonde, NEVER white, NEVER silver, NEVER platinum',
        'warm sunlit sandy-golden blonde with natural medium-blonde depth (#CEA968) — strictly warm golden blonde, NEVER white or grey',
        'rich honey-wheat golden blonde with warm sandy undertones (#C49E5E) — strictly warm golden blonde, NEVER white or platinum',
      ];
      hairColor = `Golden Blonde (specifically: ${goldenBlondeVariants[slot % goldenBlondeVariants.length]})`;
    } else if (lowerHairColor === 'ash blonde') {
      const ashBlondeVariants = [
        'natural dark sandy dirty-blonde / cool bronde-blonde (#B29772) — strictly natural dirty sandy blonde, NEVER white, NEVER silver-grey',
        'medium sandy-taupe dirty blonde with natural darker roots (#A88E6B) — strictly natural sandy blonde, NEVER white or silver',
      ];
      hairColor = `Ash / Dirty Blonde (specifically: ${ashBlondeVariants[slot % ashBlondeVariants.length]})`;
    } else if (lowerHairColor === 'strawberry blonde') {
      hairColor =
        'Strawberry Blonde (specifically: warm copper-honey strawberry golden blonde — strictly warm reddish-gold blonde, NEVER white or silver)';
    } else if (lowerHairColor === 'white blonde') {
      hairColor =
        'White Blonde (specifically: bright Scandinavian platinum-white blonde)';
    }

    // Axis 3: Distinct Hair Parting & Styling Variation (strictly respecting chosen hairStyle cut AND hairTexture!)
    const HAIR_STYLE_CUT_DESCRIPTIONS: Record<string, string> = {
      'Textured Crop / Curly Fringe':
        'textured crop with thick volume/curls on top and natural curl ringlets dipping lightly at the top hairline onto the upper forehead, paired with neat tapered sides',
      'Taper Fade / Voluminous Top':
        'clean barbershop taper on the sides and temples with thick, high-volume curls/texture piled on top of the crown, keeping the forehead open and visible with a single small stray curl at the upper hairline',
      'Middle Part / Curtain Fringe':
        'center middle part with volume sweeping into face-framing curtain fringe around the temples',
      'Side Part / Swept':
        'defined side part swept neatly across the top with clean tapered sides',
      'Quiff / Pompadour':
        'voluminous quiff brushed upward and slightly back at the front hairline with tapered sides',
      'Slicked Back':
        'swept and styled smoothly backward off the forehead',
      'Modern Mullet / Shag':
        'modern textured mullet / shag with shorter sides, textured top/fringe, and longer layered back near the nape',
      'Bangs / Full Fringe':
        'full forehead bangs / fringe grazing the eyebrows',
      'Layered Blowout':
        'voluminous layered blowout with root lift and face-framing movement',
      'High Ponytail / Bun':
        'styled up into a high ponytail / top bun at the crown',
      'Braids / Cornrows':
        'neatly braided hair / cornrows',
    };

    let hairStylingVariation = '';
    if (rawHairStyleCut && HAIR_STYLE_CUT_DESCRIPTIONS[rawHairStyleCut]) {
      hairStylingVariation = HAIR_STYLE_CUT_DESCRIPTIONS[rawHairStyleCut];
    } else if (rawHairLength === 'Buzz / Crew Cut' || rawHairLength === 'Bald') {
      hairStylingVariation = '';
    } else if (isMasculine) {
      if (isCurlyTex) {
        const mascCurlyStyles = [
          'dense, tight natural curls piled on top of the crown with neat scissor-tapered sides, keeping the full broad forehead visible with one or two small loose curl ringlets dipping lightly at the upper hairline',
          'voluminous tousled curls on top (3 inches of defined ringlet curl volume) with a loose curl lock dropping slightly at the top hairline and neat tapered sides',
          'thick, springy natural curls on top styled in a textured curly crop with clean tapered sides and back',
        ];
        hairStylingVariation = mascCurlyStyles[slot % mascCurlyStyles.length];
      } else if (isWavyTex) {
        const mascWavyStyles = [
          'tousled natural wavy texture on top with a soft forward fringe sweep and neat tapered sides',
          'voluminous wavy top brushed slightly off-center with clean tapered sides',
          'textured surfer-wave crop on top with natural movement and tapered sides',
        ];
        hairStylingVariation = mascWavyStyles[slot % mascWavyStyles.length];
      } else if (texLower === 'straight') {
        const mascStraightStyles = [
          'textured quiff brushed up at the front with clean tapered fade on the sides',
          'classic side-parted barbershop cut with neat scissor-trimmed sides',
          'messy tousled textured crop with a short forward fringe',
          'short Ivy League taper brushed slightly to the side',
        ];
        hairStylingVariation = mascStraightStyles[slot % mascStraightStyles.length];
      }
    } else {
      const lowerHairStyle = hairStyle.toLowerCase();
      if (lowerHairStyle.includes('long') && lowerHairStyle.includes('straight')) {
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
      } else if (lowerHairStyle.includes('straight')) {
        const femStraightStyles = [
          'sleek side-parted cut tucked behind one ear',
          'textured French bob/lob with soft wispy forehead bangs',
          'voluminous side-swept blowout exposing the jawline',
          'half-up pinned crown style exposing the ears and cheekbones',
          'blunt-cut ends with face-framing curtain fringe',
          'sleek off-center part tucked cleanly behind both ears',
        ];
        hairStylingVariation = femStraightStyles[slot % femStraightStyles.length];
      }
    }

    // Axis 4: Eye Color & Eye Shape Nuance
    if (String(eyeColor).toLowerCase().includes('hazel')) {
      const hazelVariants = [
        'warm golden-amber hazel with a dark limbal ring',
        'olive-green dominant hazel with golden-brown flecks',
        'moss-green and warm taupe hazel eyes',
      ];
      eyeColor = `${eyeColor} (${hazelVariants[slot % hazelVariants.length]})`;
    } else if (String(eyeColor).toLowerCase().includes('brown')) {
      const brownEyeVariants = [
        'deep warm espresso-chocolate brown eyes',
        'rich dark velvet brown eyes',
        'warm chestnut-brown eyes',
      ];
      eyeColor = `${eyeColor} (${brownEyeVariants[slot % brownEyeVariants.length]})`;
    }

    // Axis 5: Macro-Anatomical Facial Bone Structure (Honors user-selected faceShape & distinctiveFeatures first!)
    const FACE_SHAPE_MAP: Record<string, string> = {
      'Square / Angular Jaw':
        'Broad square angular jawline with a well-defined chin, strong cheekbones, and balanced masculine/sculpted proportions',
      'Oval / Balanced':
        'Classic balanced oval face shape with a clean sculpted jawline and natural cheekbone contour',
      'Chiseled / High Cheekbones':
        'Chiseled diamond-oval face with high prominent cheekbones and a sharp defined jawline',
      'Round / Soft Jaw':
        'Approachable fuller-cheeked face with warm smiling contours and a softer wide jaw',
      'Heart-Shaped / Tapered Chin':
        'Heart-shaped face with wider cheekbones tapering to a defined chin',
      'Long / Sculpted':
        'Long angular rectangular face with sculpted cheekbones and a strong straight nose bridge',
    };

    const femFaceArchetypes = [
      'Heart-shaped face with a delicate pointed chin, high curved eyebrows, and soft apple cheeks',
      'Round, full-cheeked youthful face with a shorter face length, wide-set large round doe eyes, a small upturned button nose, and deep cheek dimples',
      'Long, narrow, sculpted angular face with razor-sharp hollow cheekbones, a longer straight aquiline nose bridge, and thick straight horizontal brows',
      'Strong square jawline with a defined chin, wide-spaced cat-tilted almond eyes, full plush lips with a sharp Cupid’s bow, and a petite nose',
      'Broad high Slavic cheekbones with a shorter wide jaw, hooded expressive eyes, a slightly wider structured nose, and a naturally full lower lip',
      'Petite gamine diamond-shaped face with prominent brow bones, large heavy-lidded eyes, a narrow delicate nose, and a wide expressive smile',
      'Sculpted oval face with a prominent cleft chin, bold feathered eyebrows, deep-set almond eyes, and high cheekbone definition',
      'Soft rectangular face with a strong jaw, rosy rounded cheeks, slightly downturned dreamy eyes, and a classic straight nose',
    ];
    const mascFaceArchetypes = [
      'Broad square jawline with a subtle chin dimple/cleft, thick dark well-defined eyebrows, and warm expressive eyes',
      'Sculpted oval-square face with strong cheekbones, defined straight eyebrows, and a clean athletic jawline',
      'Chiseled angular face with a defined jaw, natural straight nose bridge, and bold dark brows',
      'Approachable athletic face with a broad jaw, warm crinkling smiling eyes, and natural dark eyebrows',
      'Strong wide jaw with a clean sculpted chin, expressive eyes, and defined brow ridge',
      'Oval face with high cheekbones, wide-spaced eyes, and a clean sculpted jawline',
    ];
    let uniqueFacialStructure =
      rawFaceShape && FACE_SHAPE_MAP[rawFaceShape]
        ? FACE_SHAPE_MAP[rawFaceShape]
        : isMasculine
          ? mascFaceArchetypes[slot % mascFaceArchetypes.length]
          : femFaceArchetypes[slot % femFaceArchetypes.length];

    const dfLower = distinctiveFeatures.toLowerCase();
    if (
      dfLower.includes('thick / dark eyebrows') ||
      (isMasculine && (lowerHairColor === 'black' || lowerHairColor === 'dark brown'))
    ) {
      uniqueFacialStructure +=
        ' — featuring thick, dark, well-defined natural eyebrows matching the dark hair';
    }
    if (dfLower.includes('cleft / dimpled chin')) {
      uniqueFacialStructure += ' — featuring a distinct center chin cleft / chin dimple';
    }
    if (dfLower.includes('cheek dimples')) {
      uniqueFacialStructure += ' — featuring visible cheek dimples when smiling';
    }

    // Axis 6: Regional / Cultural Heritage Phenotype (when Ethnicity is unspecified — strictly aligned with chosen skinColor!)
    let phenotypeNuance = ethnicity;
    if (!ethnicity || ethnicity === 'unspecified') {
      const lowerSkin = skinColor.toLowerCase();
      if (lowerSkin === 'porcelain' || lowerSkin === 'fair' || lowerSkin === 'light') {
        const fairPhenotypes = [
          'Caucasian / Anglo-Australian / Western European facial phenotype with fair-to-light warm rosy-ivory Caucasian skin',
          'Anglo-Celtic / British facial phenotype with clear fair-light natural complexion',
          'Western European Caucasian facial phenotype with light warm ivory skin and natural bone structure',
          'Northern / Continental European Caucasian facial phenotype with crisp bone structure and fair-light skin',
        ];
        phenotypeNuance = fairPhenotypes[slot % fairPhenotypes.length];
      } else if (lowerSkin === 'olive') {
        phenotypeNuance =
          'Mediterranean / Southern European facial phenotype with warm olive complexion';
      } else {
        phenotypeNuance = `Natural ${skinColor} complexion with dimensional portrait lighting`;
      }
    }

    // Axis 7: Distinct Expression & Camera Micro-Pose
    const expressionAndPoses = [
      'smiling warmly directly at the camera with a natural, joyful toothy grin showing upper teeth and crinkling smiling eyes',
      'flashing a big, genuine, friendly toothy smile directly toward the camera with relaxed shoulders',
      'posed in a natural editorial three-quarter angle with a warm, confident toothy smile and direct eye contact',
      'caught in a warm, candid smiling expression showing a bright toothy grin and approachable energy',
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
    const likenessDirective = rawLikenessNotes
      ? `\n- PRIMARY LIKENESS BLUEPRINT (HIGHEST PRIORITY — MATCH THIS EXACTLY): ${rawLikenessNotes}`
      : '';

    const prompt = `A clean, shoulders-up editorial casting headshot photograph of a ${subjectNoun} who is ${ageYearsDesc}, photographed against a completely plain, solid, seamless pure white/light-grey studio background (#F4F4F4).
CRITICAL LIKENESS & HAIR FIDELITY DIRECTIVE: You MUST faithfully render the exact hair color (${hairColor}), hair texture (${rawHairTexture}), haircut shape (${hairStyle}), and facial structure specified below.${likenessDirective}
- Gender: ${genderLabel}
- Cultural / Regional Facial Phenotype: ${phenotypeNuance}
- Macro Facial Bone Structure & Jawline: ${uniqueFacialStructure}
- Eye Color & Shape: ${eyeColor}
- Hair Length, Cut & Texture (MANDATORY): ${hairStyle}${hairStylingVariation ? ` — SPECIFIC STYLING: ${hairStylingVariation}` : ''}
- Hair Color & Shade (MANDATORY): ${hairColor}
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
