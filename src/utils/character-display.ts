import {
  getCharacterRoleTitle,
  getCharacterDisplayName,
  hydrateTextWithCharacters,
  replacePlaceholderNamesWithRoles,
} from './hydration';

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
}

function cleanText(text: string | null | undefined, allCharacters: any[], mode: 'generic' | 'print' = 'print'): string {
  if (!text) return '';
  const base =
    mode === 'generic'
      ? replacePlaceholderNamesWithRoles(text, allCharacters)
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
  const roleTitle = getCharacterRoleTitle(char) || 'The Suspect';
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

  // 1. Outfit Advice
  const rawOutfit =
    profile.outfit_description ||
    profile.outfit_advice ||
    activePres?.outfit_advice ||
    presFemale?.outfit_advice ||
    presMale?.outfit_advice ||
    'Dress to match the mystery theme and your character’s personality.';

  const outfitAdvice = cleanText(rawOutfit, allCharacters, mode);

  const femOutfit = presFemale?.outfit_advice
    ? cleanText(presFemale.outfit_advice, allCharacters, mode)
    : undefined;
  const mascOutfit = presMale?.outfit_advice
    ? cleanText(presMale.outfit_advice, allCharacters, mode)
    : undefined;

  const outfitVariants =
    femOutfit && mascOutfit && femOutfit !== mascOutfit
      ? { feminine: femOutfit, masculine: mascOutfit }
      : undefined;

  // 2. How to Act (Summary & Bullets)
  const rawActSummary =
    profile.act_summary ||
    activePres?.act_summary ||
    presFemale?.act_summary ||
    presMale?.act_summary ||
    '';

  const actSummary = cleanText(rawActSummary, allCharacters, mode);

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
    .map(b => cleanText(b, allCharacters, mode))
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
      ? `${roleTitle} commands the spotlight at tonight’s gathering — until a fatal turn sets the mystery in motion.`
      : `A key figure at tonight’s gathering with their own motives, secrets, and alibis to defend.`);

  const cleanedBio = cleanText(rawBio, allCharacters, mode);
  const blurbParagraphs = cleanedBio
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  // Short hook for overview cards: prefer actSummary if concise, otherwise first 1-2 sentences of bio
  const shortSource = actSummary || blurbParagraphs[0] || cleanedBio;
  const sentences = shortSource.match(/[^.!?]+[.!?]+/g) || [shortSource];
  const shortBlurb = sentences.slice(0, 2).join(' ').trim() || shortSource;

  // 4. Secrets
  const secrets = cleanText(profile.secrets || '', allCharacters, mode);

  // 5. Standard Character Photo / Outfit Photo
  const characterPhotoUrl =
    profile.standard_character_photo_url ||
    profile.outfit_image_url ||
    activePres?.outfit_image_url ||
    presFemale?.outfit_image_url ||
    presMale?.outfit_image_url ||
    char?.image_url ||
    null;

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
    outfitVariants,
    actSummary,
    actBullets,
    secrets,
    characterPhotoUrl,
  };
}
