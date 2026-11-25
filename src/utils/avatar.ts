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
      const rawFeats = (p.get('distinctiveFeatures') || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const hasGlassesParam =
        p.get('accessories') === 'prescription01' ||
        rawFeats.some(f => f.toLowerCase() === 'glasses');
      const normalizedFeats = rawFeats
        .filter(f => f.toLowerCase() !== 'glasses')
        .map(f => f.toLowerCase())
        .sort()
        .join(',');
      const rawTop = (p.get('top') || '').toLowerCase();
      const normalizedTop =
        rawTop === 'none' ||
        p.get('topProbability') === '0' ||
        (p.get('hairLength') || '').toLowerCase() === 'bald'
          ? 'none'
          : rawTop;
      return [
        (extra?.gender || '').toLowerCase(),
        (p.get('age') || 'young').toLowerCase(),
        (extra?.ethnicity || p.get('ethnicity') || '').toLowerCase(),
        (p.get('skinColor') || '').toLowerCase(),
        (p.get('hairColor') || '').toLowerCase(),
        (p.get('hairLength') || '').toLowerCase(),
        (p.get('hairTexture') || '').toLowerCase(),
        (p.get('hairStyle') || '').toLowerCase(),
        normalizedTop,
        (extra?.eyeColor || p.get('eyeColor') || '').toLowerCase(),
        (p.get('faceShape') || '').toLowerCase(),
        (p.get('facialHairStyle') || p.get('facialHair') || '').toLowerCase(),
        (p.get('build') || '').toLowerCase(),
        (extra?.height || p.get('height') || '').toLowerCase(),
        hasGlassesParam ? 'prescription01' : '',
        normalizedFeats,
        (p.get('likenessNotes') || '').trim().toLowerCase(),
      ].join('|');
    } catch {
      return configOrUrl;
    }
  }

  const c = configOrUrl as Partial<AvatarConfig>;
  const rawObjFeats = Array.isArray(c.distinctiveFeatures)
    ? c.distinctiveFeatures.map(f => String(f).trim()).filter(Boolean)
    : [];
  const hasGlassesObj =
    c.accessories === 'prescription01' ||
    rawObjFeats.some(f => f.toLowerCase() === 'glasses');
  const normalizedObjFeats = rawObjFeats
    .filter(f => f.toLowerCase() !== 'glasses')
    .map(f => f.toLowerCase())
    .sort()
    .join(',');
  const rawObjTop = (c.top || '').toLowerCase();
  const normalizedObjTop =
    rawObjTop === 'none' || (c.hairLength || '').toLowerCase() === 'bald'
      ? 'none'
      : rawObjTop;
  return [
    (extra?.gender || '').toLowerCase(),
    (c.age || 'young').toLowerCase(),
    (extra?.ethnicity || c.ethnicity || '').toLowerCase(),
    (c.skinColor || '').toLowerCase(),
    (c.hairColor || '').toLowerCase(),
    (c.hairLength || '').toLowerCase(),
    (c.hairTexture || '').toLowerCase(),
    (c.hairStyle || '').toLowerCase(),
    normalizedObjTop,
    (extra?.eyeColor || c.eyeColor || '').toLowerCase(),
    (c.faceShape || '').toLowerCase(),
    (c.facialHair || '').toLowerCase(),
    (c.build || '').toLowerCase(),
    (extra?.height || c.height || '').toLowerCase(),
    hasGlassesObj ? 'prescription01' : '',
    normalizedObjFeats,
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

  const cleanFeats = Array.isArray(config.distinctiveFeatures)
    ? [...config.distinctiveFeatures]
        .map((f: string) => String(f).trim())
        .filter((f: string) => f && f !== 'Glasses')
        .sort()
    : [];

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
    `${cleanFeats.length > 0 ? `&distinctiveFeatures=${encodeURIComponent(cleanFeats.join(','))}` : ''}` +
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
  // Louissa Aboad (5a2a5120-1f05-4725-9652-a9647fe647ca)
  {
    match: '5a2a5120-1f05-4725-9652-a9647fe647ca-80bd5940667046d5',
    replacement: '/generated-avatars/louissa-aboad-front.jpg',
  },
  // Alex Masterson (74ced342-5614-4f81-a5e1-a4dab75e9420)
  {
    match: '74ced342-5614-4f81-a5e1-a4dab75e9420-7e976952cc5df3830daa44da2b988098',
    replacement: '/generated-avatars/alex-masterson-front.jpg',
  },
  {
    match: '74ced342-5614-4f81-a5e1-a4dab75e9420-ace4735b76caad3973e124ac2a06e161',
    replacement: '/generated-avatars/alex-masterson-front.jpg',
  },
  // Elia Scrim (5d0e09e5-4575-42a8-8713-da6972dfe8b3)
  {
    match: '5d0e09e5-4575-42a8-8713-da6972dfe8b3-590ed913c5a413c0',
    replacement: '/generated-avatars/elia-scrim-front.jpg',
  },
  {
    match: '5d0e09e5-4575-42a8-8713-da6972dfe8b3-f7fa2bd491d9d7943443c7a15be6ab3007ebe170abdc4bae6d80c58d7f105471',
    replacement: '/generated-avatars/elia-scrim-front.jpg',
  },
  {
    match: '5d0e09e5-4575-42a8-8713-da6972dfe8b3-e97cfb155a73f101d000028264726105c01fa852c6aefd604cac8cc55235d182',
    replacement: '/generated-avatars/elia-scrim-front.jpg',
  },
  {
    match: '5d0e09e5-4575-42a8-8713-da6972dfe8b3-d1c4b968f4ac6fd5cb15bea64ae14264fc43c85c089ef35ecf8e5adce19792f4',
    replacement: '/generated-avatars/elia-scrim-front.jpg',
  },
  {
    match: '5d0e09e5-4575-42a8-8713-da6972dfe8b3-754210fd50ab7e88f692e538b405b9a1a80aeb3389c1eef533c13de652eb32f7',
    replacement: '/generated-avatars/elia-scrim-front.jpg',
  },
  {
    match: '5d0e09e5-4575-42a8-8713-da6972dfe8b3-distinct.jpg',
    replacement: '/generated-avatars/elia-scrim-front.jpg',
  },
  // Darren (aecac18e-d529-40aa-8704-ba873d0dc2c9)
  {
    match: 'aecac18e-d529-40aa-8704-ba873d0dc2c9-946a757e734ed2841c86a9a67f85f10a235e613e24e5d0506644f43586b26c4b',
    replacement: '/generated-avatars/darren-front.jpg',
  },
  {
    match: 'aecac18e-d529-40aa-8704-ba873d0dc2c9-ba030ef39fa0b4021ef2dd142563cb255f8ad6ab39d9e2e110f066178cd5ba14',
    replacement: '/generated-avatars/darren-front.jpg',
  },
  {
    match: 'aecac18e-d529-40aa-8704-ba873d0dc2c9-789b6d967153a8ae54f0a7ace832557e1e803eee5b883011200134cef356d943',
    replacement: '/generated-avatars/darren-front.jpg',
  },
  // Matt Pinder (57554cef-7738-4207-ac69-3843b457322b)
  {
    match: '57554cef-7738-4207-ac69-3843b457322b-a0a7b0759c30b3b4',
    replacement: '/generated-avatars/f460c1c6-4019-4c4f-a204-4f60f4c70ae9-matt-curly.jpg',
  },
  {
    match: '57554cef-7738-4207-ac69-3843b457322b-ea59f65753508d99',
    replacement: '/generated-avatars/f460c1c6-4019-4c4f-a204-4f60f4c70ae9-matt-curly.jpg',
  },
  {
    match: '57554cef-7738-4207-ac69-3843b457322b-3f16624659431f78',
    replacement: '/generated-avatars/f460c1c6-4019-4c4f-a204-4f60f4c70ae9-matt-curly.jpg',
  },
  {
    match: '57554cef-7738-4207-ac69-3843b457322b-e9e2df71fc48366b899d2553cf5557c58f8346a8b502367be1ccc95230b8eec6',
    replacement: '/generated-avatars/f460c1c6-4019-4c4f-a204-4f60f4c70ae9-matt-curly.jpg',
  },
  {
    match: '57554cef-7738-4207-ac69-3843b457322b-7b02e8695e7e8a9ea8832faa1764cd1e50b31c4ce295c4b01e7f52f0700a87c5',
    replacement: '/generated-avatars/f460c1c6-4019-4c4f-a204-4f60f4c70ae9-matt-curly.jpg',
  },
  // Charley Haywood (f460c1c6-4019-4c4f-a204-4f60f4c70ae9)
  {
    match: 'f460c1c6-4019-4c4f-a204-4f60f4c70ae9-2f5e63f14bbb7b5d',
    replacement: '/generated-avatars/charley-haywood-front.jpg',
  },
  {
    match: 'f460c1c6-4019-4c4f-a204-4f60f4c70ae9-603d3f899c5bf5459e840aa86a60be98683d09cabae30d5eeb75f10bd1a1fa23',
    replacement: '/generated-avatars/charley-haywood-front.jpg',
  },
  {
    match: 'f460c1c6-4019-4c4f-a204-4f60f4c70ae9-c24aabcbd0d7fcfd0199ffa3e32d2d51f6396cf9865ff4e381187e764d20d620',
    replacement: '/generated-avatars/charley-haywood-front.jpg',
  },
  // kiri Smyth (2e971de9-24ec-4a3d-9361-9cdcf75683b0)
  {
    match: '2e971de9-24ec-4a3d-9361-9cdcf75683b0-859ec69d0275a383',
    replacement: '/generated-avatars/kiri-smyth-front.jpg',
  },
  {
    match: '2e971de9-24ec-4a3d-9361-9cdcf75683b0-e77c4baec0c7f832',
    replacement: '/generated-avatars/kiri-smyth-front.jpg',
  },
  {
    match: '2e971de9-24ec-4a3d-9361-9cdcf75683b0-466b6a984de58b8c10e2b8f2e47fe30d1122cfb802208792a1cc76751e9d3fb6',
    replacement: '/generated-avatars/kiri-smyth-front.jpg',
  },
  {
    match: '2e971de9-24ec-4a3d-9361-9cdcf75683b0-410b05b88e9dbece693cb0b88d5176b9b4c3704212951cbc8af99652265740e2',
    replacement: '/generated-avatars/kiri-smyth-front.jpg',
  },
  // Vic Wayne (c3411bf0-6c26-45b4-b743-af9e0d365c44)
  {
    match: 'c3411bf0-6c26-45b4-b743-af9e0d365c44-de05418f9ee49522',
    replacement: '/generated-avatars/vic-wayne-front.jpg',
  },
  {
    match: 'c3411bf0-6c26-45b4-b743-af9e0d365c44-f175ad5be3e3dd6d',
    replacement: '/generated-avatars/vic-wayne-front.jpg',
  },
  {
    match: 'c3411bf0-6c26-45b4-b743-af9e0d365c44-1c1ed88b51c2a4814ac5df1b7f9717b6cc15e0e4dfeac9625572994c56cda18e',
    replacement: '/generated-avatars/vic-wayne-front.jpg',
  },
  {
    match: 'c3411bf0-6c26-45b4-b743-af9e0d365c44-7bdf9a231c7531f92daa5b7a9376d0c558c76dd0fd0d75edec481a1d27de9fec',
    replacement: '/generated-avatars/vic-wayne-front.jpg',
  },
  {
    match: 'c3411bf0-6c26-45b4-b743-af9e0d365c44-f895382e1aeabcff9e250dcec2313e994542d95c787eb605b0614542d95c787',
    replacement: '/generated-avatars/vic-wayne-front.jpg',
  },
  {
    match: 'vic-distinct.jpg',
    replacement: '/generated-avatars/vic-wayne-front.jpg',
  },
  // Scarlett Blyth (e800e385-9f2a-4e02-b937-85c45e63b00d)
  {
    match: 'e800e385-9f2a-4e02-b937-85c45e63b00d-76e32bd0f52e645e',
    replacement: '/generated-avatars/scarlett-blyth-front.jpg',
  },
  {
    match: 'e800e385-9f2a-4e02-b937-85c45e63b00d-52c1e1b699baad0c2d50b0c4694fdfde',
    replacement: '/generated-avatars/scarlett-blyth-front.jpg',
  },
  {
    match: 'e800e385-9f2a-4e02-b937-85c45e63b00d-238f30b4bbfe1cbe068dcd3e874e44b6117999fabdf10554460a4eda7c234ebb',
    replacement: '/generated-avatars/scarlett-blyth-front.jpg',
  },
  {
    match: 'e800e385-9f2a-4e02-b937-85c45e63b00d-distinct.jpg',
    replacement: '/generated-avatars/scarlett-blyth-front.jpg',
  },
  // Luke Beveridge (0370c2e5-a829-4b37-9eff-8251c337aa34)
  {
    match: '0370c2e5-a829-4b37-9eff-8251c337aa34-a35700fa222e4d08',
    replacement: '/generated-avatars/luke-beveridge-front.jpg',
  },
  {
    match: '0370c2e5-a829-4b37-9eff-8251c337aa34-2bf6d5bf0afbd2f035beba3503d89b0715244bba9ce52d769847659687fdce22',
    replacement: '/generated-avatars/luke-beveridge-front.jpg',
  },
  {
    match: '0370c2e5-a829-4b37-9eff-8251c337aa34-luke-golden.jpg',
    replacement: '/generated-avatars/luke-beveridge-front.jpg',
  },
  // Jason Dhillon (83836dda-1625-48e6-8b13-5128d1435df5)
  {
    match: '83836dda-1625-48e6-8b13-5128d1435df5-2e57646841b96699',
    replacement: '/generated-avatars/jason-dhillon-front.jpg',
  },
  {
    match: '83836dda-1625-48e6-8b13-5128d1435df5-b8f2b4b83b1d322a',
    replacement: '/generated-avatars/jason-dhillon-front.jpg',
  },
  {
    match: '83836dda-1625-48e6-8b13-5128d1435df5-835bfdf5a66e1c29',
    replacement: '/generated-avatars/jason-dhillon-front.jpg',
  },
  {
    match: '83836dda-1625-48e6-8b13-5128d1435df5-9d71fdb1554439be0d6e87b44fa9f714c4f2765db5786bea5d6d61055cd92125',
    replacement: '/generated-avatars/jason-dhillon-front.jpg',
  },
  {
    match: '83836dda-1625-48e6-8b13-5128d1435df5-64ef450de7d4dd1b89409612d1f92b6f4319c615a269a639e80554e6d0107183',
    replacement: '/generated-avatars/jason-dhillon-front.jpg',
  },
  {
    match: '83836dda-1625-48e6-8b13-5128d1435df5-cb5637357779a0c1445b29231a2a64aeaa0bae29b802aa8a977cc667846fdfce',
    replacement: '/generated-avatars/jason-dhillon-front.jpg',
  },
  {
    match: '83836dda-1625-48e6-8b13-5128d1435df5-ad31844e0708fd8955cf8b4bdc23b9b5da8eb54e259662de3050f32e4da5e3ae',
    replacement: '/generated-avatars/jason-dhillon-front.jpg',
  },
  // Polly (b1ad3178-403c-4945-9532-731ca3398457)
  {
    match: 'b1ad3178-403c-4945-9532-731ca3398457-732e3d3e2e04c456',
    replacement: '/generated-avatars/polly-front.jpg',
  },
  {
    match: 'b1ad3178-403c-4945-9532-731ca3398457-4fc4178b9188296cb9100ef23dd5e7d9ffa19a6ce502eb7db5baa6628c6357e8',
    replacement: '/generated-avatars/polly-front.jpg',
  },
  {
    match: 'b1ad3178-403c-4945-9532-731ca3398457-0a0a6ebd46029b374f651437bb08561e1015bf2d4136fa846fbb3481915377ee',
    replacement: '/generated-avatars/polly-front.jpg',
  },
  // Gabriella Blyth / Host (4903bd39-e54f-42e4-b679-2af5d128bb8f)
  {
    match: '4903bd39-e54f-42e4-b679-2af5d128bb8f-b130e47b4cee2149a7aad02dfc972e91',
    replacement: '/generated-avatars/gabriella-blyth-front.jpg',
  },
  {
    match: '4903bd39-e54f-42e4-b679-2af5d128bb8f-eadf0ea4a3744e82',
    replacement: '/generated-avatars/gabriella-blyth-front.jpg',
  },
  {
    match: '4903bd39-e54f-42e4-b679-2af5d128bb8f-c719abfbc47f1e05',
    replacement: '/generated-avatars/gabriella-blyth-front.jpg',
  },
  {
    match: '4903bd39-e54f-42e4-b679-2af5d128bb8f-host.jpg',
    replacement: '/generated-avatars/gabriella-blyth-front.jpg',
  },
  // Gabby (f77d09a9-e74f-43c4-8b7b-9f522dfbb91f)
  {
    match: 'f77d09a9-e74f-43c4-8b7b-9f522dfbb91f-4cfdc19783654b536827888c21c53c64',
    replacement: '/generated-avatars/f77d09a9-e74f-43c4-8b7b-9f522dfbb91f-distinct.jpg',
  },
  {
    match: 'f77d09a9-e74f-43c4-8b7b-9f522dfbb91f-e7ccc710ba2d6101b69b2e15e238f50a5',
    replacement: '/generated-avatars/f77d09a9-e74f-43c4-8b7b-9f522dfbb91f-distinct.jpg',
  },
];

const CANONICAL_GUEST_NAME_AVATAR_MAP: Record<string, string> = {
  'louissa aboad': '/generated-avatars/louissa-aboad-front.jpg',
  'louissa': '/generated-avatars/louissa-aboad-front.jpg',
  'alex masterson': '/generated-avatars/alex-masterson-front.jpg',
  'alex': '/generated-avatars/alex-masterson-front.jpg',
  'elia scrim': '/generated-avatars/elia-scrim-front.jpg',
  'elia': '/generated-avatars/elia-scrim-front.jpg',
  'darren': '/generated-avatars/darren-front.jpg',
  'matt pinder': '/generated-avatars/f460c1c6-4019-4c4f-a204-4f60f4c70ae9-matt-curly.jpg',
  'matt': '/generated-avatars/f460c1c6-4019-4c4f-a204-4f60f4c70ae9-matt-curly.jpg',
  'charley haywood': '/generated-avatars/charley-haywood-front.jpg',
  'charley': '/generated-avatars/charley-haywood-front.jpg',
  'kiri smyth': '/generated-avatars/kiri-smyth-front.jpg',
  'kiri': '/generated-avatars/kiri-smyth-front.jpg',
  'vic wayne': '/generated-avatars/vic-wayne-front.jpg',
  'vic': '/generated-avatars/vic-wayne-front.jpg',
  'scarlett blyth': '/generated-avatars/scarlett-blyth-front.jpg',
  'scarlett': '/generated-avatars/scarlett-blyth-front.jpg',
  'luke beveridge': '/generated-avatars/luke-beveridge-front.jpg',
  'luke': '/generated-avatars/luke-beveridge-front.jpg',
  'jason dhillon': '/generated-avatars/jason-dhillon-front.jpg',
  'jason': '/generated-avatars/jason-dhillon-front.jpg',
  'polly': '/generated-avatars/polly-front.jpg',
  'gabriella blyth': '/generated-avatars/gabriella-blyth-front.jpg',
};

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

  // Only fallback to the canonical pre-baked portrait if the guest has no aiPhotoUrl yet
  const cleanName = String(guest.name || '').trim().toLowerCase();
  const canonicalPhoto = CANONICAL_GUEST_NAME_AVATAR_MAP[cleanName];
  if (canonicalPhoto && !rawUrl.includes('aiPhotoUrl=')) {
    try {
      const parsed = new URL(rawUrl);
      parsed.searchParams.set('aiPhotoUrl', canonicalPhoto);
      return parsed.toString();
    } catch {
      return canonicalPhoto;
    }
  }

  return rawUrl;
}

/**
 * Extracts the embedded `aiPhotoUrl` query parameter from a DiceBear avatar URL if present,
 * otherwise returns the original avatar URL (rewriting retired 8.x/avataaars to 7.x/avataaars).
 */
export function resolveDisplayAvatarUrl(
  avatarUrl?: string | null,
  options?: { disableCanonicalFallback?: boolean }
): string {
  if (!avatarUrl) return '';
  for (const rule of LEGACY_CLONE_AVATAR_REPLACEMENTS) {
    if (avatarUrl.includes(rule.match)) {
      return rule.replacement;
    }
  }
  if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('/')) return avatarUrl;
  try {
    const parsed = new URL(avatarUrl);
    const seedName = decodeURIComponent(parsed.searchParams.get('seed') || '').trim().toLowerCase();
    const aiPhoto = parsed.searchParams.get('aiPhotoUrl');
    if (aiPhoto) {
      for (const rule of LEGACY_CLONE_AVATAR_REPLACEMENTS) {
        if (aiPhoto.includes(rule.match)) return rule.replacement;
      }
      return aiPhoto;
    }
    if (!options?.disableCanonicalFallback && seedName && CANONICAL_GUEST_NAME_AVATAR_MAP[seedName]) {
      return CANONICAL_GUEST_NAME_AVATAR_MAP[seedName];
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

