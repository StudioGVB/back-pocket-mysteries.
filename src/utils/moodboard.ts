export interface MoodboardPhoto {
  id: string;
  url: string;
  caption?: string;
  tag?: string;
}

const MOODBOARD_HASH_PREFIX = '#moodboard=';

/**
 * Parses `mysteries.image_url` which may optionally contain `#moodboard=<encodedJSON>`
 * so multiple moodboard photos can be stored without requiring a schema migration,
 * while keeping `image_url` a valid URL for any standard `<img>` tag.
 */
export function parseMysteryImageField(rawImageUrl?: string | null): {
  coverUrl: string | null;
  moodboardPhotos: MoodboardPhoto[];
} {
  if (!rawImageUrl) {
    return { coverUrl: null, moodboardPhotos: [] };
  }

  const hashIndex = rawImageUrl.indexOf(MOODBOARD_HASH_PREFIX);
  if (hashIndex === -1) {
    return { coverUrl: rawImageUrl, moodboardPhotos: [] };
  }

  const baseCover = rawImageUrl.slice(0, hashIndex).trim();
  const encoded = rawImageUrl.slice(hashIndex + MOODBOARD_HASH_PREFIX.length).trim();

  let moodboardPhotos: MoodboardPhoto[] = [];
  if (encoded) {
    try {
      const parsed = JSON.parse(decodeURIComponent(encoded));
      if (Array.isArray(parsed)) {
        moodboardPhotos = parsed
          .filter((item: any) => item && typeof item.url === 'string' && item.url.trim().length > 0)
          .map((item: any, idx: number) => ({
            id: typeof item.id === 'string' && item.id ? item.id : `mb-${idx}`,
            url: item.url.trim(),
            caption: typeof item.caption === 'string' ? item.caption : undefined,
            tag: typeof item.tag === 'string' ? item.tag : undefined,
          }));
      }
    } catch {
      moodboardPhotos = [];
    }
  }

  const coverUrl = baseCover || moodboardPhotos[0]?.url || null;
  return { coverUrl, moodboardPhotos };
}

/**
 * Combines the primary cover URL and moodboard photos array back into a single
 * string suitable for storing in `mysteries.image_url`.
 */
export function serializeMysteryImageField(
  coverUrl: string | null | undefined,
  moodboardPhotos: MoodboardPhoto[]
): string | null {
  const cleanCover = coverUrl ? coverUrl.split(MOODBOARD_HASH_PREFIX)[0].trim() : '';
  const cleanPhotos = (moodboardPhotos || [])
    .filter((p) => p && typeof p.url === 'string' && p.url.trim().length > 0)
    .map((p, idx) => ({
      id: p.id || `mb-${Date.now()}-${idx}`,
      url: p.url.split(MOODBOARD_HASH_PREFIX)[0].trim(),
      ...(p.caption ? { caption: p.caption.trim() } : {}),
      ...(p.tag ? { tag: p.tag.trim() } : {}),
    }));

  const primary = cleanCover || cleanPhotos[0]?.url || '';
  if (!primary && cleanPhotos.length === 0) {
    return null;
  }

  if (cleanPhotos.length === 0) {
    return primary;
  }

  return `${primary}${MOODBOARD_HASH_PREFIX}${encodeURIComponent(JSON.stringify(cleanPhotos))}`;
}

export const LOTR_MAIN_COVER_URL = '/moodboard/lotr/main-promo-murder.jpg';

export const LOTR_GOSSIP_MOODBOARD: MoodboardPhoto[] = [
  {
    id: 'lotr-murder-promo',
    url: '/moodboard/lotr/main-promo-murder.jpg',
    tag: 'The Fatal Toast',
    caption: 'Spilled rosé, spiked capsules, and a rooftop reunion that turns deadly before the cameras cut',
  },
  {
    id: 'lotr-cast',
    url: '/moodboard/lotr/hero-cast.jpg',
    tag: 'The Villa Reunion',
    caption: 'Hot pink silk, rooftop infinity pools, and "I’ve got a text!" chaos before Round 1 begins',
  },
  {
    id: 'lotr-penthouse',
    url: '/moodboard/lotr/penthouse-vibe.jpg',
    tag: 'XOXO Penthouse Vibe',
    caption: 'Rosé champagne towers, disco balls at sunset, and whispered alliances on the VIP daybeds',
  },
  {
    id: 'lotr-dresscode',
    url: '/moodboard/lotr/dress-code.jpg',
    tag: 'It-Girl Dress Code',
    caption: 'Sequin mini dresses, metallic cutouts, feather heels, and designer sunglasses indoors',
  },
  {
    id: 'lotr-spotted',
    url: '/moodboard/lotr/caught-on-camera.jpg',
    tag: 'Spotted: VIP Cabana',
    caption: '35mm paparazzi flash, secret rooftop hookups, and receipts dropping in the group chat',
  },
  {
    id: 'lotr-cocktails',
    url: '/moodboard/lotr/cocktail-hour.jpg',
    tag: 'Drinks & Drama',
    caption: 'Passionfruit martinis, sparkler margs, and one poisoned glass of champagne',
  },
];

export function isRealityReunionMystery(theme?: string | null, title?: string | null): boolean {
  const combined = `${title || ''} ${theme || ''}`.toLowerCase();
  return (
    combined.includes('love on the rocks') ||
    combined.includes('reality') ||
    combined.includes('reunion')
  );
}

export const CHRISTMAS_MAIN_COVER_URL = '/moodboard/christmas/main-christmas-cabin.jpg';

export const CHRISTMAS_CABIN_MOODBOARD: MoodboardPhoto[] = [
  {
    id: 'xmas-cast-party',
    url: '/moodboard/christmas/main-christmas-cabin.jpg',
    tag: 'Close Friends & Secrets',
    caption: 'Best friends, couples, and co-workers gathered around the Christmas tree before a tangled web of secrets snaps',
  },
  {
    id: 'xmas-setting',
    url: '/moodboard/christmas/christmas-setting.jpg',
    tag: 'The Setting',
    caption: 'An intimate living and dining room glowing with vintage Christmas tree lights, pine garlands, and candlelit holiday cheer',
  },
  {
    id: 'xmas-toast',
    url: '/moodboard/christmas/christmas-friends-toast.jpg',
    tag: 'Party Atmosphere',
    caption: 'Close friends toasting over Christmas dinner, paper cracker crowns, and whispered betrayals across the table',
  },
  {
    id: 'xmas-dresscode',
    url: '/moodboard/christmas/christmas-dress-code.jpg',
    tag: 'Dress Code Inspo',
    caption: 'Crimson velvet, emerald silk, shimmering silver, and festive holiday dinner party glamour',
  },
  {
    id: 'xmas-cocktails',
    url: '/moodboard/christmas/christmas-cocktails.jpg',
    tag: 'Cocktail Hour',
    caption: 'Spiced cranberry cocktails, mulled wine with cinnamon sticks, and a spilled glass beside the Christmas lights',
  },
];

export function isChristmasMystery(theme?: string | null, title?: string | null): boolean {
  const combined = `${title || ''} ${theme || ''}`.toLowerCase();
  return (
    combined.includes('christmas') ||
    combined.includes('holiday') ||
    combined.includes('chalet') ||
    combined.includes('cabin') ||
    combined.includes('snowfall') ||
    combined.includes('xmas')
  );
}

export function getEffectiveCoverUrl(
  rawImageUrl?: string | null,
  theme?: string | null,
  title?: string | null
): string | null {
  const { coverUrl } = parseMysteryImageField(rawImageUrl);
  if (isRealityReunionMystery(theme, title)) {
    return LOTR_MAIN_COVER_URL;
  }
  if (isChristmasMystery(theme, title)) {
    if (!coverUrl || coverUrl.startsWith('data:image/') || coverUrl.includes('ui-avatars.com')) {
      return CHRISTMAS_MAIN_COVER_URL;
    }
  }
  return coverUrl;
}

/**
 * Provides curated fallback mood board photos when a mystery does not have custom
 * uploaded mood board photos yet, so the page always looks visual and atmospheric.
 */
export function getEffectiveMoodboardPhotos(
  rawImageUrl?: string | null,
  theme?: string | null,
  title?: string | null
): MoodboardPhoto[] {
  const { coverUrl, moodboardPhotos } = parseMysteryImageField(rawImageUrl);

  if (isRealityReunionMystery(theme, title)) {
    const hasMurderPromo = moodboardPhotos.some((p) => p.url.includes('main-promo-murder.jpg'));
    if (hasMurderPromo) return moodboardPhotos;
    return LOTR_GOSSIP_MOODBOARD;
  }

  if (moodboardPhotos.length > 0) {
    return moodboardPhotos;
  }

  if (isChristmasMystery(theme, title)) {
    return CHRISTMAS_CABIN_MOODBOARD;
  }

  const combined = `${title || ''} ${theme || ''}`.toLowerCase();

  if (combined.includes('vintage') || combined.includes('1920') || combined.includes('speakeasy') || combined.includes('manor') || combined.includes('inheritance')) {
    const defaults: MoodboardPhoto[] = [
      ...(coverUrl
        ? [{ id: 'def-cover', url: coverUrl, tag: 'The Estate', caption: 'Candlelit grandeur and locked doors' }]
        : []),
      {
        id: 'def-1',
        url: '/hero/01-vintage.png',
        tag: 'The Atmosphere',
        caption: 'Velvet drapes, crystal decanters, and old-money secrets',
      },
      {
        id: 'def-2',
        url: '/blog/mystery-menu.png',
        tag: 'Dinner Table Vibe',
        caption: 'A formal multi-course evening where every course drops a clue',
      },
      {
        id: 'def-3',
        url: '/blog/costume-guide.png',
        tag: 'Wardrobe Aesthetic',
        caption: 'Black tie, pearls, waistcoats, and vintage evening glamour',
      },
      {
        id: 'def-4',
        url: '/hero/05-masquerade.png',
        tag: 'After Midnight',
        caption: 'Hidden identities and whispered alibis in the study',
      },
    ];
    return defaults.slice(0, 5);
  }

  const genericDefaults: MoodboardPhoto[] = [
    ...(coverUrl
      ? [{ id: 'def-cover', url: coverUrl, tag: 'The Cast & Setting', caption: title || 'Close friends gathered at the scene of the mystery' }]
      : []),
    {
      id: 'def-1',
      url: '/blog/birthday-dinner.png',
      tag: 'Close Friends & Drama',
      caption: 'Unfold clues round-by-round with your favorite people over drinks and dinner',
    },
    {
      id: 'def-2',
      url: '/blog/costume-guide.png',
      tag: 'Dress To Impress',
      caption: 'Every guest steps into character from the moment they arrive',
    },
    {
      id: 'def-3',
      url: '/blog/mystery-menu.png',
      tag: 'Table & Cocktails',
      caption: 'Set the mood with themed drinks, warm lighting, and sealed envelopes',
    },
    {
      id: 'def-4',
      url: '/hero/05-masquerade.png',
      tag: 'The Vibe',
      caption: 'High-stakes intrigue, candid moments, and hidden motives among friends',
    },
    ...(combined.includes('boat') || combined.includes('yacht') || combined.includes('cruise')
      ? [
          {
            id: 'def-boat',
            url: '/hero/02-boat.png',
            tag: 'The Setting',
            caption: 'No one leaves the deck until the final accusation is cast',
          },
        ]
      : []),
  ];

  return genericDefaults.slice(0, 5);
}

