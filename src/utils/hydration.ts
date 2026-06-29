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
    '00b894': 'mint green'
  };
  return mapping[cleanHex] || '';
}

export function getGuestPhysicalDescription(profileData: any, gender: string | null): string {
  if (!profileData) return '';
  
  const eyeColor = profileData.eye_color || profileData.eyeColor;
  const url = profileData.avatar_url || profileData.avatarUrl;
  const hairHex = extractHairColorFromAvatarUrl(url);
  const hairColor = getFriendlyHairColor(hairHex);
  const hairLength = extractHairLengthFromAvatarUrl(url);
  const hairTexture = extractHairTextureFromAvatarUrl(url);
  const currentGender = profileData.gender || gender;

  const parts: string[] = [];
  
  if (hairColor) {
    if (hairLength && hairLength !== 'Bald') {
      if (['Hijab', 'Turban', 'Beanie'].includes(hairLength)) {
        parts.push(`${hairColor.toLowerCase()} hair under a ${hairLength.toLowerCase()}`);
      } else {
        const textureStr = hairTexture ? ` ${hairTexture.toLowerCase()}` : ' straight';
        parts.push(`${hairLength.toLowerCase()} length,${textureStr} texture ${hairColor.toLowerCase()} hair`);
      }
    } else if (hairLength === 'Bald') {
      parts.push('bald / no hair');
    } else {
      parts.push(`${hairColor} hair`);
    }
  } else if (hairLength === 'Bald') {
    parts.push('bald / no hair');
  }

  if (eyeColor) parts.push(`${eyeColor.toLowerCase()} eyes`);
  if (currentGender) parts.push(currentGender.toLowerCase());

  return parts.join(', ');
}

export function hydrateTextWithCharacters(
  text: string,
  characters: any[],
  mode: 'print' | 'ai',
  charToRefIdMap?: Map<string, number>
): string {
  if (!text) return '';
  let hydrated = text;

  // Hydrate exact character tokens (like {{Dane}} or {{Gabby}})
  characters.forEach(char => {
    const rawName = char.name || '';
    const cleanName = rawName.split('|')[0]?.trim();
    if (!cleanName) return;

    const tokenRegex = new RegExp(`{{${cleanName}}}`, 'gi');
    
    // Determine the substitution value
    const profile = char.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
    const genderStr = char.gender || profile.gender || '';

    if (mode === 'print') {
      // For printable clue cards, replace with guest's name (e.g. "Luke")
      hydrated = hydrated.replace(tokenRegex, guestName);
    } else {
      // For AI image generation prompts, replace with descriptive text
      const desc = getGuestPhysicalDescription(profile, genderStr);
      
      // Retrieve the themed character's outfit advice from profile_data
      let outfit = profile.outfit_advice || '';
      if (!outfit) {
        const pres = (genderStr || '').toLowerCase().includes('female') || (genderStr || '').toLowerCase() === 'f'
          ? profile.presentation_female 
          : profile.presentation_male;
        if (pres) {
          outfit = pres.outfit_advice || '';
        }
      }

      // Merge physical traits and outfit advice
      let mergedDesc = desc;
      if (outfit) {
        mergedDesc = desc ? `${desc}, styled like: ${outfit}` : `styled like: ${outfit}`;
      }

      let replacement = mergedDesc ? `${guestName} (${mergedDesc})` : guestName;
      if (charToRefIdMap && charToRefIdMap.has(cleanName)) {
        const refId = charToRefIdMap.get(cleanName);
        replacement = mergedDesc 
          ? `${guestName} (matching subject [${refId}], ${mergedDesc})`
          : `${guestName} (matching subject [${refId}])`;
      }
      hydrated = hydrated.replace(tokenRegex, replacement);
    }
  });

  // Hydrate generic tokens for backwards compatibility
  const victim = characters.find(c => c.is_victim);
  const killer = characters.find(c => c.plot_role === 'killer');

  if (victim) {
    const rawName = victim.name || '';
    const cleanName = rawName.split('|')[0]?.trim();
    const profile = victim.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
    const genderStr = victim.gender || profile.gender || '';
    
    const victimRegex = /{{VICTIM}}/g;
    if (mode === 'print') {
      hydrated = hydrated.replace(victimRegex, guestName);
    } else {
      const desc = getGuestPhysicalDescription(profile, genderStr);
      let outfit = profile.outfit_advice || '';
      if (!outfit) {
        const pres = (genderStr || '').toLowerCase().includes('female') || (genderStr || '').toLowerCase() === 'f'
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
      const replacement = mergedDesc ? `${guestName} (${mergedDesc})` : guestName;
      hydrated = hydrated.replace(victimRegex, replacement);
    }
  }

  if (killer) {
    const rawName = killer.name || '';
    const cleanName = rawName.split('|')[0]?.trim();
    const profile = killer.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
    const genderStr = killer.gender || profile.gender || '';
    
    const killerRegex = /{{KILLER}}/g;
    if (mode === 'print') {
      hydrated = hydrated.replace(killerRegex, guestName);
    } else {
      const desc = getGuestPhysicalDescription(profile, genderStr);
      let outfit = profile.outfit_advice || '';
      if (!outfit) {
        const pres = (genderStr || '').toLowerCase().includes('female') || (genderStr || '').toLowerCase() === 'f'
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
      const replacement = mergedDesc ? `${guestName} (${mergedDesc})` : guestName;
      hydrated = hydrated.replace(killerRegex, replacement);
    }
  }

  return hydrated;
}
