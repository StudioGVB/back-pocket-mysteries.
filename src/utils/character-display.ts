import {
  getBaseCharacterRoleTitle,
  adaptRoleTitleForGuestGender,
  adaptOutfitForGuestGender,
  adaptBioForGuestGender,
  adaptOutfitReferenceImagesForGuestGender,
  getCharacterDisplayName,
  hydrateTextWithCharacters,
  replacePlaceholderNamesWithRoles,
} from './hydration';
import { resolveDisplayAvatarUrl } from './avatar';

export interface CleanCharacterPresentation {
  roleTitle: string;
  displayName: string;
  guestName: string | null;
  gender: 'male' | 'female' | 'adaptable';
  effectiveGender: 'male' | 'female' | 'adaptable';
  isVictim: boolean;
  /** Short 1-2 sentence hook for cards */
  shortBlurb: string;
  /** Full backstory split into clean paragraphs */
  blurbParagraphs: string[];
  /** Primary outfit recommendation (matched to assigned guest gender if adaptable) */
  outfitAdvice: string;
  /** 2-3 distinct wearable outfit options for Look 1, Look 2, Look 3 */
  outfitOptions: string[];
  /** Optional masculine/feminine outfit variants when character is adaptable */
  outfitVariants?: {
    feminine?: string;
    masculine?: string;
  };
  /** Short summary of how to act in character */
  actSummary: string;
  /** Punchy bullet points for roleplay demeanor */
  actBullets: string[];
  /** Secrets or hidden motivation if present */
  secrets: string;
  /** Canonical Standard Character Photo or Outfit Photo URL */
  characterPhotoUrl: string | null;
  /** Up to 3 reference photos for outfit options */
  outfitReferenceImages: string[];
}

function cleanText(text: string | null | undefined, allCharacters: any[], mode: 'generic' | 'print' = 'print'): string {
  if (!text) return '';
  const base =
    mode === 'generic'
      ? hydrateTextWithCharacters(
          replacePlaceholderNamesWithRoles(text, allCharacters),
          allCharacters,
          'role'
        )
      : hydrateTextWithCharacters(text, allCharacters, 'print');

  return base
    .replace(/\{\{([A-Za-z0-9\s'._-]+)\}\}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+\n/g, '\n')
    .trim();
}

export function getCleanCharacterPresentation(
  char: any,
  allCharacters: any[] = [],
  options?: {
    mode?: 'generic' | 'print';
    overrideGuestGender?: string | null;
  }
): CleanCharacterPresentation {
  const mode = options?.mode || 'print';
  const profile = (char?.profile_data || {}) as Record<string, any>;
  const displayName = getCharacterDisplayName(char);
  const guestName = (profile.guest_name || profile.name || '').trim() || null;

  const rawCharGender = (char?.gender || 'adaptable').toLowerCase();
  const charGender: 'male' | 'female' | 'adaptable' =
    rawCharGender === 'male' || rawCharGender === 'masculine'
      ? 'male'
      : rawCharGender === 'female' || rawCharGender === 'feminine'
      ? 'female'
      : 'adaptable';

  const guestGenderRaw = (
    options?.overrideGuestGender ||
    char?.assignedFriend?.gender ||
    profile.gender ||
    char?.gender ||
    'adaptable'
  ).toLowerCase();

  const effectiveGender: 'male' | 'female' | 'adaptable' =
    guestGenderRaw === 'male' || guestGenderRaw === 'masculine' || guestGenderRaw === 'm'
      ? 'male'
      : guestGenderRaw === 'female' || guestGenderRaw === 'feminine' || guestGenderRaw === 'f'
      ? 'female'
      : charGender;

  const baseRoleTitle = getBaseCharacterRoleTitle(char) || 'The Suspect';
  const roleTitle =
    profile.keep_original_role_gender === true
      ? baseRoleTitle
      : adaptRoleTitleForGuestGender(baseRoleTitle, effectiveGender);

  const presFemale = profile.presentation_female || {};
  const presMale = profile.presentation_male || {};

  // Pick gender-matched presentation block when character is adaptable
  const activePres =
    effectiveGender === 'female'
      ? presFemale
      : effectiveGender === 'male'
      ? presMale
      : presFemale.outfit_advice || presFemale.act_summary
      ? presFemale
      : presMale;

  // 1. Outfit Advice (with bidirectional gender-flex adaptation)
  const rawOutfit =
    profile.outfit_description ||
    profile.outfit_advice ||
    activePres?.outfit_advice ||
    presFemale?.outfit_advice ||
    presMale?.outfit_advice ||
    'Dress to match the mystery theme and your character’s personality.';

  const baseCleanOutfit = cleanText(rawOutfit, allCharacters, mode);
  const outfitAdvice = adaptOutfitForGuestGender(baseCleanOutfit, effectiveGender);

  const femOutfit = presFemale?.outfit_advice
    ? cleanText(presFemale.outfit_advice, allCharacters, mode)
    : adaptOutfitForGuestGender(baseCleanOutfit, 'female');
  const mascOutfit = presMale?.outfit_advice
    ? cleanText(presMale.outfit_advice, allCharacters, mode)
    : adaptOutfitForGuestGender(baseCleanOutfit, 'male');

  const outfitVariants = {
    feminine: femOutfit,
    masculine: mascOutfit,
  };

  // 2. How to Act (Summary & Bullets)
  const rawActSummary =
    profile.act_summary ||
    activePres?.act_summary ||
    presFemale?.act_summary ||
    presMale?.act_summary ||
    '';

  const actSummary = adaptBioForGuestGender(
    cleanText(rawActSummary, allCharacters, mode),
    effectiveGender
  );

  const rawBullets: string[] =
    (Array.isArray(profile.act_bullets) && profile.act_bullets.length > 0
      ? profile.act_bullets
      : Array.isArray(activePres?.act_bullets) && activePres.act_bullets.length > 0
      ? activePres.act_bullets
      : Array.isArray(presFemale?.act_bullets)
      ? presFemale.act_bullets
      : Array.isArray(presMale?.act_bullets)
      ? presMale.act_bullets
      : []) || [];

  const actBullets = rawBullets
    .map(b => adaptBioForGuestGender(cleanText(b, allCharacters, mode), effectiveGender))
    .filter(Boolean);

  // 3. Backstory / Blurb
  const isGuestPersonalBio =
    Boolean(profile.guest_id) &&
    profile.bio &&
    profile.guest_bio &&
    profile.bio.trim() === profile.guest_bio.trim();

  const rawBio =
    (!isGuestPersonalBio ? profile.bio : '') ||
    rawActSummary ||
    (char?.is_victim
      ? `${roleTitle} commands the spotlight at tonight’s gathering, until a fatal turn sets the mystery in motion.`
      : `A key figure at tonight’s gathering with their own motives, secrets, and alibis to defend.`);

  const cleanedBio = adaptBioForGuestGender(
    cleanText(rawBio, allCharacters, mode),
    effectiveGender
  );
  const blurbParagraphs = cleanedBio
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  // Short hook for overview cards: prefer actSummary if concise, otherwise first 1-2 sentences of bio
  const shortSource = actSummary || blurbParagraphs[0] || cleanedBio;
  const sentences = shortSource.match(/[^.!?]+[.!?]+/g) || [shortSource];
  const shortBlurb = adaptBioForGuestGender(
    sentences.slice(0, 2).join(' ').trim() || shortSource,
    effectiveGender
  );

  // 4. Secrets
  const secrets = adaptBioForGuestGender(
    cleanText(profile.secrets || '', allCharacters, mode),
    effectiveGender
  );

  // 5. Standard Character Photo / Outfit Photo / Guest AI Portrait
  const guestIdStr = String(profile.guest_id || '').trim();
  const isUuidGuestId = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(guestIdStr);
  let resolvedAvatar = profile.avatar_url ? resolveDisplayAvatarUrl(profile.avatar_url) : '';

  // Guard against stale avatar_url from a previous guest assignment after a cast re-sort:
  // If guest_id is a UUID and resolvedAvatar embeds a different guest UUID in its filename,
  // find the portrait that matches this guest_id or fall back to standard_character_photo_url.
  const hasMismatchedGuestUuid =
    isUuidGuestId &&
    Boolean(resolvedAvatar) &&
    /\/(character-images|generated-avatars)\/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(resolvedAvatar) &&
    !resolvedAvatar.includes(guestIdStr);

  if (hasMismatchedGuestUuid) {
    let recoveredForGuest = '';
    for (const otherChar of allCharacters) {
      const otherAvatar = otherChar?.profile_data?.avatar_url
        ? resolveDisplayAvatarUrl(otherChar.profile_data.avatar_url)
        : '';
      if (otherAvatar && otherAvatar.includes(guestIdStr)) {
        recoveredForGuest = otherAvatar;
        break;
      }
    }
    resolvedAvatar = recoveredForGuest;
  }

  const hasAiGuestPortrait =
    Boolean(resolvedAvatar) &&
    (String(profile.avatar_url || '').includes('aiPhotoUrl=') ||
      resolvedAvatar.startsWith('/generated-avatars/') ||
      resolvedAvatar.includes('/character-images/'));

  const rawFallbackPhoto =
    profile.standard_character_photo_url ||
    profile.outfit_image_url ||
    activePres?.outfit_image_url ||
    presFemale?.outfit_image_url ||
    presMale?.outfit_image_url ||
    char?.image_url ||
    null;

  const adaptedFallbackPhoto = rawFallbackPhoto
    ? adaptOutfitReferenceImagesForGuestGender([rawFallbackPhoto], effectiveGender)[0] || rawFallbackPhoto
    : null;

  const characterPhotoUrl =
    (hasAiGuestPortrait ? resolvedAvatar : null) ||
    adaptedFallbackPhoto;

  // 6. 3 Outfit Reference Photos (with bidirectional gender-flex adaptation)
  const rawOutfitImages: string[] =
    (Array.isArray(activePres?.outfit_reference_images) &&
    activePres.outfit_reference_images.filter(Boolean).length > 0
      ? activePres.outfit_reference_images
      : Array.isArray(profile.outfit_reference_images) &&
        profile.outfit_reference_images.filter(Boolean).length > 0
      ? profile.outfit_reference_images
      : Array.isArray(presFemale?.outfit_reference_images) &&
        presFemale.outfit_reference_images.filter(Boolean).length > 0
      ? presFemale.outfit_reference_images
      : Array.isArray(presMale?.outfit_reference_images) &&
        presMale.outfit_reference_images.filter(Boolean).length > 0
      ? presMale.outfit_reference_images
      : []) || [];

  const filteredOutfitImages = rawOutfitImages
    .filter((u: any) => typeof u === 'string' && u.trim().length > 0)
    .slice(0, 3);

  const outfitReferenceImages = adaptOutfitReferenceImagesForGuestGender(
    filteredOutfitImages,
    effectiveGender
  ).slice(0, 3);

  // Build 2-3 distinct written outfit options to pair with Look 1, Look 2, Look 3
  let outfitOptions: string[] = [];
  if (/Option\s*1\s*[—:-]/i.test(outfitAdvice)) {
    const parts = outfitAdvice
      .split(/Option\s*\d+\s*[—:-]\s*/i)
      .map(s => s.replace(/[;.]\s*$/, '').trim())
      .filter(Boolean);
    // If the first chunk was an intro prefix before Option 1 (e.g. "Effortlessly glamorous holiday hostess:"), drop it
    if (parts.length > 3 || (parts.length >= 3 && parts[0].endsWith(':'))) {
      outfitOptions = parts.slice(1, 4);
    } else {
      outfitOptions = parts.slice(0, 3);
    }
  } else {
    // Strip any leading prefix before a colon (e.g. "Effortlessly glamorous holiday hostess: ...")
    const bodyAfterColon = outfitAdvice.includes(':')
      ? outfitAdvice.split(':').slice(1).join(':').trim()
      : outfitAdvice.trim();
    const orParts = bodyAfterColon
      .split(/\s+or\s+|;\s*/i)
      .map(s => s.replace(/^[,\s]+|[.]+$/g, '').trim())
      .filter(Boolean);
    if (orParts.length >= 2) {
      outfitOptions = orParts.slice(0, 3).map(p => p.charAt(0).toUpperCase() + p.slice(1));
    }
    if (outfitOptions.length < 3) {
      const colorHint = String(profile.color || '').trim();
      const isFem = effectiveGender === 'female';
      const fallbackPool = isFem
        ? [
            `${colorHint ? `${colorHint} ` : ''}Silk or satin midi dress with statement jewelry and heels`,
            `Tailored ${colorHint ? `${colorHint.toLowerCase()} ` : ''}velvet jumpsuit or chic blazer with wide-leg trousers`,
            `Cashmere knit or evening blouse paired with a pleated skirt and bold holiday makeup`,
          ]
        : [
            `Tailored ${colorHint ? `${colorHint.toLowerCase()} ` : ''}velvet or wool dinner blazer over a crisp dress shirt`,
            `Fine merino or cashmere turtleneck layered under a sharp sports jacket with a dress watch`,
            `Smart tailored waistcoat or cardigan with dark trousers and polished dress shoes`,
          ];
      for (const fb of fallbackPool) {
        if (outfitOptions.length >= 3) break;
        if (!outfitOptions.some(existing => existing.toLowerCase() === fb.toLowerCase())) {
          outfitOptions.push(fb);
        }
      }
    }
  }

  return {
    roleTitle,
    displayName,
    guestName,
    gender: charGender,
    effectiveGender,
    isVictim: Boolean(char?.is_victim || char?.plot_role === 'victim'),
    shortBlurb,
    blurbParagraphs,
    outfitAdvice,
    outfitOptions,
    outfitVariants,
    actSummary,
    actBullets,
    secrets,
    characterPhotoUrl,
    outfitReferenceImages,
  };
}
