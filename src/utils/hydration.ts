export function extractHairColorFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[&?]hairColor=([^&]+)/);
  return match ? match[1] : null;
}

export function extractHairLengthFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[&?]hairLength=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function extractHairTextureFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[&?]hairTexture=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getFriendlyHairColor(hex: string | null): string {
  if (!hex) return '';
  const cleanHex = hex.replace('#', '').toLowerCase();
  const mapping: Record<string, string> = {
    '282828': 'black',
    '4a3123': 'dark brown',
    'a0785a': 'light brown',
    'a55728': 'auburn',
    'c2a67e': 'ash blonde',
    'e8b07d': 'strawberry blonde',
    'd6b370': 'golden blonde',
    'f4f0e6': 'white blonde',
    'd95319': 'orange red',
    'ca4444': 'cherry red',
    'e8e1e1': 'silver / white',
    'f59797': 'pastel pink',
    'e84393': 'hot pink',
    '4b0082': 'indigo',
    '00a8ff': 'bright blue',
    '00b894': 'mint green',
  };
  return mapping[cleanHex] || '';
}

const LEGACY_PLACEHOLDER_TO_ROLE: Record<string, string> = {
  gabby: 'The Reality TV Queen',
  skye: 'The Reality TV Queen',
  sienna: 'The Sister',
  nova: 'The Sister',
  dane: 'The Ex',
  blaze: 'The Ex',
  colt: 'The Bombshell',
  cole: 'The Bombshell',
  milo: 'The Superfan',
  rex: 'The Superfan',
  jeremy: 'The Producer',
  jordan: 'The Producer',
  ava: 'The Runner-Up',
  brooke: 'The Runner-Up',
  zayn: 'The Fan-Favourite Flameout',
  zane: 'The Fan-Favourite Flameout',
  rikki: 'The Hair & Makeup Artist',
  mara: 'The Hair & Makeup Artist',
};

const LEGACY_ROLES_BY_BASE: Record<string, string[]> = {
  gabby: ['The Reality TV Queen', 'The Star'],
  sienna: ['The Sister'],
  dane: ['The Ex'],
  colt: ['The Bombshell', 'The Host'],
  milo: ['The Superfan'],
  jeremy: ['The Producer', 'The Producer Plant'],
  ava: ['The Runner-Up'],
  zayn: ['The Fan-Favourite Flameout'],
  rikki: ['The Hair & Makeup Artist', 'The Stylist', 'The Makeup Artist'],
};

const LEGACY_NICKNAMES_BY_BASE: Record<string, string[]> = {
  gabby: ['Gabby', 'Skye'],
  sienna: ['Sienna', 'Nova'],
  dane: ['Dane', 'Blaze'],
  colt: ['Colt', 'Cole'],
  milo: ['Milo', 'Rex'],
  jeremy: ['Jeremy', 'Jer', 'Jordan'],
  ava: ['Ava', 'Aves', 'Brooke'],
  zayn: ['Zayn', 'Zane'],
  rikki: ['Rikki', 'Rikks', 'Mara'],
};

const IGNORED_PREFIX_LABELS = new Set(['victim', 'suspect', 'innocent', 'killer', 'assistant']);

/**
 * Returns the character's Role / Title (e.g. "The Star", "The Sister", "The Runner-Up").
 * Never returns a fake placeholder person name.
 */
export function getCharacterRoleTitle(char: any): string {
  if (!char) return 'The Suspect';
  const parts = (char.name || '').split('|');
  const rawBase = (parts[0] || '').trim();
  const rawTitle = (parts[1] || '').trim();

  if (rawTitle) {
    return rawTitle;
  }

  if (rawBase) {
    const mapped = LEGACY_PLACEHOLDER_TO_ROLE[rawBase.toLowerCase()];
    if (mapped) return mapped;
    return rawBase;
  }

  return char.is_victim ? 'The Victim' : 'The Suspect';
}

/**
 * Returns the character's optional honorific/prefix (e.g. "Captain", "Dr."),
 * ignoring legacy role tags like "Victim" or "Suspect" that were stored in slot 2.
 */
export function getCharacterPrefix(char: any): string {
  if (!char) return '';
  const parts = (char.name || '').split('|');
  const rawPrefix = (parts[2] || '').trim();
  if (!rawPrefix || IGNORED_PREFIX_LABELS.has(rawPrefix.toLowerCase())) {
    return '';
  }
  return rawPrefix;
}

/**
 * Returns true if a real guest/friend from the user's roster is assigned to this character.
 */
export function hasAssignedGuest(char: any): boolean {
  const profile = char?.profile_data || {};
  const roleTitle = getCharacterRoleTitle(char).toLowerCase();
  const guestName = String(profile.guest_name || profile.name || '').trim();
  if (guestName && guestName.toLowerCase() !== roleTitle) {
    return true;
  }
  return Boolean(profile.guest_id);
}

/**
 * Returns the name to display for a character across the UI and clues:
 * - If a friend/guest is tagged to the character, returns that friend's name (e.g. "Elia", "Scarlett").
 * - If no friend is tagged yet, returns the character's Role / Title (e.g. "The Star", "The Sister") — NEVER a fake name.
 */
export function getCharacterDisplayName(
  char: any,
  options?: { includePrefix?: boolean }
): string {
  if (!char) return 'The Suspect';
  const profile = char.profile_data || {};
  const roleTitle = getCharacterRoleTitle(char);
  const guestName = String(profile.guest_name || profile.name || '').trim();
  const prefix = options?.includePrefix ? getCharacterPrefix(char) : '';

  if (guestName && guestName.toLowerCase() !== roleTitle.toLowerCase()) {
    return prefix ? `${prefix} ${guestName}` : guestName;
  }

  return prefix ? `${prefix} ${roleTitle}` : roleTitle;
}

/**
 * Returns the uppercase initial for a character based on the assigned guest's name
 * (e.g. "P" when Sienna is played by Polly, "G" when Gabby is played by Gabby).
 * If no guest is assigned yet, falls back to the initial of the character's role title (without "The ").
 */
export function getCharacterInitial(char: any): string {
  if (!char) return '?';
  const profile = char.profile_data || {};
  const guestName = String(profile.guest_name || profile.name || '').trim();
  if (guestName) {
    const firstAlpha = guestName.match(/[A-Za-z]/);
    if (firstAlpha) return firstAlpha[0].toUpperCase();
  }
  const roleTitle = getCharacterRoleTitle(char).replace(/^The\s+/i, '').trim();
  const roleAlpha = roleTitle.match(/[A-Za-z]/);
  return roleAlpha ? roleAlpha[0].toUpperCase() : '?';
}

/**
 * Returns dynamic pronouns for a character based on the assigned guest's gender.
 * Defaults to he/him/his/he's when male or unassigned adaptable, and switches to she/her/her/she's when female.
 */
export function getCharacterPronouns(char: any): {
  he: string;
  him: string;
  his: string;
  hes: string;
} {
  const profile = char?.profile_data || {};
  const rawGender = String(profile.gender || char?.gender || '').toLowerCase().trim();
  const isFemale =
    rawGender === 'female' ||
    rawGender === 'feminine' ||
    rawGender === 'f' ||
    rawGender === 'woman' ||
    rawGender.includes('she');

  if (isFemale) {
    return { he: 'she', him: 'her', his: 'her', hes: "she's" };
  }
  return { he: 'he', him: 'him', his: 'his', hes: "he's" };
}

export function extractSkinColorFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[&?]skinColor=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getFriendlySkinColor(hex: string | null): string {
  if (!hex) return '';
  const cleanHex = hex.replace('#', '').toLowerCase();
  const mapping: Record<string, string> = {
    ffe0bd: 'porcelain skin tone',
    ffcd94: 'fair skin tone',
    eac086: 'light skin tone',
    d08b5b: 'olive skin tone',
    ae5d29: 'light brown skin tone',
    '8d5524': 'medium brown skin tone',
    '614335': 'dark brown skin tone',
    '3b2219': 'deep dark skin tone',
  };
  return mapping[cleanHex] || '';
}

export function extractUrlParam(url: string | null | undefined, param: string): string | null {
  if (!url) return null;
  const regex = new RegExp(`[&?]${param}=([^&]+)`);
  const match = url.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getGuestPhysicalDescription(profileData: any, gender: string | null): string {
  if (!profileData) return '';

  const rawEyeColor = profileData.eye_color || profileData.eyeColor || '';
  const eyeColor = rawEyeColor.toLowerCase().includes('hazel')
    ? 'natural hazel (warm light brown and olive green) eyes'
    : rawEyeColor
    ? `${rawEyeColor.toLowerCase()} eyes`
    : '';

  const url = profileData.avatar_url || profileData.avatarUrl || '';
  const hairHex = extractHairColorFromAvatarUrl(url);
  const hairColor = getFriendlyHairColor(hairHex);
  const hairLength = extractHairLengthFromAvatarUrl(url);
  const hairTexture = extractHairTextureFromAvatarUrl(url);
  const topParam = extractUrlParam(url, 'top');

  const skinHex = extractSkinColorFromAvatarUrl(url);
  const skinColor = getFriendlySkinColor(skinHex);
  const ethnicity = (profileData.ethnicity || '').trim();
  const height = (profileData.height || '').trim();
  const build = (extractUrlParam(url, 'build') || profileData.build || '').trim();
  const rawAge = (extractUrlParam(url, 'age') || profileData.age || '').trim().toLowerCase();
  const rawFacialHair = (extractUrlParam(url, 'facialHair') || '').trim();
  const rawAccessories = (extractUrlParam(url, 'accessories') || '').trim();
  const rawDistinctive = (extractUrlParam(url, 'distinctiveFeatures') || '').trim();

  const currentGender = profileData.gender || gender || '';
  const lowerGender = currentGender.toLowerCase();
  const isMasculine =
    lowerGender.includes('masc') || lowerGender === 'male' || lowerGender === 'm';

  const parts: string[] = [];

  if (currentGender) {
    parts.push(lowerGender);
  }
  if (rawAge === 'old' || rawAge === 'mature') {
    parts.push('around 55 years old (mature adult)');
  } else if (rawAge === 'middle_aged' || rawAge === 'adult') {
    parts.push('around 38 years old');
  } else {
    parts.push('around 25 years old');
  }
  if (height && height.toLowerCase() !== 'unspecified') {
    parts.push(`${height.toLowerCase()} height`);
  }
  if (build && build.toLowerCase() !== 'unspecified' && build.toLowerCase() !== 'none') {
    parts.push(`${build.toLowerCase()} build`);
  }
  if (ethnicity && ethnicity.toLowerCase() !== 'unspecified') {
    parts.push(ethnicity);
  }
  if (skinColor) {
    parts.push(skinColor);
  }

  // Hair style, length, texture & color
  if (hairColor) {
    if (hairLength && hairLength !== 'Bald') {
      if (['Hijab', 'Turban', 'Beanie'].includes(hairLength)) {
        parts.push(`${hairColor.toLowerCase()} hair under a ${hairLength.toLowerCase()}`);
      } else {
        const textureStr = hairTexture ? ` ${hairTexture.toLowerCase()}` : ' straight';
        if (isMasculine && hairLength === 'Medium') {
          parts.push(
            `men's medium-length barbershop haircut (cropped above the ears and collar,${textureStr} texture ${hairColor.toLowerCase()} hair, strictly not long hair)`
          );
        } else if (isMasculine && hairLength === 'Short') {
          parts.push(
            `men's short cropped barbershop haircut (neat tapered sides,${textureStr} texture ${hairColor.toLowerCase()} hair)`
          );
        } else if (isMasculine && hairLength === 'Shoulder-Length') {
          parts.push(
            `men's shoulder-length,${textureStr} texture ${hairColor.toLowerCase()} hair`
          );
        } else {
          parts.push(
            `${hairLength.toLowerCase()} length,${textureStr} texture ${hairColor.toLowerCase()} hair`
          );
        }
      }
    } else if (hairLength === 'Bald' || topParam === 'none' || topParam === 'noHair') {
      parts.push('bald / no hair');
    } else if (topParam) {
      const cleanTop = topParam
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .replace(/[0-9]/g, '')
        .trim();
      parts.push(`${cleanTop} ${hairColor.toLowerCase()} hair`);
    } else {
      parts.push(`${hairColor.toLowerCase()} hair`);
    }
  } else if (hairLength === 'Bald' || topParam === 'none' || topParam === 'noHair') {
    parts.push('bald / no hair');
  }

  if (eyeColor) {
    parts.push(eyeColor);
  }

  if (rawFacialHair && rawFacialHair.toLowerCase() !== 'none') {
    const cleanFacialHair = rawFacialHair
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/[0-9]/g, '')
      .trim();
    parts.push(`${cleanFacialHair} facial hair`);
  }

  if (rawAccessories && rawAccessories.toLowerCase() !== 'none') {
    const cleanAcc =
      rawAccessories === 'prescription01' || rawAccessories === 'prescription02'
        ? 'prescription glasses'
        : rawAccessories === 'kurt'
        ? 'thick retro glasses'
        : rawAccessories
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()
            .replace(/[0-9]/g, '')
            .trim();
    parts.push(`wearing ${cleanAcc}`);
  }

  if (rawDistinctive && rawDistinctive.toLowerCase() !== 'none') {
    parts.push(`distinctive features: ${rawDistinctive.toLowerCase()}`);
  }

  return parts.join(', ');
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toHandleSlug(name: string): string {
  const firstPart = (name || '')
    .replace(/^the\s+/i, '')
    .trim()
    .split(/\s+/)[0] || 'star';
  return firstPart.toLowerCase().replace(/[^a-z0-9]/g, '') || 'star';
}

function buildAiReplacementForCharacter(
  char: any,
  displayName: string,
  charToRefIdMap?: Map<string, number>
): string {
  const profile = char.profile_data || {};
  const genderStr = char.gender || profile.gender || '';
  const desc = getGuestPhysicalDescription(profile, genderStr);

  let outfit = profile.outfit_advice || '';
  if (!outfit) {
    const pres =
      (genderStr || '').toLowerCase().includes('female') ||
      (genderStr || '').toLowerCase() === 'f'
        ? profile.presentation_female
        : profile.presentation_male;
    if (pres) {
      outfit = pres.outfit_advice || '';
    }
  }

  let mergedDesc = desc;
  if (outfit) {
    mergedDesc = desc ? `${desc}, styled like: ${outfit}` : `styled like: ${outfit}`;
  }

  const rawBase = (char.name || '').split('|')[0]?.trim();
  const roleTitle = getCharacterRoleTitle(char);
  const refId =
    (rawBase && charToRefIdMap?.get(rawBase)) ||
    (roleTitle && charToRefIdMap?.get(roleTitle));

  if (refId !== undefined) {
    return mergedDesc
      ? `${displayName} (matching subject [${refId}], ${mergedDesc})`
      : `${displayName} (matching subject [${refId}])`;
  }

  return mergedDesc ? `${displayName} (${mergedDesc})` : displayName;
}

export function hydrateTextWithCharacters(
  text: string,
  characters: any[],
  mode: 'print' | 'ai' | 'role',
  charToRefIdMap?: Map<string, number>
): string {
  if (!text) return '';
  let hydrated = text;

  const charList = Array.isArray(characters) ? characters : [];
  if (charList.length === 0) {
    return hydrated.replace(/\{\{([A-Za-z0-9\s'._&-]+)\}\}/g, (_, rawToken) => {
      const token = String(rawToken).trim();
      if (/_initial$/i.test(token)) {
        const base = token.replace(/_initial$/i, '').replace(/^The\s+/i, '').trim();
        return base ? base.charAt(0).toUpperCase() : '?';
      }
      if (/_hes$/.test(token)) return "he's";
      if (/_Hes$/.test(token)) return "He's";
      if (/_he$/.test(token)) return 'he';
      if (/_He$/.test(token)) return 'He';
      if (/_him$/.test(token)) return 'him';
      if (/_Him$/.test(token)) return 'Him';
      if (/_his$/.test(token)) return 'his';
      if (/_His$/.test(token)) return 'His';
      return token;
    });
  }

  // Normalize legacy bracketed initials and hardcoded initial phrases before token replacement
  hydrated = hydrated
    .replace(/^\[Earlier incoming messages:[^\]]*\]\r?\n?/gim, '')
    .replace(/\bJ\s*\[\s*(\{\{[^}]+\}\}|Jeremy)\s*\]\s*:/gi, '$1:')
    .replace(/\bD\s*\[\s*(\{\{[^}]+\}\}|Dane)\s*\]\s*:/gi, '$1:')
    .replace(/\bR\s*\[\s*(\{\{[^}]+\}\}|Rikki)\s*\]\s*:/gi, '$1:')
    .replace(/\bDa-\s*\[\s*(\{\{[^}]+\}\}|Dane)\s*\]/gi, '$1')
    .replace(/\bLittle Heartless G\b/g, 'Little Heartless {{The Star_Initial}}')
    .replace(/(\.{3}\s*)S(\s+would be fully exposed)/g, '$1{{The Sister_Initial}}$2')
    .replace(/\byou know G would hate it\b/g, 'you know {{The Star_Initial}} would hate it')
    .replace(/\bcould u G\b/g, 'could u {{The Star_Initial}}')
    .replace(/\bTry Get G to talk\b/g, 'Try Get {{The Star_Initial}} to talk')
    .replace(/\bA spiralling\.\s*re:\s*G\s*&\s*C\b/g, '{{The Runner-Up_Initial}} spiralling. re: {{The Star_Initial}} & {{The Host_Initial}}')
    .replace(/\bC and G were in closet\b/g, '{{The Host_Initial}} and {{The Star_Initial}} were in closet')
    .replace(/\bM still hovering\b/g, '{{The Superfan_Initial}} still hovering')
    .replace(/\bPretty sure D used it\b/g, 'Pretty sure {{The Ex_Initial}} used it')
    .replace(/\bmuttering stuff about C\b/g, 'muttering stuff about {{The Host_Initial}}')
    .replace(/(Just don't put it on me\.\r?\n-\s*)R("?)/g, '$1{{The Hair & Makeup Artist_Initial}}$2')
    .replace(/(Wish me luck\r?\n-\s*)G("?)/g, '$1{{The Star_Initial}}$2');

  // Map all aliases (roleTitle, legacy baseName, nicknames) -> substitution value
  const tokenMap = new Map<string, string>();
  const wordAliasMap = new Map<string, string>();
  const handleMap = new Map<string, string>();

  charList.forEach((char) => {
    const parts = (char.name || '').split('|');
    const rawBase = (parts[0] || '').trim();
    const roleTitle = getCharacterRoleTitle(char);
    const roleTitleWithoutThe = roleTitle.replace(/^The\s+/i, '').trim();
    const roleAlpha = roleTitleWithoutThe.match(/[A-Za-z]/);
    const roleInitial = roleAlpha ? roleAlpha[0].toUpperCase() : '?';

    const displayName = mode === 'role' ? roleTitle : getCharacterDisplayName(char);
    const charInitial = mode === 'role' ? roleInitial : getCharacterInitial(char);
    const pronouns = getCharacterPronouns(char);
    const guestName = String(char.profile_data?.guest_name || char.profile_data?.name || '').trim();

    const substitution =
      mode === 'ai'
        ? buildAiReplacementForCharacter(char, displayName, charToRefIdMap)
        : displayName;

    const candidateKeys = new Set<string>();
    const fullRoleTitlesForChar = new Set<string>();
    if (roleTitle) {
      candidateKeys.add(roleTitle);
      fullRoleTitlesForChar.add(roleTitle);
    }
    if (roleTitleWithoutThe && roleTitleWithoutThe.length > 2) {
      candidateKeys.add(roleTitleWithoutThe);
    }
    if (rawBase) {
      candidateKeys.add(rawBase);
      const extraNicknames = LEGACY_NICKNAMES_BY_BASE[rawBase.toLowerCase()] || [];
      extraNicknames.forEach((nick) => candidateKeys.add(nick));
    }
    if (guestName && guestName.length >= 2) {
      candidateKeys.add(guestName);
    }

    // Match if the character's role title matches any of our known DOA roles
    Object.entries(LEGACY_PLACEHOLDER_TO_ROLE).forEach(([legacyKey, mappedRole]) => {
      if (mappedRole.toLowerCase() === roleTitle.toLowerCase()) {
        candidateKeys.add(legacyKey);
        fullRoleTitlesForChar.add(mappedRole);
        const extraNicks = LEGACY_NICKNAMES_BY_BASE[legacyKey] || [];
        extraNicks.forEach((nick) => candidateKeys.add(nick));
      }
    });
    Object.entries(LEGACY_ROLES_BY_BASE).forEach(([baseKey, roleList]) => {
      if (roleList.some((r) => r.toLowerCase() === roleTitle.toLowerCase())) {
        candidateKeys.add(baseKey);
        roleList.forEach((r) => {
          candidateKeys.add(r);
          fullRoleTitlesForChar.add(r);
        });
        const extraNicks = LEGACY_NICKNAMES_BY_BASE[baseKey] || [];
        extraNicks.forEach((nick) => candidateKeys.add(nick));
      }
    });

    candidateKeys.forEach((key) => {
      const lower = key.toLowerCase();
      tokenMap.set(lower, substitution);
      tokenMap.set(`${lower}_initial`, charInitial);
      tokenMap.set(`${lower} initial`, charInitial);
      tokenMap.set(`${lower}_he`, pronouns.he);
      tokenMap.set(`${lower}_him`, pronouns.him);
      tokenMap.set(`${lower}_his`, pronouns.his);
      tokenMap.set(`${lower}_hes`, pronouns.hes);
      handleMap.set(lower, toHandleSlug(displayName));

      // Register single-word or legacy placeholder names for unwrapped word-boundary replacement
      const isLegacyName =
        Boolean(LEGACY_PLACEHOLDER_TO_ROLE[lower]) ||
        Object.values(LEGACY_NICKNAMES_BY_BASE).some((arr) =>
          arr.some((n) => n.toLowerCase() === lower)
        ) ||
        (rawBase &&
          lower === rawBase.toLowerCase() &&
          lower !== roleTitle.toLowerCase());

      if (isLegacyName) {
        wordAliasMap.set(lower, displayName);
      }
    });

    if (mode === 'role') {
      // In 'role' mode, replace any assigned guest name or alternate role title with the canonical roleTitle
      if (guestName && guestName.length >= 2 && guestName.toLowerCase() !== roleTitle.toLowerCase()) {
        wordAliasMap.set(guestName.toLowerCase(), roleTitle);
      }
      fullRoleTitlesForChar.forEach((rt) => {
        if (rt.toLowerCase().startsWith('the ')) {
          wordAliasMap.set(rt.toLowerCase(), roleTitle);
        }
      });
    } else if (mode === 'print') {
      // In 'print' mode (Customer Reveal, Print Outs, Playroom), replace unwrapped Role Titles ("The Star", "The Superfan", etc.) with the customer's guest name
      fullRoleTitlesForChar.forEach((rt) => {
        if (rt.toLowerCase().startsWith('the ')) {
          wordAliasMap.set(rt.toLowerCase(), displayName);
        }
      });
    }
  });

  // Generic role tokens ({{VICTIM}}, {{KILLER}}, {{ASSISTANT}})
  const victim = charList.find((c) => c.is_victim);
  const killer = charList.find((c) => c.plot_role === 'killer');
  const assistant = charList.find((c) => c.plot_role === 'assistant');

  const getRoleInitial = (c: any) => {
    const rt = getCharacterRoleTitle(c).replace(/^The\s+/i, '').trim();
    const alpha = rt.match(/[A-Za-z]/);
    return alpha ? alpha[0].toUpperCase() : '?';
  };

  if (victim) {
    const disp = mode === 'role' ? getCharacterRoleTitle(victim) : getCharacterDisplayName(victim);
    const sub =
      mode === 'ai'
        ? buildAiReplacementForCharacter(victim, disp, charToRefIdMap)
        : disp;
    tokenMap.set('victim', sub);
    tokenMap.set('the victim', sub);
    tokenMap.set('victim_initial', mode === 'role' ? getRoleInitial(victim) : getCharacterInitial(victim));
    handleMap.set('victim', toHandleSlug(disp));
  }
  if (killer) {
    const disp = mode === 'role' ? getCharacterRoleTitle(killer) : getCharacterDisplayName(killer);
    const sub =
      mode === 'ai'
        ? buildAiReplacementForCharacter(killer, disp, charToRefIdMap)
        : disp;
    tokenMap.set('killer', sub);
    tokenMap.set('the killer', sub);
    tokenMap.set('killer_initial', mode === 'role' ? getRoleInitial(killer) : getCharacterInitial(killer));
  }
  if (assistant) {
    const disp = mode === 'role' ? getCharacterRoleTitle(assistant) : getCharacterDisplayName(assistant);
    const sub =
      mode === 'ai'
        ? buildAiReplacementForCharacter(assistant, disp, charToRefIdMap)
        : disp;
    tokenMap.set('assistant', sub);
    tokenMap.set('the accomplice', sub);
    tokenMap.set('assistant_initial', mode === 'role' ? getRoleInitial(assistant) : getCharacterInitial(assistant));
  }

  // 1. Hydrate @handles and emails that embed a character token or legacy name (e.g. @gabby4ever_edits, @{{Gabby}}4ever_edits, jeremy.p@lotv.tv)
  hydrated = hydrated.replace(
    /@\{\{\s*([^}]+?)\s*\}\}4ever_edits/gi,
    (_, key) => {
      const slug = handleMap.get(String(key).trim().toLowerCase()) || 'star';
      return `@${slug}4ever_edits`;
    }
  );
  if (handleMap.has('gabby')) {
    hydrated = hydrated.replace(
      /@(?:gabby|star)4ever_edits/gi,
      `@${handleMap.get('gabby')}4ever_edits`
    );
  }
  if (handleMap.has('jeremy')) {
    hydrated = hydrated.replace(
      /\bjeremy\.p@lotv\.tv\b/gi,
      `${handleMap.get('jeremy')}@lotv.tv`
    );
  }

  // 2. Hydrate all explicit {{Token}} occurrences in a single pass
  hydrated = hydrated.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (fullMatch, inner) => {
    const cleanInner = String(inner).trim();
    const lower = cleanInner.toLowerCase();
    if (tokenMap.has(lower)) {
      const val = tokenMap.get(lower)!;
      if (/_(?:He|Him|His|Hes)$/.test(cleanInner) && val.length > 0) {
        return val.charAt(0).toUpperCase() + val.slice(1);
      }
      return val;
    }
    return cleanInner;
  });

  // 3. In 'print' or 'role' mode, also replace unwrapped aliases in a single pass
  if ((mode === 'print' || mode === 'role') && wordAliasMap.size > 0) {
    const sortedAliases = Array.from(wordAliasMap.keys()).sort(
      (a, b) => b.length - a.length
    );
    const pattern = new RegExp(
      `\\b(${sortedAliases.map(escapeRegExp).join('|')})\\b`,
      'gi'
    );
    hydrated = hydrated.replace(pattern, (matchedWord) => {
      const replacement = wordAliasMap.get(matchedWord.toLowerCase());
      return replacement || matchedWord;
    });
  }

  return hydrated;
}

/**
 * Converts any character role titles, legacy placeholder names, or assigned guest names
 * in a text string into canonical `{{Role Title}}` tokens for storage in the database.
 */
export function tokenizeTextWithCharacterRoles(
  text: string | null | undefined,
  characters: any[]
): string {
  if (!text) return '';
  const charList = Array.isArray(characters) ? characters : [];
  if (charList.length === 0) return text;

  // Build alias-to-roleTitle map so suffix tokens like {{Dane_Initial}} become {{The Ex_Initial}}
  const aliasToRole = new Map<string, string>();
  charList.forEach((char) => {
    const roleTitle = getCharacterRoleTitle(char);
    if (!roleTitle) return;
    getCharacterCandidateKeys(char).forEach((k) => {
      aliasToRole.set(k.toLowerCase(), roleTitle);
    });
  });

  // Protect suffix tokens (e.g. {{The Ex_Initial}}, {{Dane_Initial}}, {{Gabby_his}}) before hydration
  const savedSuffixTokens: string[] = [];
  const protectedText = text.replace(
    /\{\{\s*([^}]+?)(?:_|\s+)(Initial|he|him|his|hes)\s*\}\}/gi,
    (_, rawBase, suffix) => {
      const cleanBase = String(rawBase).trim();
      const canonicalRole = aliasToRole.get(cleanBase.toLowerCase()) || cleanBase;
      const idx = savedSuffixTokens.length;
      savedSuffixTokens.push(`{{${canonicalRole}_${suffix}}}`);
      return `___SUFFIX_TOKEN_${idx}___`;
    }
  );

  // 1. Normalize all tokens, legacy names, and guest names into unwrapped canonical Role Titles
  let normalized = hydrateTextWithCharacters(protectedText, charList, 'role');

  // 2. Wrap canonical Role Titles into {{Role Title}} tokens (longest role titles first)
  const roleMap = new Map<string, string>();
  charList.forEach((char) => {
    const roleTitle = getCharacterRoleTitle(char);
    if (roleTitle) {
      roleMap.set(roleTitle.toLowerCase(), roleTitle);
    }
  });

  if (roleMap.size > 0) {
    const sortedRoles = Array.from(roleMap.keys()).sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`\\b(${sortedRoles.map(escapeRegExp).join('|')})\\b`, 'gi');
    normalized = normalized.replace(pattern, (matched) => {
      const canonical = roleMap.get(matched.toLowerCase()) || matched;
      return `{{${canonical}}}`;
    });
  }

  // 3. Restore protected suffix tokens
  normalized = normalized.replace(/___SUFFIX_TOKEN_(\d+)___/g, (_, idxStr) => {
    const idx = Number(idxStr);
    return savedSuffixTokens[idx] || '';
  });

  return normalized;
}

/**
 * Returns all candidate aliases for a character (roleTitle, roleTitle without 'The ',
 * assigned guest name, legacy base name, and legacy nicknames).
 */
export function getCharacterCandidateKeys(char: any): string[] {
  if (!char) return [];
  const parts = (char.name || '').split('|');
  const rawBase = (parts[0] || '').trim();
  const roleTitle = getCharacterRoleTitle(char);
  const roleTitleWithoutThe = roleTitle.replace(/^The\s+/i, '').trim();
  const profile = char.profile_data || {};
  const guestName = String(profile.guest_name || profile.name || '').trim();

  const keys = new Set<string>();
  if (roleTitle) keys.add(roleTitle);
  if (roleTitleWithoutThe && roleTitleWithoutThe.length >= 3) {
    keys.add(roleTitleWithoutThe);
  }
  if (rawBase && rawBase.length >= 2) {
    keys.add(rawBase);
    const extraNicknames = LEGACY_NICKNAMES_BY_BASE[rawBase.toLowerCase()] || [];
    extraNicknames.forEach((nick) => keys.add(nick));
  }
  if (guestName && guestName.length >= 2) {
    keys.add(guestName);
  }

  Object.entries(LEGACY_PLACEHOLDER_TO_ROLE).forEach(([legacyKey, mappedRole]) => {
    if (mappedRole.toLowerCase() === roleTitle.toLowerCase()) {
      keys.add(legacyKey);
      const extraNicks = LEGACY_NICKNAMES_BY_BASE[legacyKey] || [];
      extraNicks.forEach((nick) => keys.add(nick));
    }
  });
  Object.entries(LEGACY_ROLES_BY_BASE).forEach(([baseKey, roleList]) => {
    if (roleList.some((r) => r.toLowerCase() === roleTitle.toLowerCase())) {
      keys.add(baseKey);
      const extraNicks = LEGACY_NICKNAMES_BY_BASE[baseKey] || [];
      extraNicks.forEach((nick) => keys.add(nick));
    }
  });

  // Sort longest first so multi-word roles like "The Producer Plant" match before "The Producer"
  return Array.from(keys).sort((a, b) => b.length - a.length);
}

/**
 * Finds all characters referenced inside a given text string (prompt, title, or description),
 * supporting {{Role Title}}, {{VICTIM}}, {{KILLER}}, {{ASSISTANT}}, unwrapped role titles,
 * assigned guest names, and legacy placeholder names.
 */
export function findInvolvedCharactersInText(text: string, characters: any[]): any[] {
  if (!text || !Array.isArray(characters) || characters.length === 0) return [];
  const found: any[] = [];
  const seenIds = new Set<string>();

  const addChar = (c: any) => {
    if (!c) return;
    const key = c.id || c.name;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      found.push(c);
    }
  };

  // 1. Check explicit {{VICTIM}}, {{KILLER}}, {{ASSISTANT}} tokens
  if (/\{\{\s*(?:the\s+)?victim\s*\}\}/i.test(text)) {
    const victim = characters.find((c) => c.is_victim || c.plot_role === 'victim');
    if (victim) addChar(victim);
  }
  if (/\{\{\s*(?:the\s+)?killer\s*\}\}/i.test(text)) {
    const killer = characters.find((c) => c.plot_role === 'killer');
    if (killer) addChar(killer);
  }
  if (/\{\{\s*(?:the\s+)?(?:assistant|accomplice)\s*\}\}/i.test(text)) {
    const assistant = characters.find((c) => c.plot_role === 'assistant');
    if (assistant) addChar(assistant);
  }

  // 2. Check all character aliases (both inside {{...}} and as word-bounded phrases)
  for (const char of characters) {
    const aliases = getCharacterCandidateKeys(char);
    for (const alias of aliases) {
      const escaped = escapeRegExp(alias);
      const tokenRegex = new RegExp(`\\{\\{\\s*${escaped}(?:_[a-zA-Z]+)?\\s*\\}\\}`, 'i');
      const wordRegex = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?=$|[^a-zA-Z0-9])`, 'i');
      if (tokenRegex.test(text) || wordRegex.test(text)) {
        addChar(char);
        break;
      }
    }
  }

  return found;
}

export function replacePlaceholderNamesWithRoles(
  text: string | null | undefined,
  characters: any[]
): string {
  if (!text) return '';
  let result = text;

  (characters || []).forEach((char: any) => {
    const parts = (char.name || '').split('|');
    const baseName = (parts[0] || '').trim();
    const roleTitle = getCharacterRoleTitle(char);
    const guestName = ((char.profile_data as any)?.guest_name || (char.profile_data as any)?.name || '').trim();

    if (baseName) {
      const tokenRegex = new RegExp(`\\{\\{\\s*${escapeRegExp(baseName)}\\s*\\}\\}`, 'gi');
      result = result.replace(tokenRegex, roleTitle);

      const wordRegex = new RegExp(`\\b${escapeRegExp(baseName)}\\b`, 'g');
      result = result.replace(wordRegex, roleTitle);
    }

    if (guestName && guestName.toLowerCase() !== roleTitle.toLowerCase()) {
      const guestRegex = new RegExp(`\\b${escapeRegExp(guestName)}\\b`, 'gi');
      result = result.replace(guestRegex, roleTitle);
    }
  });

  result = result.replace(/\{\{([A-Za-z0-9\s'._&-]+)\}\}/g, '$1');
  return result;
}


