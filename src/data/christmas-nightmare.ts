import crypto from 'crypto';

export const CHRISTMAS_NIGHTMARE_TITLE = 'Christmas Nightmare';
export const CHRISTMAS_NIGHTMARE_THEME = 'Christmas Party';
export const CHRISTMAS_NIGHTMARE_DESCRIPTION =
  'They all grew up together on the same street: two pairs of next-door childhood siblings whose lives have been intertwined since high school. Tonight, beneath the twinkling lights of their annual Christmas dinner party, years of tangled history, secret affairs, and broken marriages finally snap. When a sudden 8:19 PM power surge plunges the living room into darkness and The Husband is discovered dead in the Christmas tree corner, amid a spilled cup of spiced eggnog, a scorched wall outlet, and a tangled coil of vintage tree lights, the holiday reunion turns into a Christmas Nightmare. Everyone in the room is family, a childhood neighbour, a spouse, or a secret lover, and every single one of them is hiding a betrayal.';
export const CHRISTMAS_NIGHTMARE_INSIDE_JOKES =
  'Keep your neighbours close, your family closer, and never trust what happens when the Christmas lights go dark.';

export function isChristmasNightmareMystery(title?: string | null, theme?: string | null): boolean {
  const t = String(title || '').toLowerCase();
  const th = String(theme || '').toLowerCase();
  return (
    t.includes('christmas nightmare') ||
    t.includes('christmas nighmare') ||
    (t.includes('christmas') && (t.includes('nightmare') || t.includes('nighmare') || th.includes('christmas')))
  );
}

export interface CanonicalChristmasCharacter {
  key: 'husband' | 'wife' | 'sister' | 'mistress' | 'coworker' | 'bestie';
  legacyId?: string;
  name: string;
  gender: 'male' | 'female' | 'adaptable';
  is_victim: boolean;
  plot_role: 'victim' | 'killer' | 'assistant' | 'innocent';
  archetype: string;
  is_mandatory: boolean;
  min_player_count: number;
  profile_data: {
    age: string;
    color: string;
    bio: string;
    outfit_advice: string;
    outfit_reference_images: string[];
    avatar_url: string;
    standard_character_photo_url?: string;
    standard_character_photo_hash?: string;
    guest_id?: string;
    guest_name?: string;
    eye_color?: string;
    height?: string;
    outfit_image_url?: string;
    act_summary: string;
    act_bullets: string[];
    traits: string[];
    [key: string]: unknown;
  };
  motive?: {
    legacyId?: string;
    motive_type: 'love' | 'revenge' | 'greed' | 'fear' | 'power' | 'justice';
    strength: 'low' | 'moderate' | 'high' | 'critical';
    notes: string;
  };
}

export const CHRISTMAS_NIGHTMARE_CHARACTERS: CanonicalChristmasCharacter[] = [
  {
    key: 'husband',
    legacyId: 'da18ef00-ecdc-41e7-8c71-97d78046e43b',
    name: 'The Husband',
    gender: 'male',
    is_victim: true,
    plot_role: 'victim',
    archetype: 'victim',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Red',
      bio: '{{The Husband}} grew up on the same street as the rest of the group and went to high school with everyone at tonight\'s Christmas dinner. {{The Husband_He}} has been married to {{The Wife}} for five years, is siblings-in-law with {{The Sister-in-Law}}, has been best friends with {{The Bestie}} since high school, and works at the same company as {{The Co-Worker}}.',
      outfit_advice: 'Sharp holiday host attire: Option 1 — a tailored crimson velvet dinner blazer over a crisp dress shirt; Option 2 — a deep forest green velvet jacket with a black dress shirt; Option 3 — a burgundy cashmere turtleneck under a charcoal wool blazer with a luxury dress watch.',
      outfit_reference_images: [
        '/outfits/christmas/husband-1.jpg',
        '/outfits/christmas/husband-2.jpg',
        '/outfits/christmas/husband-3.jpg',
      ],
      guest_id: '0370c2e5-a829-4b37-9eff-8251c337aa34',
      guest_name: 'Luke',
      eye_color: 'Blue',
      height: 'Very Tall',
      standard_character_photo_url: '/generated-avatars/da18ef00-ecdc-41e7-8c71-97d78046e43b-synced-candlelit.jpg',
      outfit_image_url: '/generated-avatars/da18ef00-ecdc-41e7-8c71-97d78046e43b-synced-candlelit.jpg',
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Luke&eyebrows=default&eyes=default&mouth=smile&clothesColor=262e33&backgroundColor=transparent&top=shortFlat&hairColor=d6b370&hatColor=d6b370&skinColor=ffe0bd&facialHairProbability=0&accessoriesProbability=0&build=Average&aiPhotoUrl=%2Fgenerated-avatars%2Fda18ef00-ecdc-41e7-8c71-97d78046e43b-synced-candlelit.jpg',
      act_summary: 'Act like the charming, larger-than-life host of the annual Christmas dinner who loves holding court with old high school friends and childhood neighbours.',
      act_bullets: [
        'Toast loudly to growing up on the same street and keeping the old high school crew together.',
        'Keep up a polished holiday host front alongside your {{The Wife_spouse}} of five years, {{The Wife}}.',
        'Treat your childhood neighbour, {{The Bestie}}, like your lifelong right-hand confidant.',
        'Talk work and office politics with {{The Co-Worker}}, who works at the same firm as you.',
      ],
      traits: ['Charismatic', 'Commanding', 'Ambitious', 'Smooth'],
    },
  },
  {
    key: 'wife',
    legacyId: '44d70cd0-9f04-408b-8ac9-e064eb5c31d0',
    name: 'The Wife',
    gender: 'female',
    is_victim: false,
    plot_role: 'innocent',
    archetype: 'hero',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Emerald Green',
      bio: '{{The Wife}} grew up next door to the two neighbour siblings ({{The Co-Worker}} and {{The Bestie}}) alongside {{The Wife_his}} younger {{The Sister-in-Law_sibling}}, {{The Sister-in-Law}}, and tonight both siblings are wearing their matching sterling silver snowflake hairpins. {{The Wife_He}} has been married to {{The Husband}} for five years after dating since high school, briefly dated {{The Co-Worker}} in high school, and used to be best friends with {{The Mistress}} when they were teenagers.',
      outfit_advice: 'Effortlessly glamorous holiday hostess: Option 1 — an emerald green silk midi dress with gold statement earrings; Option 2 — a tailored emerald velvet jumpsuit with heels; Option 3 — a forest green cashmere sweater tucked into a shimmering gold pleated midi skirt (paired with your matching silver snowflake hairpin).',
      outfit_reference_images: [
        '/outfits/christmas/wife-1.jpg',
        '/outfits/christmas/wife-2.jpg',
        '/outfits/christmas/wife-3.jpg',
      ],
      standard_character_photo_url: '/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-synced-candlelit.jpg',
      outfit_image_url: '/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-synced-candlelit.jpg',
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheWife&eyebrows=default&eyes=default&mouth=smile&clothesColor=065f46&backgroundColor=transparent&top=straight01&hairColor=4a3123&skinColor=ffe0bd&aiPhotoUrl=%2Fgenerated-avatars%2F44d70cd0-9f04-408b-8ac9-e064eb5c31d0-synced-candlelit.jpg',
      act_summary: 'Play the poised, gracious Christmas party host welcoming your {{The Sister-in-Law_sibling}} and childhood neighbours back to the house for the holidays.',
      act_bullets: [
        'Stay close with your younger {{The Sister-in-Law_sibling}}, {{The Sister-in-Law}}, who you grew up sharing everything with (including your matching silver snowflake hairpins).',
        'Keep things polite and composed around your old high school best friend, {{The Mistress}}.',
        'Reminisce about growing up next door to the two neighbour siblings, {{The Co-Worker}} and {{The Bestie}}.',
        'Keep the holiday dinner moving smoothly alongside your {{The Husband_spouse}} of five years, {{The Husband}}.',
      ],
      traits: ['Poised', 'Guarded', 'Graceful', 'Observant'],
    },
  },
  {
    key: 'sister',
    legacyId: 'd1433643-ac1b-4689-af57-84bb77c2be33',
    name: 'The Sister-in-Law',
    gender: 'female',
    is_victim: false,
    plot_role: 'killer',
    archetype: 'villain',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Silver',
      bio: '{{The Sister-in-Law}} is {{The Wife}}\'s fiercely loyal younger {{The Sister-in-Law_sibling}} (wearing {{The Sister-in-Law_his}} half of their matching sterling silver snowflake hairpins tonight) and grew up next door to the two neighbour siblings ({{The Co-Worker}} and {{The Bestie}}). {{The Sister-in-Law_He}} went to high school with {{The Husband}} and {{The Mistress}}, and over the last few years {{The Sister-in-Law_he}} and {{The Mistress}} have become close best friends.',
      outfit_advice: 'Sleek winter chic: Option 1 — a shimmering silver knit sweater dress with dark berry lipstick; Option 2 — a silver satin blouse with high-waisted black tailored trousers; Option 3 — a charcoal sequin blazer over a sleek black slip dress (paired with your matching silver snowflake hairpin).',
      outfit_reference_images: [
        '/outfits/christmas/sister-1.jpg',
        '/outfits/christmas/sister-2.jpg',
        '/outfits/christmas/sister-3.jpg',
      ],
      standard_character_photo_url: '/generated-avatars/d1433643-ac1b-4689-af57-84bb77c2be33-synced-candlelit.jpg',
      outfit_image_url: '/generated-avatars/d1433643-ac1b-4689-af57-84bb77c2be33-synced-candlelit.jpg',
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheSisterInLaw&eyebrows=default&eyes=default&mouth=smile&clothesColor=64748b&backgroundColor=transparent&top=curvy&hairColor=a55728&skinColor=ffe0bd&aiPhotoUrl=%2Fgenerated-avatars%2Fd1433643-ac1b-4689-af57-84bb77c2be33-synced-candlelit.jpg',
      act_summary: 'Play the sharp-witted, loyal younger {{The Sister-in-Law_sibling}} who grew up on the street with everyone at the table and knows all the old neighbourhood history.',
      act_bullets: [
        'Always have your older {{The Wife_sibling}} {{The Wife}}\'s back during family holiday dinners.',
        'Chat and catch up with your current best friend, {{The Mistress}}.',
        'Banter with the two neighbour siblings you grew up next door to, {{The Co-Worker}} and {{The Bestie}}.',
        'If anyone asks where you were around 8:15–8:25 PM, insist you were in the kitchen pantry corridor the entire time fetching extra holiday drinks with {{The Bestie}}.',
      ],
      traits: ['Loyal', 'Sharp-Witted', 'Protective', 'Observant'],
    },
    motive: {
      legacyId: '74df0c99-4a91-495c-b60a-98da5de9e10e',
      motive_type: 'love',
      strength: 'critical',
      notes: 'After exposing that {{The Sister-in-Law_his}} current bestie ({{The Mistress}}) was having an affair with {{The Husband}} and overhearing {{The Husband}} and {{The Wife}}\'s marital issues, {{The Sister-in-Law}} ended {{The Husband}} with the Christmas lights because {{The Sister-in-Law_he}} chose for {{The Sister-in-Law_his}} {{The Wife_sibling}} to finally be happy and free.',
    },
  },
  {
    key: 'mistress',
    legacyId: '5f9b36e0-44ae-4c3d-9762-432c5bb17783',
    name: 'The Mistress',
    gender: 'female',
    is_victim: false,
    plot_role: 'innocent',
    archetype: 'villain',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Gold',
      bio: '{{The Mistress}} went to high school with the whole group and has been married to {{The Co-Worker}} for three years. {{The Mistress_He}} works in the exact same company department as {{The Mistress_his}} in-law and office colleague, {{The Bestie}}. Back in high school {{The Mistress_he}} was best friends with {{The Wife}}, and today {{The Mistress_he}} is close best friends with {{The Sister-in-Law}}.',
      outfit_advice: 'Show-stopping holiday glamour: Option 1 — a shimmering gold sequin cocktail dress with statement heels; Option 2 — a scarlet red satin slip dress with a faux-fur stole; Option 3 — a metallic gold tailored blazer dress with bold red holiday lipstick.',
      outfit_reference_images: [
        '/outfits/christmas/mistress-1.jpg',
        '/outfits/christmas/mistress-2.jpg',
        '/outfits/christmas/mistress-3.jpg',
      ],
      standard_character_photo_url: '/generated-avatars/5f9b36e0-44ae-4c3d-9762-432c5bb17783-synced-candlelit.jpg',
      outfit_image_url: '/generated-avatars/5f9b36e0-44ae-4c3d-9762-432c5bb17783-synced-candlelit.jpg',
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheMistress&eyebrows=default&eyes=default&mouth=smile&clothesColor=b45309&backgroundColor=transparent&top=straight02&hairColor=d6b370&skinColor=ffe0bd&aiPhotoUrl=%2Fgenerated-avatars%2F5f9b36e0-44ae-4c3d-9762-432c5bb17783-synced-candlelit.jpg',
      act_summary: 'Act like the glamorous, outgoing socialite of the friend group who loves holiday parties and knows everyone from high school and the office.',
      act_bullets: [
        'Be affectionate with your {{The Co-Worker_spouse}} of three years, {{The Co-Worker}}.',
        'Gossip and laugh with your current best friend, {{The Sister-in-Law}}.',
        'Reminisce about high school days with your old best friend, {{The Wife}}, and {{The Wife_his}} {{The Husband_spouse}}, {{The Husband}}.',
        'Talk work life with your {{The Bestie_inlaw}} and office colleague, {{The Bestie}}.',
      ],
      traits: ['Glamorous', 'Outgoing', 'Charming', 'Social'],
    },
    motive: {
      legacyId: '1206a2e2-169b-489b-a99d-ffe72f2f07b0',
      motive_type: 'fear',
      strength: 'high',
      notes: 'Terrified that {{The Mistress_his}} secret affair with {{The Husband}} and missing office funds would be exposed to {{The Mistress_his}} {{The Co-Worker_spouse}} ({{The Co-Worker}}), {{The Mistress_his}} old bestie ({{The Wife}}), and {{The Mistress_his}} current bestie ({{The Sister-in-Law}}).',
    },
  },
  {
    key: 'coworker',
    legacyId: '3f17dfda-9758-49fa-a3df-cdf4f6b25ef7',
    name: 'The Co-Worker',
    gender: 'male',
    is_victim: false,
    plot_role: 'innocent',
    archetype: 'witness',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Charcoal',
      bio: '{{The Co-Worker}} grew up right next door to {{The Wife}} and {{The Sister-in-Law}} alongside {{The Co-Worker_his}} younger {{The Bestie_sibling}}, {{The Bestie}}. {{The Co-Worker_He}} has been married to {{The Mistress}} for three years, works at the same company as {{The Husband}}, and briefly dated {{The Wife}} back when they were in high school.',
      outfit_advice: 'Sleek smart-casual holiday attire: Option 1 — a charcoal blazer over a dark merino knit sweater; Option 2 — a charcoal wool cardigan over a crisp white Oxford shirt and dark tie; Option 3 — a tailored slate-grey suit with a black crew-neck knit and a whiskey glass in hand.',
      outfit_reference_images: [
        '/outfits/christmas/coworker-1.jpg',
        '/outfits/christmas/coworker-2.jpg',
        '/outfits/christmas/coworker-3.jpg',
      ],
      standard_character_photo_url: '/generated-avatars/3f17dfda-9758-49fa-a3df-cdf4f6b25ef7-synced-candlelit.jpg',
      outfit_image_url: '/generated-avatars/3f17dfda-9758-49fa-a3df-cdf4f6b25ef7-synced-candlelit.jpg',
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheCoWorker&eyebrows=default&eyes=default&mouth=smile&clothesColor=1e293b&backgroundColor=transparent&top=shortCurly&hairColor=282828&skinColor=ffe0bd&aiPhotoUrl=%2Fgenerated-avatars%2F3f17dfda-9758-49fa-a3df-cdf4f6b25ef7-synced-candlelit.jpg',
      act_summary: 'Be the observant, level-headed older neighbour sibling who grew up next door to {{The Wife}} and {{The Sister-in-Law}} and works at the same company as {{The Husband}}.',
      act_bullets: [
        'Chat about work with {{The Husband}}, since the two of you work in the same department.',
        'Share childhood street memories with the neighbours you grew up next door to, {{The Wife}} and {{The Sister-in-Law}}.',
        'Enjoy the Christmas party alongside your {{The Mistress_spouse}} of three years, {{The Mistress}}.',
        'Joke around with your younger {{The Bestie_sibling}}, {{The Bestie}}.',
      ],
      traits: ['Observant', 'Loyal', 'Composed', 'Grounded'],
    },
    motive: {
      legacyId: '2c10d4fa-76ef-47cd-b051-2aa157f2b9c4',
      motive_type: 'revenge',
      strength: 'high',
      notes: 'Works together with {{The Husband}} (who threatened to ruin {{The Co-Worker_him}} with company audit files), harbors protective feelings for {{The Co-Worker_his}} ex ({{The Wife}}), and is married to {{The Mistress}}.',
    },
  },
  {
    key: 'bestie',
    legacyId: 'f3187085-155b-4389-9bf2-58c6dcc26d1b',
    name: 'The Bestie',
    gender: 'male',
    is_victim: false,
    plot_role: 'innocent',
    archetype: 'sidekick',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Navy Blue',
      bio: '{{The Bestie}} grew up next door to {{The Wife}} and {{The Sister-in-Law}} alongside {{The Bestie_his}} older {{The Co-Worker_sibling}}, {{The Co-Worker}}. {{The Bestie_He}} has been {{The Husband}}\'s best friend since high school and works in the exact same office department as {{The Bestie_his}} {{The Mistress_inlaw}}, {{The Mistress}}.',
      outfit_advice: 'Classic, disarming holiday style: Option 1 — a navy cable-knit sweater layered over a crisp Oxford shirt with dark chinos; Option 2 — a festive navy tartan check blazer over a cream knit sweater; Option 3 — a tailored navy corduroy jacket over a button-down shirt and knit tie.',
      outfit_reference_images: [
        '/outfits/christmas/bestie-1.jpg',
        '/outfits/christmas/bestie-2.jpg',
        '/outfits/christmas/bestie-3.jpg',
      ],
      standard_character_photo_url: '/generated-avatars/f3187085-155b-4389-9bf2-58c6dcc26d1b-synced-candlelit.jpg',
      outfit_image_url: '/generated-avatars/f3187085-155b-4389-9bf2-58c6dcc26d1b-synced-candlelit.jpg',
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheBestie&eyebrows=default&eyes=default&mouth=smile&clothesColor=1e3a8a&backgroundColor=transparent&top=shortFlat&hairColor=4a3123&skinColor=ffe0bd&aiPhotoUrl=%2Fgenerated-avatars%2Ff3187085-155b-4389-9bf2-58c6dcc26d1b-synced-candlelit.jpg',
      act_summary: 'Act like {{The Husband}}\'s easygoing lifelong best friend and the fun-loving younger neighbour {{The Bestie_sibling}} who grew up on the street with everyone.',
      act_bullets: [
        'Talk up how you and {{The Husband}} have been inseparable best friends since high school.',
        'Trade stories with your older {{The Co-Worker_sibling}}, {{The Co-Worker}}, and your {{The Mistress_inlaw}} and co-worker, {{The Mistress}}.',
        'Catch up with {{The Wife}} and {{The Sister-in-Law}}, who grew up in the house right next door to yours.',
        'If anyone asks about 8:15–8:25 PM, back up {{The Sister-in-Law}} and say the two of you were in the kitchen pantry pouring holiday drinks together.',
      ],
      traits: ['Charming', 'Easygoing', 'Friendly', 'Loyal'],
    },
    motive: {
      legacyId: '78c3a198-4be8-4ae6-ab3c-7dcf9a68c182',
      motive_type: 'fear',
      strength: 'moderate',
      notes: 'Besties with {{The Husband}}, who threatened tonight to expose {{The Bestie}}\'s secret fling with {{The Sister-in-Law}} as well as {{The Bestie_his}} workplace cover-up with {{The Bestie_his}} co-worker and {{The Mistress_inlaw}} ({{The Mistress}}).',
    },
  },
];

// Wife's motive (added separately to keep all 5 suspects with motives)
export const CHRISTMAS_WIFE_MOTIVE = {
  legacyId: '45ea4fe2-f279-43af-8329-16ff80d21692',
  motive_type: 'revenge' as const,
  strength: 'high' as const,
  notes: 'Locked in bitter marital issues with {{The Husband}} (who trapped {{The Wife_him}} with a ruthless estate clause) and teamed up with {{The Wife_his}} ex ({{The Co-Worker}}) to break into {{The Husband_his}} study safe tonight.',
};

export interface CanonicalChristmasRelationship {
  charAKey: CanonicalChristmasCharacter['key'];
  charBKey: CanonicalChristmasCharacter['key'];
  dynamics: string[];
  notes: string;
}

export const CHRISTMAS_NIGHTMARE_RELATIONSHIPS: CanonicalChristmasRelationship[] = [
  // 1. WIFE <-> HUSBAND (Married)
  {
    charAKey: 'husband',
    charBKey: 'wife',
    dynamics: ['Married (5 Years)', 'High School Sweethearts'],
    notes: 'Married for 5 years after dating since high school.',
  },
  // 2. HUSBAND <-> Sister (Siblings in Law & High School Classmates)
  {
    charAKey: 'husband',
    charBKey: 'sister',
    dynamics: ['Siblings-in-Law', 'High School Classmates'],
    notes: 'Went to high school together and have been siblings-in-law for 5 years through {{The Husband_his}} marriage to {{The Wife}}.',
  },
  // 3. HUSBAND <-> Mistress (High School Friends)
  {
    charAKey: 'husband',
    charBKey: 'mistress',
    dynamics: ['High School Friends', 'Neighbour Couples'],
    notes: 'Went to high school in the same friend group and live on the same street.',
  },
  // 4. HUSBAND <-> Neighbour A / Co-Worker (Work together)
  {
    charAKey: 'husband',
    charBKey: 'coworker',
    dynamics: ['Work Together', 'Childhood Neighbours'],
    notes: 'Grew up on the same street, went to high school together, and work at the same company.',
  },
  // 5. HUSBAND <-> Neighbour B / Bestie (Besties)
  {
    charAKey: 'husband',
    charBKey: 'bestie',
    dynamics: ['Lifelong Besties', 'High School Friends'],
    notes: 'Best friends since high school who grew up on the same street.',
  },
  // 6. WIFE <-> Sister (Siblings)
  {
    charAKey: 'wife',
    charBKey: 'sister',
    dynamics: ['Siblings', 'Grew Up Together'],
    notes: 'Siblings who grew up together right next door to the two neighbour siblings ({{The Co-Worker}} and {{The Bestie}}).',
  },
  // 7. WIFE <-> Mistress (Old High School Besties)
  {
    charAKey: 'wife',
    charBKey: 'mistress',
    dynamics: ['Old High School Besties'],
    notes: 'Were best friends back in high school before drifting apart after graduation.',
  },
  // 8. Sister <-> Mistress (Current Besties)
  {
    charAKey: 'sister',
    charBKey: 'mistress',
    dynamics: ['Current Besties', 'High School Friends'],
    notes: 'Went to high school together and have been close best friends for the past few years.',
  },
  // 9. WIFE <-> Neighbour A / Co-Worker (High School Exes & Childhood Neighbours)
  {
    charAKey: 'wife',
    charBKey: 'coworker',
    dynamics: ['Childhood Neighbours', 'High School Exes'],
    notes: 'Grew up next door to each other and dated back in high school before {{The Wife_he}} married {{The Husband}} and {{The Co-Worker_he}} married {{The Mistress}}.',
  },
  // 10. Mistress <-> Neighbour A / Co-Worker (Married)
  {
    charAKey: 'mistress',
    charBKey: 'coworker',
    dynamics: ['Married (3 Years)', 'High School Friends'],
    notes: 'Married for 3 years after knowing each other since high school.',
  },
  // 11. Neighbour A / Co-Worker <-> Neighbour B / Bestie (Siblings)
  {
    charAKey: 'coworker',
    charBKey: 'bestie',
    dynamics: ['Siblings', 'Grew Up Together'],
    notes: 'Siblings who grew up together in the house next door to {{The Wife}} and {{The Sister-in-Law}}.',
  },
  // 12. Sister <-> Neighbour B / Bestie (Childhood Neighbours)
  {
    charAKey: 'sister',
    charBKey: 'bestie',
    dynamics: ['Childhood Neighbours', 'High School Friends'],
    notes: 'Grew up in the houses right next door to each other and went to high school together.',
  },
  // 13. Sister <-> Neighbour A / Co-Worker (Childhood Neighbours)
  {
    charAKey: 'sister',
    charBKey: 'coworker',
    dynamics: ['Childhood Neighbours', 'Family Friends'],
    notes: 'Grew up next door to each other and have been close family friends since childhood.',
  },
  // 14. Mistress <-> Neighbour B / Bestie (Co-workers & In-Laws)
  {
    charAKey: 'mistress',
    charBKey: 'bestie',
    dynamics: ['Work Together', 'In-Laws'],
    notes: 'Work in the same office and have been siblings-in-law for 3 years through {{The Mistress_his}} marriage to {{The Bestie_his}} {{The Co-Worker_sibling}} ({{The Co-Worker}}).',
  },
  // 15. WIFE <-> Neighbour B / Bestie (Childhood Neighbours)
  {
    charAKey: 'wife',
    charBKey: 'bestie',
    dynamics: ['Childhood Neighbours', 'Family Friends'],
    notes: 'Grew up next door to each other alongside {{The Wife_his}} {{The Sister-in-Law_sibling}} ({{The Sister-in-Law}}) and {{The Bestie_his}} {{The Co-Worker_sibling}} ({{The Co-Worker}}).',
  },
];

export interface CanonicalChristmasBeat {
  beat_number: number;
  sort_order: number;
  legacyId?: string;
  event_title: string;
  description: string;
  beat_type: 'discovery' | 'twist' | 'clue_reveal';
  timeline_phase: 'pre_crime' | 'crime' | 'investigation' | 'resolution';
  involvedKeys: Array<CanonicalChristmasCharacter['key']>;
}

export const CHRISTMAS_NIGHTMARE_BEATS: CanonicalChristmasBeat[] = [
  {
    beat_number: 1,
    sort_order: 1,
    legacyId: '042f4d6c-89d6-47e9-b92d-df0e40cd511f',
    event_title: '{{The Mistress}}\'s Affair Exposed to {{The Sister-in-Law}}',
    description:
      'Early in the Christmas party, {{The Sister-in-Law}} discovers that {{The Sister-in-Law_his}} own current bestie ({{The Mistress}}, who is married to {{The Co-Worker}} and used to be {{The Wife}}\'s old bestie) is having a secret affair with {{The Husband}}.',
    beat_type: 'discovery',
    timeline_phase: 'pre_crime',
    involvedKeys: ['sister', 'husband', 'mistress'],
  },
  {
    beat_number: 2,
    sort_order: 2,
    legacyId: 'c1b1bb84-5fcf-4819-bc6f-cfda618534ff',
    event_title: 'The Christmas Lights Go Missing',
    description:
      'Before dinner is served, a heavy-duty strand of vintage Christmas tree lights vanishes from the holiday storage box near the hallway closet.',
    beat_type: 'clue_reveal',
    timeline_phase: 'pre_crime',
    involvedKeys: ['sister'],
  },
  {
    beat_number: 3,
    sort_order: 3,
    legacyId: '519c5eb5-1380-4810-af14-ede3aa1bbf73',
    event_title: 'Marital Issues Between {{The Husband}} & {{The Wife}} Overheard by {{The Sister-in-Law}}',
    description:
      '{{The Sister-in-Law}} overhears a bitter, heartbreaking argument between {{The Husband}} and {{The Wife}} behind closed doors as their marriage implodes.',
    beat_type: 'discovery',
    timeline_phase: 'pre_crime',
    involvedKeys: ['husband', 'wife', 'sister'],
  },
  {
    beat_number: 4,
    sort_order: 4,
    legacyId: '48b65411-906f-41d7-9f2d-5b2b68bc2200',
    event_title: '{{The Sister-in-Law}} Ends {{The Husband}} So {{The Wife}} Can Be Happy & Free',
    description:
      'Determined that the only way for {{The Wife}} to finally be happy and free is with {{The Husband}} gone, {{The Sister-in-Law}} slips away from {{The Sister-in-Law_his}} pantry tryst with {{The Bestie}} and uses the missing Christmas lights on {{The Husband}}.',
    beat_type: 'twist',
    timeline_phase: 'crime',
    involvedKeys: ['sister', 'husband', 'wife'],
  },
  {
    beat_number: 5,
    sort_order: 5,
    legacyId: '99c76522-a17e-42e8-8f3e-6c3c79cd3311',
    event_title: '{{The Husband}} Found Dead Wrapped in Christmas Lights',
    description:
      '{{The Husband}} is discovered dead on the living room floor, tightly wrapped in the glowing Christmas lights, turning the childhood neighbours\' holiday gathering into a Christmas Nightmare.',
    beat_type: 'discovery',
    timeline_phase: 'investigation',
    involvedKeys: ['husband', 'wife', 'sister', 'mistress', 'coworker', 'bestie'],
  },
];

export interface CanonicalChristmasClue {
  legacyId?: string;
  title: string;
  clue_type: 'physical' | 'secret' | 'testimony';
  implication_type: 'direct' | 'red_herring';
  evidence_status: 'real' | 'fake';
  round_number: number;
  is_essential: boolean;
  beatNumber: number | null;
  format: string;
  static_image_url?: string | null;
  audio_url?: string | null;
  voice_region?: string | null;
  internal_notes: string;
  description: string;
  generation_prompt: string;
}

export const CHRISTMAS_NIGHTMARE_CLUES: CanonicalChristmasClue[] = [
  // ── ROUND 1 (6 Clues: 4 Main Beat 1-2 Clues + 2 Double-Duty Step-1 Fake Clues, Shuffled) ──
  {
    legacyId: '82260be6-6171-4572-886d-33144a966086',
    title: '❤️',
    clue_type: 'secret',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 1,
    is_essential: true,
    beatNumber: 1,
    format: 'chat',
    static_image_url: null,
    internal_notes: '[FORMAT:chat] [CODE:R1-C1] REAL / CANON (Beat 1) - Exposes the secret affair between {{The Husband}} and {{The Mistress}}, and shows {{The Sister-in-Law}} was suspicious.',
    description:
      '❤️ (7:32 PM): Sneak into the coat closet before dinner. I can\'t keep smiling across the table like we\'re all just one big happy street.\nMe (7:33 PM): Keep your voice down. Someone\'s been staring at us all night like they know.\n❤️ (7:34 PM): Relax, {{The Sister-in-Law_hes}} my best friend. {{The Sister-in-Law_He}}\'d never suspect me.',
    generation_prompt: '',
  },
  {
    legacyId: 'db9ad3d8-94fd-4b67-8de8-f2fcdc75b8ea',
    title: 'Accidental Pocket Voicemail (7:25 PM)',
    clue_type: 'testimony',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 1,
    is_essential: false,
    beatNumber: null,
    format: 'audio',
    static_image_url: null,
    audio_url: '/mystery-audio/61196e53-09c3-427f-8862-30151f2ca75b/db9ad3d8-94fd-4b67-8de8-f2fcdc75b8ea.mp3',
    voice_region: 'en-AU',
    internal_notes: '[FORMAT:audio] [CODE:R1-C2] Fake Arc Step 1 ({{The Wife}} + {{The Co-Worker}}) - Exposes that exes {{The Wife}} and {{The Co-Worker}} conspired to break into {{The Husband}}\'s study safe at 8:00 PM.',
    description:
      'Recording Duration: 22.4 Seconds (7:25 PM • Kitchen Patio):\n{{The Co-Worker}}: "{{The Husband_He}} brought the company audit folder to the house tonight. If {{The Husband_he}} hands that over on Monday, my career is finished."\n{{The Wife}}: "And if I try to leave {{The Husband_him}}, {{The Husband_his}} new prenup clause leaves me with nothing. We grew up on this street together, you promised you\'d protect me."\n{{The Co-Worker}}: "I will. Meet me by the hallway closet at 8PM. We get into {{The Husband_his}} study safe tonight."',
    generation_prompt: '',
  },
  {
    legacyId: '5ff23ebe-96f7-49d5-8222-84ca13a932f4',
    title: 'Hallway Coat Closet (7:40 PM) • Dropped Silver Snowflake Hairpin',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 1,
    is_essential: true,
    beatNumber: 1,
    format: 'physical_prop',
    static_image_url: '/generated-clues/5ff23ebe-96f7-49d5-8222-84ca13a932f4-67c819c94a-mwvx052e.jpg',
    internal_notes: '[FORMAT:physical_prop] [CODE:R1-C3] REAL / CANON (Beat 1) - Visual photo showing {{The Husband}} and {{The Mistress}} inside the coat closet with a dropped sterling silver snowflake hairpin (worn by both siblings) on the carpet outside.',
    description: '',
    generation_prompt: 'A candid low-light hallway photograph showing {{The Husband}} and {{The Mistress}} standing closely together talking by an open wooden coat closet doorway while a vintage silver snowflake hairpin lies on the dark hallway runner carpet in the foreground. (No text).',
  },
  {
    legacyId: '17ed93b2-803b-4fa4-964c-3a5800c6bad8',
    title: 'Hallway Utility Closet Shelves (7:00 PM Stocked -> 7:55 PM Empty)',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 1,
    is_essential: true,
    beatNumber: 2,
    format: 'physical_prop',
    static_image_url: '/generated-clues/17ed93b2-803b-4fa4-964c-3a5800c6bad8-6aed0c43dde6.jpg',
    internal_notes: '[FORMAT:physical_prop] [CODE:R1-C4] REAL / CANON (Beat 2) - Visual photo showing the tan leather work gloves on the top shelf and the vintage red-and-green Christmas tree lights on the middle shelf of the utility closet.',
    description: '',
    generation_prompt: 'A clear, well-lit close-up photograph of an open wooden hallway utility closet with two prominent shelves: tan insulated leather work gloves on the top shelf, and an open storage box overflowing with a tangled coil of glowing red and green vintage Christmas tree lights on the middle shelf. (No text).',
  },
  {
    legacyId: '57288d71-e579-48ed-8e09-40251d2b67b7',
    title: '🤫💼',
    clue_type: 'secret',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 1,
    is_essential: false,
    beatNumber: null,
    format: 'chat',
    static_image_url: null,
    internal_notes: '[FORMAT:chat] [CODE:R1-C5] Fake Arc Step 1 ({{The Mistress}} + {{The Bestie}}) - Exposes that co-workers {{The Mistress}} and {{The Bestie}} were both threatened by {{The Husband}} and plotted to wipe his phone.',
    description:
      '🤫💼 (7:35 PM): {{The Husband_He}} just cornered me in the kitchen. Said {{The Husband_hes}} never leaving {{The Wife_him}}, and if I make a scene tonight {{The Husband_hes}} telling my {{The Co-Worker_spouse}} AND reporting the missing money from our shared office department account.\nMe (7:36 PM): Are you kidding?! {{The Husband_He}} just threatened me too, and {{The Husband_hes}} supposed to be my best friend! Said if I don\'t end my secret fling tonight, {{The Husband_hes}} telling my older {{The Co-Worker_sibling}} everything.\n🤫💼 (7:37 PM): Everything {{The Husband_he}} has on us is on {{The Husband_his}} phone. Help me get it unlocked before dessert or we\'re both done.',
    generation_prompt: '',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111104',
    title: 'Living Room Smart-Outlet Surge Log (8:18 PM - 8:22 PM)',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 1,
    is_essential: true,
    beatNumber: 4,
    format: 'search_log',
    static_image_url: null,
    internal_notes: '[FORMAT:search_log] [CODE:R1-C6] REAL / CANON (Beat 4) - Pinpoints the exact time of the living room blackout and 1,840W outlet overload fault to 8:19:12 PM without yet revealing who took the Christmas lights or gloves.',
    description:
      'SMART HOME POWER LOG • GROUND FLOOR LIVING ROOM:\n• 8:18:04 PM - Zone 1 Overhead Dimmer: Manual switch -> 0% (DARK)\n• 8:19:12 PM - Wall Outlet #1 (Tree Corner): Load spike 0W -> 1,840W (OVERLOAD FAULT / SHORT CIRCUIT)\n• 8:21:55 PM - Side Hallway Door Sensor (Pantry Corridor): OPEN -> CLOSED',
    generation_prompt: '',
  },

  // ── ROUND 2 (6 Clues: 4 Main Beat 2-4 Clues + 2 Double-Duty Step-2 Fake Clues, Shuffled) ──
  {
    legacyId: 'a1111111-1111-4111-8111-111111111105',
    title: '2F Upstairs Study Wall Safe (8:06 PM)',
    clue_type: 'physical',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 2,
    is_essential: false,
    beatNumber: null,
    format: 'physical_prop',
    static_image_url: '/generated-clues/a1111111-1111-4111-8111-111111111105-84d1617369-mwvx1h05.jpg',
    internal_notes: '[FORMAT:physical_prop] [CODE:R2-C1] Fake Arc Step 2 ({{The Wife}} + {{The Co-Worker}}) - Visual photo showing {{The Wife}} and {{The Co-Worker}} beside the open upstairs study safe with the tan leather work gloves.',
    description: '',
    generation_prompt: 'A dramatic low-light photograph inside a dark wood-paneled upstairs study showing {{The Co-Worker}} with tan insulated leather work gloves beside an open wall safe while {{The Wife}} stands beside the mahogany desk looking toward the doorway. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111101',
    title: 'Upstairs Hallway Nursery-Monitor Audio (8:12 PM)',
    clue_type: 'testimony',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 2,
    is_essential: true,
    beatNumber: 3,
    format: 'audio',
    static_image_url: null,
    audio_url: '/mystery-audio/61196e53-09c3-427f-8862-30151f2ca75b/a1111111-1111-4111-8111-111111111101.mp3',
    voice_region: 'en-AU',
    internal_notes: '[FORMAT:audio] [CODE:R2-C2] REAL / CANON (Beat 3) - Captures the explosive marital fight between {{The Husband}} and {{The Wife}}, overheard outside the door at 8:12 PM.',
    description:
      'Recording Duration: 19.2 Seconds (8:12 PM • Upstairs Master Hallway):\n{{The Wife}}: "Why are you doing this to me?! Everyone downstairs knows our marriage is a lie! Just let me go!"\n{{The Husband}}: "You\'re never leaving me. You\'ll fix your face, come downstairs, and play the grateful {{The Wife_spouse}}, or I\'ll ruin your whole family."\n[Sound of footsteps retreating from the door and a hushed voice in the hallway: "{{The Husband_Hes}} never going to let {{The Wife_him}} be happy..."]',
    generation_prompt: '',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111102',
    title: 'Torn Place-Card Note in Bathroom (8:14 PM)',
    clue_type: 'secret',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 2,
    is_essential: true,
    beatNumber: 3,
    format: 'handwritten_note',
    static_image_url: null,
    internal_notes: '[FORMAT:handwritten_note] [CODE:R2-C3] REAL / CANON (Beat 3) - Written right after overhearing the marital fight; ambiguous enough to sound like a childhood neighbour or sibling.',
    description:
      'Recovered: Torn in half inside the upstairs bathroom bin (8:14 PM)\n"...heard {{The Husband_him}} through the bedroom door just now. First the coat closet, and now {{The Husband_he}} swears {{The Wife_he}}\'ll never leave this marriage free. Twenty years on this street and {{The Husband_he}} still thinks {{The Husband_he}} owns us. Not after tonight."',
    generation_prompt: '',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111106',
    title: 'Prescription: Zolpidem Tartrate Drops (8:08 PM • Kitchen Bar)',
    clue_type: 'physical',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 2,
    is_essential: false,
    beatNumber: null,
    format: 'medical_rx',
    static_image_url: '/generated-clues/a1111111-1111-4111-8111-111111111106-877348cea3-mwvx1r9s.jpg',
    internal_notes: '[FORMAT:medical_rx] [CODE:R2-C4] Fake Arc Step 2 ({{The Mistress}} + {{The Bestie}}) - Visual bar photo + Rx label showing the two co-workers spiking the eggnog cup with fast-acting sleeping drops.',
    description:
      'Medication: Zolpidem Tartrate Oral Drops (10mg/mL Fast-Acting Sedative)\nPrescribed to: [Torn] ... Co. Group Plan #B-04\nIssue date: Dec 18 (Found 8:08 PM • Kitchen Bar)\nRef: RX-409-12\nWARNING: 5 drops in warm/spiced alcohol induces 20-minute sleep onset (Sub-lethal dose).',
    generation_prompt: 'A candid kitchen bar photograph showing {{The Mistress}} and {{The Bestie}} leaning closely over a marble bar counter holding a small glass dropper bottle above a crystal cup of spiced eggnog. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111103',
    title: '❤️‍🔥',
    clue_type: 'secret',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 2,
    is_essential: true,
    beatNumber: 4,
    format: 'chat',
    static_image_url: null,
    internal_notes: '[FORMAT:chat] [CODE:R2-C5] REAL / CANON (Beat 4) - Proves {{The Sister-in-Law}} left {{The Bestie}} alone in the pantry from 8:15 to 8:25 PM and asked {{The Bestie_him}} to lie for {{The Sister-in-Law_his}} alibi.',
    description:
      'Me (8:25 PM): Where did you go?? You said you were stepping out of the pantry for one second, you\'ve been gone 10 minutes.\n❤️‍🔥 (8:26 PM): Shh. If anyone asks where I was between 8:15 and 8:25, tell them I was in the pantry with you the whole time.\nMe (8:27 PM): Of course I\'ll cover for you, if my older {{The Co-Worker_sibling}} or your {{The Wife_sibling}} found out I was hooking up with {{The Wife}}\'s younger {{The Sister-in-Law_sibling}}, we\'d both be dead. Wait, why are your hands shaking?',
    generation_prompt: '',
  },
  {
    legacyId: '3e8e61ad-32f1-4c0a-a75b-024969eef8f4',
    title: 'Hallway Storage & Breaker Cam (7:52 PM - 8:03 PM)',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 2,
    is_essential: true,
    beatNumber: 2,
    format: 'cctv',
    static_image_url: 'https://tlmgiveaotdhhvhebwvc.supabase.co/storage/v1/object/public/character-images/clue-images/61196e53-09c3-427f-8862-30151f2ca75b/3e8e61ad-32f1-4c0a-a75b-024969eef8f4-7d01fd61bf30.jpg',
    internal_notes: '[FORMAT:cctv] [CODE:R2-C6] REAL / CANON (Beat 2 + Ambiguous Overlap) - Visual CCTV showing {{The Sister-in-Law}} carrying the Christmas tree lights out of the storage closet and {{The Co-Worker}} wearing the tan leather work gloves at the 2F breaker panel.',
    description:
      'Header: CAM 01 • HALLWAY STORAGE & 2F STUDY BREAKER\nTimestamp: 7:52 PM - 8:03 PM',
    generation_prompt: 'A high-angle interior hallway photograph in a dimly lit holiday hallway showing {{The Sister-in-Law}} stepping out of the open storage closet holding a tangled coil of red and green Christmas tree lights while {{The Co-Worker}} wears tan insulated leather work gloves at the open wall breaker panel. Raw unedited photo, NO camera HUD, NO timestamp text, NO numbers.',
  },

  // ── ROUND 3 (4 Clues: 2 Step-3 Alibi/Hole Clues + 2 Final Beat 4-5 Resolution Clues, Shuffled) ──
  {
    legacyId: 'a1111111-1111-4111-8111-111111111109',
    title: 'Crime Scene Report: Wrapped in Christmas Lights (8:30 PM)',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 3,
    is_essential: true,
    beatNumber: 5,
    format: 'document',
    static_image_url: '/generated-clues/a1111111-1111-4111-8111-111111111109-6c6f2b97ac73.jpg',
    internal_notes: '[FORMAT:document] [CODE:R3-C1] REAL / CANON (Beat 5) - Confirms cause of death was the 25-foot Christmas lights at 8:19:12 PM (not the sedative drops or work gloves), and shows the matching sibling silver snowflake hairpin snagged inside the knotted light cord.',
    description:
      'LAB: FORENSIC CRIME SCENE UNIT\nTIME: DEATH AT 8:19:12 PM • 1ST FLOOR TREE CORNER\n• Cause of Death: 25-ft vintage Christmas light cord (Wall Outlet #1).\n• Toxicology: Zolpidem 0.04 mg/L (mild sedation only; non-fatal).\n• Cord Trace: Sterling silver snowflake hairpin (matching sibling set) snagged inside wire knot.',
    generation_prompt: 'A macro forensic close-up photograph on a dark hardwood floor beside a Christmas tree showing a tangled, knotted cord of glowing red and green vintage Christmas tree lights with a metallic sterling silver snowflake hairpin snagged right in the middle of the knotted wire. Raw unedited photo, NO text.',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111107',
    title: '2F Upstairs Study Fireplace • Locked Inside (8:18 PM - 8:21 PM)',
    clue_type: 'physical',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 3,
    is_essential: false,
    beatNumber: null,
    format: 'physical_prop',
    static_image_url: '/generated-clues/a1111111-1111-4111-8111-111111111107-d26908ddd5-mwvx497b.jpg',
    internal_notes: '[FORMAT:physical_prop] [CODE:R3-C2] Fake Arc Step 3 & Fatal Hole ({{The Wife}} + {{The Co-Worker}}) - Visual photo showing {{The Wife}} and {{The Co-Worker}} burning the stolen safe papers in the locked 2nd-floor study fireplace during the 8:19 PM murder downstairs.',
    description: '',
    generation_prompt: 'A dramatic low-light photograph inside the upstairs wood-paneled study showing {{The Wife}} and {{The Co-Worker}} kneeling together beside a glowing brick fireplace burning a folder of papers in the flames. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111110',
    title: 'Recovered Party Polaroid: "Happy & Free"',
    clue_type: 'secret',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 3,
    is_essential: true,
    beatNumber: 4,
    format: 'handwritten_note',
    static_image_url: '/generated-clues/a1111111-1111-4111-8111-111111111110-a420608fa3de.jpg',
    internal_notes: '[FORMAT:handwritten_note] [CODE:R3-C3] REAL / CANON (Beat 4 True Motive) - Visual Polaroid photo of {{The Sister-in-Law}} and {{The Wife}} + cryptic handwritten message on the back that requires cross-referencing the 8:19 PM study alibi and pantry chat.',
    description:
      'Recovered: Written on back of Polaroid inside coat pocket near pantry\n"We grew up on this street together, and I meant it when I promised you wouldn\'t be trapped in this marriage another year. After what I heard {{The Husband_him}} say to you upstairs at 8:12 PM, I knew there was only one way you\'d ever be happy and free."',
    generation_prompt: 'A warm candid instant Polaroid photograph of {{The Sister-in-Law}} and {{The Wife}} hugging closely in front of a glowing Christmas tree at the holiday party. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111108',
    title: 'Living Room Sofa & Dining Arch Cam (8:16 PM - 8:22 PM)',
    clue_type: 'physical',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 3,
    is_essential: false,
    beatNumber: null,
    format: 'cctv',
    static_image_url: '/generated-clues/a1111111-1111-4111-8111-111111111108-7d4ff4737f-mwvx4pua.jpg',
    internal_notes: '[FORMAT:cctv] [CODE:R3-C4] Fake Arc Step 3 & Fatal Hole ({{The Mistress}} + {{The Bestie}}) - Visual CCTV still proving {{The Husband}} was still alive on the sofa at 8:16:10 PM when {{The Mistress}} slipped out with his unlocked phone to the dining table.',
    description:
      'Header: CAM 02 • LIVING ROOM DOOR (8:16 PM) -> DINING TABLE (8:17-8:22 PM)\nTimestamp: 8:16:10 PM - 8:22:00 PM',
    generation_prompt: 'A high-angle interior living room photograph showing {{The Mistress}} slipping out of a living room doorway holding a glowing smartphone while {{The Husband}} is visible in the background slouched but alive on a long Chesterfield sofa. Raw unedited photo, NO camera HUD, NO timestamp text, NO numbers.',
  },
];

export interface CanonicalChristmasSubplotSpec {
  id: string;
  title: string;
  theme: string;
  description: string;
  primaryKey: CanonicalChristmasCharacter['key'];
  secondaryKey: CanonicalChristmasCharacter['key'];
  beats: Array<{
    beat_number: number;
    description: string;
    linkedBeatNumber: number | null;
  }>;
}

export const CHRISTMAS_NIGHTMARE_SUBPLOTS: CanonicalChristmasSubplotSpec[] = [
  {
    id: 'd24f21ba-66f3-45de-b6bc-c5543c7ef4b2',
    title: '{{The Wife}} & {{The Co-Worker}}: The Study Safe & Prenup Heist',
    theme: 'Childhood exes, workplace audit fraud, and a ruthless marriage prenup',
    description:
      'Childhood neighbours and exes {{The Wife}} and {{The Co-Worker}} (Neighbour A) team up during the party to break into {{The Husband}}\'s upstairs study safe, stealing and burning the company audit files that would ruin {{The Co-Worker}} and the prenup clause trapping {{The Wife}}.',
    primaryKey: 'wife',
    secondaryKey: 'coworker',
    beats: [
      {
        beat_number: 1,
        description: 'Step 1 (The Trigger): {{The Co-Worker}} learns {{The Husband}} brought company audit files to ruin {{The Co-Worker_him}} on Monday, while {{The Wife}} reveals {{The Husband}}\'s prenup clause leaves {{The Wife_him}} penniless. The exes agree to meet by the hallway closet at 8:00 PM.',
        linkedBeatNumber: 1,
      },
      {
        beat_number: 2,
        description: 'Step 2 (The Escalation): {{The Co-Worker}} grabs heavy work gloves from the hallway storage closet at 7:58 PM and {{The Wife}} flips the study circuit breaker at 8:03 PM so they can pry open the upstairs study safe.',
        linkedBeatNumber: 2,
      },
      {
        beat_number: 3,
        description: 'Step 3 (The Suspicious Action & Hole): From 8:18 to 8:21 PM, {{The Wife}} and {{The Co-Worker}} are locked inside the upstairs study burning the stolen papers in the fireplace, proving they were upstairs when the 8:19 PM living room attack happened.',
        linkedBeatNumber: 4,
      },
    ],
  },
  {
    id: 'b35f32cb-77a4-46ef-97cd-d6654d8fg5c3',
    title: '{{The Mistress}} & {{The Bestie}}: The Spiked Eggnog & Phone Wipe',
    theme: 'Office blackmail, secret affairs, and a drugged holiday drink',
    description:
      'Co-workers and in-laws {{The Mistress}} and {{The Bestie}} (Neighbour B) panic when {{The Husband}} threatens to expose both {{The Mistress}}\'s affair/work account and {{The Bestie}}\'s secret fling with {{The Sister-in-Law}}, leading them to spike {{The Husband_his}} eggnog with sleep drops to wipe {{The Husband_his}} phone.',
    primaryKey: 'mistress',
    secondaryKey: 'bestie',
    beats: [
      {
        beat_number: 1,
        description: 'Step 1 (The Trigger): {{The Husband}} refuses to leave {{The Wife}} for {{The Mistress}} and threatens to expose both {{The Mistress}}\'s affair to {{The Co-Worker}} and {{The Bestie}}\'s secret fling with {{The Sister-in-Law}}.',
        linkedBeatNumber: 1,
      },
      {
        beat_number: 2,
        description: 'Step 2 (The Escalation): At 8:08 PM, {{The Mistress}} and {{The Bestie}} spike {{The Husband}}\'s spiced eggnog with fast-acting sleep drops so they can unlock {{The Husband_his}} phone with FaceID and delete {{The Husband_his}} blackmail files.',
        linkedBeatNumber: 2,
      },
      {
        beat_number: 3,
        description: 'Step 3 (The Suspicious Action & Hole): At 8:16 PM, {{The Mistress}} steals {{The Husband}}\'s phone while {{The Husband_he}} is groggy but alive on the living room sofa, and returns to the dining table by 8:18 PM, accidentally leaving {{The Husband_him}} easy for {{The Sister-in-Law}} to overpower at 8:19 PM.',
        linkedBeatNumber: 4,
      },
    ],
  },
];

export const CHRISTMAS_NIGHTMARE_SUBPLOT = CHRISTMAS_NIGHTMARE_SUBPLOTS[0];

/**
 * Given an existing list of characters for a Christmas Nightmare mystery,
 * maps each canonical character to an existing character ID (or generates a deterministic UUID).
 */
export function mapChristmasCharacterIds(existingChars: any[] | null | undefined): Record<CanonicalChristmasCharacter['key'], string> {
  const list = Array.isArray(existingChars) ? existingChars : [];
  const usedIds = new Set<string>();
  const result = {} as Record<CanonicalChristmasCharacter['key'], string>;

  // 1. Match by legacy ID or exact role name
  for (const spec of CHRISTMAS_NIGHTMARE_CHARACTERS) {
    const match = list.find(
      (c) =>
        c?.id &&
        !usedIds.has(c.id) &&
        (c.id === spec.legacyId ||
          String(c.name || '').toLowerCase().includes(spec.name.toLowerCase()))
    );
    if (match) {
      result[spec.key] = match.id;
      usedIds.add(match.id);
    }
  }

  // 2. Match by plot role (victim / killer)
  for (const spec of CHRISTMAS_NIGHTMARE_CHARACTERS) {
    if (result[spec.key]) continue;
    if (spec.is_victim) {
      const m = list.find((c) => c?.id && !usedIds.has(c.id) && (c.is_victim || c.plot_role === 'victim'));
      if (m) {
        result[spec.key] = m.id;
        usedIds.add(m.id);
        continue;
      }
    }
    if (spec.plot_role === 'killer') {
      const m = list.find((c) => c?.id && !usedIds.has(c.id) && c.plot_role === 'killer');
      if (m) {
        result[spec.key] = m.id;
        usedIds.add(m.id);
        continue;
      }
    }
  }

  // 3. Assign any remaining existing characters in order, or fallback to legacyId / randomUUID
  for (const spec of CHRISTMAS_NIGHTMARE_CHARACTERS) {
    if (result[spec.key]) continue;
    const nextExisting = list.find((c) => c?.id && !usedIds.has(c.id));
    if (nextExisting) {
      result[spec.key] = nextExisting.id;
      usedIds.add(nextExisting.id);
    } else {
      result[spec.key] = spec.legacyId || crypto.randomUUID();
    }
  }

  return result;
}

export const CHRISTMAS_NIGHTMARE_ID = '61196e53-09c3-427f-8862-30151f2ca75b';

export const CHRISTMAS_NIGHTMARE_MYSTERY = {
  id: CHRISTMAS_NIGHTMARE_ID,
  title: CHRISTMAS_NIGHTMARE_TITLE,
  theme: CHRISTMAS_NIGHTMARE_THEME,
  description: CHRISTMAS_NIGHTMARE_DESCRIPTION,
  inside_jokes: CHRISTMAS_NIGHTMARE_INSIDE_JOKES,
  characters: CHRISTMAS_NIGHTMARE_CHARACTERS.map((c) => ({
    ...c,
    id: c.legacyId || c.key,
  })),
  clues: CHRISTMAS_NIGHTMARE_CLUES.map((cl, idx) => ({
    ...cl,
    id: cl.legacyId || `cn-clue-${idx + 1}`,
  })),
  plot_beats: CHRISTMAS_NIGHTMARE_BEATS.map((b) => ({
    ...b,
    id: b.legacyId || `cn-beat-${b.beat_number}`,
  })),
};

