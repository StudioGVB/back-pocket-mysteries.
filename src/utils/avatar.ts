export type AvatarConfig = {
  seed: string;
  top: string;
  hairLength?: string;
  hairTexture?: string;
  hairColor: string;
  skinColor: string;
  facialHair?: string;
  eyeColor?: string;
  height?: string;
  accessories?: string;
  build?: string;
  distinctiveFeatures?: string[];
  accent?: string;
  age?: 'young' | 'middle_aged' | 'old' | string;
};

export const GUEST_ACCENT_OPTIONS = [
  { value: 'Australian', label: '🇦🇺 Australian', shortLabel: '🇦🇺 AU', region: 'en-AU' },
  { value: 'British', label: '🇬🇧 British (UK)', shortLabel: '🇬🇧 UK', region: 'en-GB' },
  { value: 'American', label: '🇺🇸 American (US)', shortLabel: '🇺🇸 US', region: 'en-US' },
  { value: 'New Zealand', label: '🇳🇿 Kiwi / NZ', shortLabel: '🇳🇿 NZ', region: 'en-AU' },
  { value: 'Irish / Scottish', label: '🇮🇪 Irish / Scottish', shortLabel: '🇮🇪 IE/UK', region: 'en-GB' },
  { value: 'European', label: '🇪🇺 European', shortLabel: '🇪🇺 EU', region: 'en-GB' },
] as const;

export const GUEST_AGE_OPTIONS = [
  { value: 'young', label: 'Young Adult (18–30)', shortLabel: 'Young' },
  { value: 'middle_aged', label: 'Adult (30–50)', shortLabel: 'Adult' },
  { value: 'old', label: 'Mature (50+)', shortLabel: 'Mature' },
] as const;

export function extractAccentFromAvatarUrl(url?: string | null): string | undefined {
  if (!url || url.startsWith('data:')) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('accent') || undefined;
  } catch {
    const match = url.match(/[?&]accent=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }
}

export function extractAgeFromAvatarUrl(url?: string | null): 'young' | 'middle_aged' | 'old' | undefined {
  if (!url || url.startsWith('data:')) return undefined;
  let raw: string | undefined;
  try {
    const parsed = new URL(url);
    raw = parsed.searchParams.get('age') || undefined;
  } catch {
    const match = url.match(/[?&]age=([^&]+)/);
    raw = match ? decodeURIComponent(match[1]) : undefined;
  }
  if (raw === 'young' || raw === 'middle_aged' || raw === 'old') return raw;
  return undefined;
}

export function buildAvatarUrl(config: AvatarConfig | any, name?: string): string | undefined {
  if (!config) return undefined;
  const isBald = config.top === 'none';
  const hasGlasses = config.distinctiveFeatures?.includes('Glasses');
  
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || config.seed)}` +
    `&eyebrows=default&eyes=default&mouth=smile&clothesColor=262e33&backgroundColor=transparent` +
    `${isBald ? '&topProbability=0' : `&top=${config.top}`}` +
    `&hairColor=${config.hairColor}&hatColor=${config.hairColor}&skinColor=${config.skinColor}` +
    `&facialHairProbability=${config.facialHair ? '100' : '0'}${config.facialHair ? `&facialHair=${config.facialHair}&facialHairColor=${config.hairColor}` : ''}` +
    `&accessoriesProbability=${hasGlasses ? '100' : '0'}${hasGlasses ? `&accessories=prescription01` : ''}` +
    `${config.build ? `&build=${encodeURIComponent(config.build)}` : ''}` +
    `${config.distinctiveFeatures && config.distinctiveFeatures.length > 0 ? `&distinctiveFeatures=${encodeURIComponent(config.distinctiveFeatures.filter((f: string) => f !== 'Glasses').join(','))}` : ''}` +
    `${config.hairLength ? `&hairLength=${encodeURIComponent(config.hairLength)}` : ''}` +
    `${config.hairTexture ? `&hairTexture=${encodeURIComponent(config.hairTexture)}` : ''}` +
    `${config.accent ? `&accent=${encodeURIComponent(config.accent)}` : ''}` +
    `${config.age ? `&age=${encodeURIComponent(config.age)}` : ''}`;
}

/**
 * Extracts the embedded `aiPhotoUrl` query parameter from a DiceBear avatar URL if present,
 * otherwise returns the original avatar URL (rewriting retired 8.x/avataaars to 7.x/avataaars).
 */
export function resolveDisplayAvatarUrl(avatarUrl?: string | null): string {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('/')) return avatarUrl;
  try {
    const parsed = new URL(avatarUrl);
    const aiPhoto = parsed.searchParams.get('aiPhotoUrl');
    if (aiPhoto) return aiPhoto;
  } catch {
    if (avatarUrl.includes('aiPhotoUrl=')) {
      const match = avatarUrl.match(/[?&]aiPhotoUrl=([^&]+)/);
      if (match && match[1]) {
        try {
          return decodeURIComponent(match[1]);
        } catch {
          return match[1];
        }
      }
    }
  }
  return avatarUrl.replace('api.dicebear.com/8.x/avataaars', 'api.dicebear.com/7.x/avataaars');
}


