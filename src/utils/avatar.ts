export type AvatarConfig = {
  seed: string;
  top: string;
  hairLength?: string;
  hairTexture?: string;
  hairStyle?: string;
  hairColor: string;
  skinColor: string;
  facialHair?: string;
  eyeColor?: string;
  faceShape?: string;
  height?: string;
  accessories?: string;
  build?: string;
  distinctiveFeatures?: string[];
  likenessNotes?: string;
  accent?: string;
  age?: 'young' | 'middle_aged' | 'old' | string;
  ethnicity?: string;
  aiPhotoUrl?: string;
  aiPhotoSig?: string;
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

/**
 * Computes a normalized physical signature from an AvatarConfig or DiceBear URL
 * so we can detect when any physical attribute has changed and regenerate the AI photo.
 */
export function computeAvatarPhysicalSignature(
  configOrUrl:
    | AvatarConfig
    | {
        gender?: string | null;
        avatar_config?: Partial<AvatarConfig> | Record<string, unknown> | null;
        avatar_url?: string | null;
        eyeColor?: string | null;
        height?: string | null;
        ethnicity?: string | null;
      }
    | string
    | null
    | undefined,
  extra?: {
    gender?: string | null;
    eyeColor?: string | null;
    height?: string | null;
    ethnicity?: string | null;
  }
): string {
  if (!configOrUrl) return '';

  // Support wrapper object shape: { gender, avatar_config, avatar_url }
  if (
    typeof configOrUrl === 'object' &&
    ('avatar_config' in configOrUrl || 'avatar_url' in configOrUrl) &&
    !('skinColor' in configOrUrl)
  ) {
    const mergedExtra = {
      gender: extra?.gender ?? configOrUrl.gender,
      eyeColor: extra?.eyeColor ?? configOrUrl.eyeColor,
      height: extra?.height ?? configOrUrl.height,
      ethnicity: extra?.ethnicity ?? configOrUrl.ethnicity,
    };
    const inner =
      (configOrUrl.avatar_config as AvatarConfig | null | undefined) ??
      configOrUrl.avatar_url;
    return computeAvatarPhysicalSignature(inner, mergedExtra);
  }

  if (typeof configOrUrl === 'string') {
    try {
      const u = new URL(configOrUrl);
      const p = u.searchParams;
      return [
        (extra?.gender || '').toLowerCase(),
        (p.get('age') || 'young').toLowerCase(),
        (extra?.ethnicity || p.get('ethnicity') || '').toLowerCase(),
        (p.get('skinColor') || '').toLowerCase(),
        (p.get('hairColor') || '').toLowerCase(),
        (p.get('hairLength') || '').toLowerCase(),
        (p.get('hairTexture') || '').toLowerCase(),
        (p.get('hairStyle') || '').toLowerCase(),
        (p.get('top') || '').toLowerCase(),
        (extra?.eyeColor || p.get('eyeColor') || '').toLowerCase(),
        (p.get('faceShape') || '').toLowerCase(),
        (p.get('facialHair') || '').toLowerCase(),
        (p.get('build') || '').toLowerCase(),
        (extra?.height || p.get('height') || '').toLowerCase(),
        (p.get('accessories') || '').toLowerCase(),
        (p.get('distinctiveFeatures') || '').toLowerCase(),
        (p.get('likenessNotes') || '').toLowerCase(),
      ].join('|');
    } catch {
      return configOrUrl;
    }
  }

  const c = configOrUrl as Partial<AvatarConfig>;
  const feats = Array.isArray(c.distinctiveFeatures)
    ? [...c.distinctiveFeatures].sort().join(',')
    : '';
  return [
    (extra?.gender || '').toLowerCase(),
    (c.age || 'young').toLowerCase(),
    (extra?.ethnicity || c.ethnicity || '').toLowerCase(),
    (c.skinColor || '').toLowerCase(),
    (c.hairColor || '').toLowerCase(),
    (c.hairLength || '').toLowerCase(),
    (c.hairTexture || '').toLowerCase(),
    (c.hairStyle || '').toLowerCase(),
    (c.top || '').toLowerCase(),
    (extra?.eyeColor || c.eyeColor || '').toLowerCase(),
    (c.faceShape || '').toLowerCase(),
    (c.facialHair || '').toLowerCase(),
    (c.build || '').toLowerCase(),
    (extra?.height || c.height || '').toLowerCase(),
    (c.accessories || '').toLowerCase(),
    feats.toLowerCase(),
    (c.likenessNotes || '').trim().toLowerCase(),
  ].join('|');
}

export function stripAiPhotoFromAvatarUrl(url?: string | null): string {
  if (!url) return '';
  return url
    .replace(/[?&]aiPhotoUrl=[^&]*/g, '')
    .replace(/[?&]aiPhotoHash=[^&]*/g, '')
    .replace(/[?&]aiPhotoSig=[^&]*/g, '');
}

export function buildAvatarUrl(
  config: AvatarConfig | any,
  name?: string,
  options?: { includeAiPhoto?: boolean }
): string | undefined {
  if (!config) return undefined;
  const isBald = config.top === 'none';
  const hasGlasses =
    config.accessories === 'prescription01' ||
    config.distinctiveFeatures?.includes('Glasses');
  const includeAiPhoto = options?.includeAiPhoto !== false;
  const dicebearFacialHair =
    config.facialHair === 'stubbleLight'
      ? 'beardLight'
      : config.facialHair === 'goatee'
        ? 'beardMedium'
        : config.facialHair;

  let url =
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || config.seed || 'player')}` +
    `&eyebrows=default&eyes=default&mouth=smile&clothesColor=262e33&backgroundColor=transparent` +
    `${isBald ? '&topProbability=0' : `&top=${config.top || 'shortFlat'}`}` +
    `&hairColor=${config.hairColor || '282828'}&hatColor=${config.hairColor || '282828'}&skinColor=${config.skinColor || 'ffe0bd'}` +
    `&facialHairProbability=${config.facialHair ? '100' : '0'}${config.facialHair ? `&facialHair=${dicebearFacialHair}&facialHairStyle=${encodeURIComponent(config.facialHair)}&facialHairColor=${config.hairColor || '282828'}` : ''}` +
    `&accessoriesProbability=${hasGlasses ? '100' : '0'}${hasGlasses ? `&accessories=prescription01` : ''}` +
    `${config.build ? `&build=${encodeURIComponent(config.build)}` : ''}` +
    `${config.eyeColor ? `&eyeColor=${encodeURIComponent(config.eyeColor)}` : ''}` +
    `${config.faceShape ? `&faceShape=${encodeURIComponent(config.faceShape)}` : ''}` +
    `${config.height ? `&height=${encodeURIComponent(config.height)}` : ''}` +
    `${config.ethnicity ? `&ethnicity=${encodeURIComponent(config.ethnicity)}` : ''}` +
    `${config.distinctiveFeatures && config.distinctiveFeatures.length > 0 ? `&distinctiveFeatures=${encodeURIComponent(config.distinctiveFeatures.filter((f: string) => f !== 'Glasses').join(','))}` : ''}` +
    `${config.hairLength ? `&hairLength=${encodeURIComponent(config.hairLength)}` : ''}` +
    `${config.hairTexture ? `&hairTexture=${encodeURIComponent(config.hairTexture)}` : ''}` +
    `${config.hairStyle ? `&hairStyle=${encodeURIComponent(config.hairStyle)}` : ''}` +
    `${config.likenessNotes ? `&likenessNotes=${encodeURIComponent(String(config.likenessNotes).trim().slice(0, 300))}` : ''}` +
    `${config.accent ? `&accent=${encodeURIComponent(config.accent)}` : ''}` +
    `${config.age ? `&age=${encodeURIComponent(config.age)}` : ''}`;

  if (includeAiPhoto && config.aiPhotoUrl) {
    url += `&aiPhotoUrl=${encodeURIComponent(config.aiPhotoUrl)}`;
  }

  return url;
}

const LEGACY_CLONE_AVATAR_REPLACEMENTS: Array<{ match: string; replacement: string }> = [
  {
    match: 'f77d09a9-e74f-43c4-8b7b-9f522dfbb91f-4cfdc19783654b536827888c21c53c64',
    replacement: '/generated-avatars/f77d09a9-e74f-43c4-8b7b-9f522dfbb91f-distinct.jpg',
  },
  {
    match: 'f77d09a9-e74f-43c4-8b7b-9f522dfbb91f-e7ccc710ba2d6101b69b2e15e238f50a5',
    replacement: '/generated-avatars/f77d09a9-e74f-43c4-8b7b-9f522dfbb91f-distinct.jpg',
  },
  {
    match: '5d0e09e5-4575-42a8-8713-da6972dfe8b3-f7fa2bd491d9d7943443c7a15be6ab3007ebe170abdc4bae6d80c58d7f105471',
    replacement: '/generated-avatars/5d0e09e5-4575-42a8-8713-da6972dfe8b3-distinct.jpg',
  },
  {
    match: 'e800e385-9f2a-4e02-b937-85c45e63b00d-52c1e1b699baad0c2d50b0c4694fdfde',
    replacement: '/generated-avatars/e800e385-9f2a-4e02-b937-85c45e63b00d-distinct.jpg',
  },
  {
    match: '4903bd39-e54f-42e4-b679-2af5d128bb8f-b130e47b4cee2149a7aad02dfc972e91',
    replacement: '/generated-avatars/4903bd39-e54f-42e4-b679-2af5d128bb8f-host.jpg',
  },
];

export function upgradeLegacyCloneAvatarUrl(guest: {
  id?: string | null;
  name?: string | null;
  avatar_url?: string | null;
}): string {
  const rawUrl = String(guest.avatar_url || '');
  if (!rawUrl) return rawUrl;

  for (const rule of LEGACY_CLONE_AVATAR_REPLACEMENTS) {
    if (rawUrl.includes(rule.match)) {
      try {
        const parsed = new URL(rawUrl);
        parsed.searchParams.set('aiPhotoUrl', rule.replacement);
        return parsed.toString();
      } catch {
        return rule.replacement;
      }
    }
  }

  const cleanName = String(guest.name || '').trim().toLowerCase();
  if (cleanName === 'vic' && !rawUrl.includes('vic-distinct.jpg')) {
    try {
      const parsed = new URL(rawUrl);
      parsed.searchParams.set('aiPhotoUrl', '/generated-avatars/vic-distinct.jpg');
      return parsed.toString();
    } catch {
      return '/generated-avatars/vic-distinct.jpg';
    }
  }

  return rawUrl;
}

/**
 * Extracts the embedded `aiPhotoUrl` query parameter from a DiceBear avatar URL if present,
 * otherwise returns the original avatar URL (rewriting retired 8.x/avataaars to 7.x/avataaars).
 */
export function resolveDisplayAvatarUrl(avatarUrl?: string | null): string {
  if (!avatarUrl) return '';
  for (const rule of LEGACY_CLONE_AVATAR_REPLACEMENTS) {
    if (avatarUrl.includes(rule.match)) {
      return rule.replacement;
    }
  }
  if (avatarUrl.includes('seed=Vic&') && !avatarUrl.includes('vic-distinct.jpg')) {
    return '/generated-avatars/vic-distinct.jpg';
  }
  if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('/')) return avatarUrl;
  try {
    const parsed = new URL(avatarUrl);
    const aiPhoto = parsed.searchParams.get('aiPhotoUrl');
    if (aiPhoto) {
      for (const rule of LEGACY_CLONE_AVATAR_REPLACEMENTS) {
        if (aiPhoto.includes(rule.match)) return rule.replacement;
      }
      return aiPhoto;
    }
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

const DETERMINISTIC_TOPS = [
  'shortFlat',
  'shortWaved',
  'shortCurly',
  'straight01',
  'curly',
  'bob',
  'bun',
  'dreads01',
];

const DETERMINISTIC_HAIR_COLORS = ['282828', '4a312c', '724133', 'b58143', 'd6b370', 'a55728'];
const DETERMINISTIC_SKIN_COLORS = ['ffe0bd', 'ffcd94', 'eac086', 'd08b5b', 'ae5d29'];

/**
 * Resolves a customer or guest profile into a guaranteed display avatar URL:
 * 1. Extracts any embedded `aiPhotoUrl` from `avatar_url` or `avatar_config.aiPhotoUrl`
 * 2. Uses `avatar_url` or builds a DiceBear SVG from `avatar_config`
 * 3. Falls back to a deterministic, attractive DiceBear avatar icon seeded by the user's name/ID
 *    so no row ever falls back to a plain letter circle.
 */
export function getUserDisplayAvatarUrl(user: {
  id?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  avatar_config?: Partial<AvatarConfig> | Record<string, any> | null;
}): string {
  const displayName =
    String(user?.full_name || user?.name || user?.email || user?.id || 'Guest').trim() || 'Guest';

  const configAiPhoto =
    user?.avatar_config && typeof user.avatar_config === 'object'
      ? (user.avatar_config as any).aiPhotoUrl
      : undefined;

  if (typeof configAiPhoto === 'string' && configAiPhoto.trim().length > 0) {
    return resolveDisplayAvatarUrl(configAiPhoto.trim());
  }

  if (user?.avatar_url && String(user.avatar_url).trim().length > 0) {
    const resolved = resolveDisplayAvatarUrl(user.avatar_url);
    if (resolved) return resolved;
  }

  if (
    user?.avatar_config &&
    typeof user.avatar_config === 'object' &&
    Object.keys(user.avatar_config).length > 0
  ) {
    const built = buildAvatarUrl(user.avatar_config, displayName);
    if (built) return resolveDisplayAvatarUrl(built);
  }

  // Deterministic fallback DiceBear avatar so every customer/admin/transaction row has a real avatar icon
  const seedStr = `${displayName}-${user?.id || ''}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const top = DETERMINISTIC_TOPS[hash % DETERMINISTIC_TOPS.length];
  const hairColor = DETERMINISTIC_HAIR_COLORS[(hash >> 3) % DETERMINISTIC_HAIR_COLORS.length];
  const skinColor = DETERMINISTIC_SKIN_COLORS[(hash >> 6) % DETERMINISTIC_SKIN_COLORS.length];

  return (
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seedStr)}` +
    `&eyebrows=default&eyes=default&mouth=smile&clothesColor=262e33&backgroundColor=f1f5f9` +
    `&top=${top}&hairColor=${hairColor}&skinColor=${skinColor}`
  );
}

