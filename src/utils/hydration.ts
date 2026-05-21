export function extractHairColorFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[&?]hairColor=([^&]+)/);
  return match ? match[1] : null;
}

export function getFriendlyHairColor(hex: string | null): string {
  if (!hex) return '';
  const cleanHex = hex.replace('#', '').toLowerCase();
  const mapping: Record<string, string> = {
    '282828': 'black',
    '4a3123': 'brown',
    'a55728': 'auburn/red',
    'd6b370': 'blonde',
    'f59797': 'pink',
    'e8e1e1': 'silver/white',
    'ca4444': 'red',
    '4b0082': 'purple',
    '00a8ff': 'blue',
    'e84393': 'pink',
    '00b894': 'green'
  };
  return mapping[cleanHex] || '';
}

export function getGuestPhysicalDescription(profileData: any, gender: string | null): string {
  if (!profileData) return '';
  
  const eyeColor = profileData.eye_color || profileData.eyeColor;
  const hairHex = extractHairColorFromAvatarUrl(profileData.avatar_url || profileData.avatarUrl);
  const hairColor = getFriendlyHairColor(hairHex);
  const currentGender = profileData.gender || gender;

  const parts: string[] = [];
  if (hairColor) parts.push(`${hairColor} hair`);
  if (eyeColor) parts.push(`${eyeColor.toLowerCase()} eyes`);
  if (currentGender) parts.push(currentGender.toLowerCase());

  return parts.join(', ');
}

export function hydrateTextWithCharacters(
  text: string,
  characters: any[],
  mode: 'print' | 'ai'
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
      const replacement = desc ? `${guestName} (${desc})` : guestName;
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
      const replacement = desc ? `${guestName} (${desc})` : guestName;
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
      const replacement = desc ? `${guestName} (${desc})` : guestName;
      hydrated = hydrated.replace(killerRegex, replacement);
    }
  }

  return hydrated;
}
