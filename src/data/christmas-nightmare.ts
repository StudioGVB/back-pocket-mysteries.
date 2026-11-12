import crypto from 'crypto';

export const CHRISTMAS_NIGHTMARE_TITLE = 'Christmas Nightmare';
export const CHRISTMAS_NIGHTMARE_THEME = 'Christmas Party';
export const CHRISTMAS_NIGHTMARE_DESCRIPTION =
  'They all grew up together on the same street: two sisters and two neighbour brothers whose lives have been intertwined since childhood. Tonight, beneath the twinkling lights of their annual Christmas dinner party, years of tangled history, secret affairs, and broken marriages finally snap. When The Husband is discovered dead in the living room, tightly wrapped in a glowing strand of Christmas tree lights, the holiday reunion turns into a Christmas Nightmare. Everyone in the room is family, a childhood neighbour, a spouse, or a secret lover, and every single one of them is hiding a betrayal.';
export const CHRISTMAS_NIGHTMARE_INSIDE_JOKES =
  'Keep your neighbours close, your sisters closer, and never trust anyone near the Christmas tree lights.';

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
    act_summary: string;
    act_bullets: string[];
    traits: string[];
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
      bio: '{{The Husband}} grew up with the whole group and sits right at the center of tonight\'s tangled holiday web. He is married to {{The Wife}}, siblings-in-law and former childhood classmates with {{The Sister-in-Law}}, lifelong besties with {{The Bestie}} (Neighbour B), and works together with {{The Co-Worker}} (Neighbour A). Behind closed doors, his marriage to {{The Wife}} is falling apart, and he has been having a secret affair with {{The Mistress}}, who is married to {{The Co-Worker}} and used to be {{The Wife}}\'s old bestie. Tonight, {{The Husband}} was found dead, tightly wrapped in Christmas lights.',
      outfit_advice: 'Sharp holiday host attire: a tailored velvet blazer or cashmere turtleneck in deep crimson or forest green, dark tailored trousers, and a luxury dress watch.',
      outfit_reference_images: [
        '/outfits/lotr/the-host-m-1.jpg',
        '/outfits/lotr/the-host-m-2.jpg',
        '/outfits/lotr/the-host-m-3.jpg',
      ],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheHusband&eyebrows=default&eyes=default&mouth=smile&clothesColor=991b1b&backgroundColor=transparent&top=shortWaved&hairColor=282828&skinColor=ffe0bd',
      act_summary: 'Act like the charming, controlling king of the Christmas party while hiding your explosive marital issues with {{The Wife}} and your secret affair with {{The Mistress}}.',
      act_bullets: [
        'Toast loudly to childhood friendships and growing up together while avoiding real questions about your marriage.',
        'Trade secretive, lingering glances with {{The Mistress}} whenever {{The Co-Worker}} and {{The Wife}} look away.',
        'Treat {{The Bestie}} like your ride-or-die brother and confidant.',
        'Talk shop with {{The Co-Worker}} as if you aren\'t secretly sleeping with his wife.',
      ],
      traits: ['Controlling', 'Charming', 'Deceitful', 'Two-Faced'],
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
      bio: '{{The Wife}} grew up next door to the two neighbour brothers ({{The Co-Worker}} and {{The Bestie}}) alongside her sister, {{The Sister-in-Law}}. She is married to {{The Husband}}, though their marriage has been imploding behind closed doors. Tonight\'s guest list is a minefield of childhood history: {{The Co-Worker}} (Neighbour A) is her ex, and {{The Co-Worker}}\'s wife ({{The Mistress}}) used to be {{The Wife}}\'s old bestie before a falling out, while now being current besties with {{The Sister-in-Law}}. Tonight, {{The Wife}} secretly teamed up with her ex ({{The Co-Worker}}) to break into {{The Husband}}\'s study safe and burn his ruthless prenup clause.',
      outfit_advice: 'Effortlessly glamorous holiday hostess: an emerald green silk midi dress or velvet jumpsuit, gold statement earrings, and heels.',
      outfit_reference_images: [
        '/outfits/lotr/the-star-1.jpg',
        '/outfits/lotr/the-star-2.jpg',
        '/outfits/lotr/the-star-3.jpg',
      ],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheWife&eyebrows=default&eyes=default&mouth=smile&clothesColor=065f46&backgroundColor=transparent&top=straight01&hairColor=4a3123&skinColor=ffe0bd',
      act_summary: 'Maintain a brittle, picture-perfect Christmas hostess smile that cracks into raw heartbreak whenever your marriage to {{The Husband}} or your history with {{The Mistress}} and {{The Co-Worker}} comes up.',
      act_bullets: [
        'Lean heavily on your sister, {{The Sister-in-Law}}, as your fiercest supporter.',
        'Keep a polite but icy distance from your old bestie, {{The Mistress}}.',
        'Exchange nervous, conspiratorial glances with your childhood neighbour and ex, {{The Co-Worker}}, about the upstairs study safe.',
        'Try to downplay the bitter marital fight you had with {{The Husband}} earlier tonight.',
      ],
      traits: ['Heartbroken', 'Poised', 'Guarded', 'Emotional'],
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
      bio: '{{The Sister-in-Law}} grew up with the entire group as {{The Wife}}\'s sister and the childhood neighbour to {{The Co-Worker}} and {{The Bestie}}. She is siblings-in-law and former childhood classmates with {{The Husband}}, current besties with {{The Mistress}}, good friends with {{The Co-Worker}}, and is having a secret fling with {{The Bestie}}. Tonight, after discovering her current bestie ({{The Mistress}}) was having an affair with {{The Husband}} and overhearing {{The Husband}} tell {{The Wife}} she would never be free of him, {{The Sister-in-Law}} slipped away from her pantry tryst with {{The Bestie}} and used the missing Christmas lights to end {{The Husband}} so her sister could finally be happy and free.',
      outfit_advice: 'Sleek winter chic: a shimmering silver sweater dress or satin blouse with tailored trousers, layered silver jewelry, and dark berry lipstick.',
      outfit_reference_images: [
        '/outfits/lotr/the-sister-1.jpg',
        '/outfits/lotr/the-sister-2.jpg',
        '/outfits/lotr/the-sister-3.jpg',
      ],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheSisterInLaw&eyebrows=default&eyes=default&mouth=smile&clothesColor=64748b&backgroundColor=transparent&top=curvy&hairColor=a55728&skinColor=ffe0bd',
      act_summary: 'Play the fiercely protective sister comforting {{The Wife}}, while hiding your shock over {{The Mistress}}\'s betrayal and letting others think your only secret tonight was your fling with {{The Bestie}}.',
      act_bullets: [
        'Fiercely protect your sister, {{The Wife}}, whenever anyone brings up her marital problems with {{The Husband}}.',
        'Struggle to hide your anger toward your current bestie, {{The Mistress}}, after uncovering her affair with {{The Husband}}.',
        'Lean on {{The Bestie}} to vouch for your pantry alibi between 8:15 and 8:25 PM.',
        'Stay warm and friendly with your childhood neighbour {{The Co-Worker}}, who has no idea his wife was cheating with {{The Husband}}.',
      ],
      traits: ['Fiercely Protective', 'Loyal', 'Calculating', 'Unforgiving'],
    },
    motive: {
      legacyId: '74df0c99-4a91-495c-b60a-98da5de9e10e',
      motive_type: 'love',
      strength: 'critical',
      notes: 'After exposing that her current bestie ({{The Mistress}}) was having an affair with {{The Husband}} and overhearing {{The Husband}} and {{The Wife}}\'s marital issues, {{The Sister-in-Law}} ended {{The Husband}} with the Christmas lights because she chose for her sister to finally be happy and free.',
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
      bio: 'Part of the tight-knit childhood group, {{The Mistress}} is married to {{The Co-Worker}} (Neighbour A) and works alongside his brother, {{The Bestie}} (Neighbour B). She used to be old besties with {{The Wife}}, and is now current besties with {{The Sister-in-Law}}. Behind everyone\'s back, she has been carrying on a secret affair with {{The Husband}}. When {{The Husband}} refused to leave {{The Wife}} tonight and threatened to expose both the affair and missing workplace funds, {{The Mistress}} and her co-worker {{The Bestie}} spiked {{The Husband}}\'s holiday drink with sleeping drops to unlock and wipe his phone at 8:16 PM.',
      outfit_advice: 'Show-stopping holiday glamour: a gold sequin or scarlet cocktail dress, statement heels, and bold holiday makeup.',
      outfit_reference_images: [
        '/outfits/lotr/the-runner-up-1.jpg',
        '/outfits/lotr/the-runner-up-2.jpg',
        '/outfits/lotr/the-runner-up-3.jpg',
      ],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheMistress&eyebrows=default&eyes=default&mouth=smile&clothesColor=b45309&backgroundColor=transparent&top=straight02&hairColor=d6b370&skinColor=ffe0bd',
      act_summary: 'Act like the affectionate wife to {{The Co-Worker}} and devoted bestie to {{The Sister-in-Law}}, while panicking that you and {{The Bestie}} drugged {{The Husband}}\'s drink to steal his phone just minutes before he died.',
      act_bullets: [
        'Overcompensate with affection toward your husband, {{The Co-Worker}}, so he doesn\'t suspect your affair with {{The Husband}}.',
        'Lean on your current bestie, {{The Sister-in-Law}}, without realizing she already discovered your secret.',
        'Navigate the awkward history with your old bestie, {{The Wife}}, who also happens to be your husband\'s ex.',
        'Whisper urgently with your brother-in-law and co-worker, {{The Bestie}}, about what you two did with {{The Husband}}\'s phone.',
      ],
      traits: ['Seductive', 'Secretive', 'Charming', 'Defensive'],
    },
    motive: {
      legacyId: '1206a2e2-169b-489b-a99d-ffe72f2f07b0',
      motive_type: 'fear',
      strength: 'high',
      notes: 'Terrified that her secret affair with {{The Husband}} and missing office funds would be exposed to her husband ({{The Co-Worker}}), her old bestie ({{The Wife}}), and her current bestie ({{The Sister-in-Law}}).',
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
      bio: '{{The Co-Worker}} (Neighbour A) grew up right next door to the two sisters ({{The Wife}} and {{The Sister-in-Law}}) alongside his brother, {{The Bestie}} (Neighbour B). He works together with {{The Husband}}, is married to {{The Mistress}}, is close childhood friends with {{The Sister-in-Law}}, and is exes with {{The Wife}}. Discovering {{The Husband}} brought company audit files tonight to ruin his career on Monday, {{The Co-Worker}} grabbed heavy work gloves from the hallway closet and teamed up with his ex ({{The Wife}}) to pry open {{The Husband}}\'s upstairs study safe and burn the files at 8:20 PM.',
      outfit_advice: 'Sleek smart-casual holiday attire: a charcoal blazer over a dark merino knit sweater, tailored trousers, and a whiskey glass in hand.',
      outfit_reference_images: [
        '/outfits/lotr/the-flameout-m-1.jpg',
        '/outfits/lotr/the-flameout-m-2.jpg',
        '/outfits/lotr/the-flameout-m-3.jpg',
      ],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheCoWorker&eyebrows=default&eyes=default&mouth=smile&clothesColor=1e293b&backgroundColor=transparent&top=shortCurly&hairColor=282828&skinColor=ffe0bd',
      act_summary: 'Be the observant, brooding neighbour brother who balances marriage to {{The Mistress}}, protective loyalty to your ex ({{The Wife}}), and hiding the fact that you broke into the upstairs study safe.',
      act_bullets: [
        'Bring up workplace tensions from working together with {{The Husband}}.',
        'Share nostalgic childhood neighbour memories with {{The Sister-in-Law}} and your ex, {{The Wife}}.',
        'Hide why you took the work gloves from the hallway storage closet at 7:58 PM.',
        'Stick close to your brother, {{The Bestie}}, whenever accusations start flying.',
      ],
      traits: ['Observant', 'Loyal', 'Brooding', 'Protective'],
    },
    motive: {
      legacyId: '2c10d4fa-76ef-47cd-b051-2aa157f2b9c4',
      motive_type: 'revenge',
      strength: 'high',
      notes: 'Works together with {{The Husband}} (who threatened to ruin him with company audit files), harbors protective feelings for his ex ({{The Wife}}), and is married to {{The Mistress}}.',
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
      bio: '{{The Bestie}} (Neighbour B) grew up next door to {{The Wife}} and {{The Sister-in-Law}} alongside his brother, {{The Co-Worker}} (Neighbour A). He is {{The Husband}}\'s bestie, works as a co-worker with his sister-in-law {{The Mistress}}, and is having a secret fling with {{The Sister-in-Law}}. Tonight, after {{The Husband}} threatened to expose both his secret fling with {{The Sister-in-Law}} and workplace irregularities with {{The Mistress}}, {{The Bestie}} helped {{The Mistress}} spike {{The Husband}}\'s eggnog to wipe his phone at 8:16 PM, and then agreed to be {{The Sister-in-Law}}\'s pantry alibi without realizing she slipped away for 10 minutes.',
      outfit_advice: 'Classic, disarming holiday style: a navy cable-knit sweater layered over a crisp Oxford shirt, dark chinos, and an easygoing smile.',
      outfit_reference_images: [
        '/outfits/lotr/the-producer-plant-m-1.jpg',
        '/outfits/lotr/the-producer-plant-m-2.jpg',
        '/outfits/lotr/the-producer-plant-m-3.jpg',
      ],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TheBestie&eyebrows=default&eyes=default&mouth=smile&clothesColor=1e3a8a&backgroundColor=transparent&top=shortFlat&hairColor=4a3123&skinColor=ffe0bd',
      act_summary: 'Act like {{The Husband}}\'s loyal best friend and the easygoing neighbour brother, while sweating over both the spiked eggnog with {{The Mistress}} and the pantry alibi you gave {{The Sister-in-Law}}.',
      act_bullets: [
        'Talk up how you and {{The Husband}} have been besties since you all grew up together.',
        'Back up your brother, {{The Co-Worker}}, and exchange nervous looks with your co-worker and sister-in-law, {{The Mistress}}.',
        'Hide your secret fling with {{The Sister-in-Law}} so nobody asks why you two were sneaking into the pantry.',
        'Slowly question where {{The Sister-in-Law}} actually went during the 10 minutes she left you alone in the pantry.',
      ],
      traits: ['Charming', 'Easygoing', 'Secretive', 'Loyal'],
    },
    motive: {
      legacyId: '78c3a198-4be8-4ae6-ab3c-7dcf9a68c182',
      motive_type: 'fear',
      strength: 'moderate',
      notes: 'Besties with {{The Husband}}, who threatened tonight to expose {{The Bestie}}\'s secret fling with {{The Sister-in-Law}} as well as his workplace cover-up with his co-worker and sister-in-law ({{The Mistress}}).',
    },
  },
];

// Wife's motive (added separately to keep all 5 suspects with motives)
export const CHRISTMAS_WIFE_MOTIVE = {
  legacyId: '45ea4fe2-f279-43af-8329-16ff80d21692',
  motive_type: 'revenge' as const,
  strength: 'high' as const,
  notes: 'Locked in bitter marital issues with {{The Husband}} (who trapped her with a ruthless estate clause) and teamed up with her ex ({{The Co-Worker}}) to break into his study safe tonight.',
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
    dynamics: ['Married', 'Romantic', 'Marital Issues'],
    notes: '{{The Husband}} and {{The Wife}} are married and grew up together, though their marriage is imploding behind closed doors.',
  },
  // 2. HUSBAND <-> Sister (Siblings in Law & Childhood Classmates)
  {
    charAKey: 'husband',
    charBKey: 'sister',
    dynamics: ['Siblings in Law', 'Childhood Classmates', 'Family'],
    notes: '{{The Husband}} and {{The Sister-in-Law}} grew up together as childhood classmates and are now siblings-in-law through his marriage to {{The Wife}}.',
  },
  // 3. HUSBAND <-> Wife/Mistress (Affair)
  {
    charAKey: 'husband',
    charBKey: 'mistress',
    dynamics: ['Affair', 'Romantic'],
    notes: '{{The Husband}} is having a secret affair with {{The Mistress}}, who is married to {{The Co-Worker}} (Neighbour A) and used to be {{The Wife}}\'s old bestie.',
  },
  // 4. HUSBAND <-> Neighbour A / Co-Worker (Work together)
  {
    charAKey: 'husband',
    charBKey: 'coworker',
    dynamics: ['Work together', 'Co-workers', 'Childhood Neighbours'],
    notes: '{{The Husband}} and {{The Co-Worker}} (Neighbour A) grew up together and work together, while {{The Husband}} secretly sleeps with {{The Co-Worker}}\'s wife ({{The Mistress}}).',
  },
  // 5. HUSBAND <-> Neighbour B / Bestie (Besties)
  {
    charAKey: 'husband',
    charBKey: 'bestie',
    dynamics: ['Besties', 'Friends', 'Childhood Neighbours'],
    notes: '{{The Husband}} and {{The Bestie}} (Neighbour B) grew up together and are lifelong besties.',
  },
  // 6. WIFE <-> Sister (Sisters, Childhood Neighbours with the Brothers)
  {
    charAKey: 'wife',
    charBKey: 'sister',
    dynamics: ['Sisters', 'Family', 'Besties'],
    notes: '{{The Wife}} and {{The Sister-in-Law}} are sisters who grew up next door to the two neighbour brothers ({{The Co-Worker}} and {{The Bestie}}). {{The Sister-in-Law}} is fiercely devoted to making sure {{The Wife}} is happy and free.',
  },
  // 7. WIFE <-> Wife/Mistress (Old Besties)
  {
    charAKey: 'wife',
    charBKey: 'mistress',
    dynamics: ['Old Besties', 'Rivals'],
    notes: '{{The Wife}} and {{The Mistress}} grew up together and used to be old besties before drifting apart when {{The Mistress}} married {{The Wife}}\'s ex ({{The Co-Worker}}).',
  },
  // 8. Sister <-> Wife/Mistress (Current Besties)
  {
    charAKey: 'sister',
    charBKey: 'mistress',
    dynamics: ['Current Besties', 'Friends'],
    notes: '{{The Sister-in-Law}} and {{The Mistress}} are current besties, making it a massive betrayal when {{The Sister-in-Law}} discovers {{The Mistress}} is having an affair with {{The Husband}}.',
  },
  // 9. WIFE <-> Neighbour A / Co-Worker (Exes & Childhood Neighbours)
  {
    charAKey: 'wife',
    charBKey: 'coworker',
    dynamics: ['Exes', 'Childhood Neighbours'],
    notes: '{{The Wife}} and {{The Co-Worker}} (Neighbour A) grew up next door to each other and are exes from before she married {{The Husband}} and he married {{The Mistress}}.',
  },
  // 10. Wife/Mistress <-> Neighbour A / Co-Worker (Married)
  {
    charAKey: 'mistress',
    charBKey: 'coworker',
    dynamics: ['Married', 'Romantic'],
    notes: '{{The Mistress}} and {{The Co-Worker}} (Neighbour A) are married, though she has been secretly cheating on him with {{The Husband}}.',
  },
  // 11. Neighbour A / Co-Worker <-> Neighbour B / Bestie (Brothers)
  {
    charAKey: 'coworker',
    charBKey: 'bestie',
    dynamics: ['Brothers', 'Family'],
    notes: '{{The Co-Worker}} (Neighbour A) and {{The Bestie}} (Neighbour B) are brothers who grew up next door to the two sisters ({{The Wife}} and {{The Sister-in-Law}}).',
  },
  // 12. Sister <-> Neighbour B / Bestie (Secret Fling & Childhood Neighbours)
  {
    charAKey: 'sister',
    charBKey: 'bestie',
    dynamics: ['Secret Fling', 'Romantic', 'Childhood Neighbours'],
    notes: '{{The Sister-in-Law}} and {{The Bestie}} (Neighbour B) grew up next door to each other and are currently having a secret fling.',
  },
  // 13. Sister <-> Neighbour A / Co-Worker (Friends & Childhood Neighbours)
  {
    charAKey: 'sister',
    charBKey: 'coworker',
    dynamics: ['Friends', 'Childhood Neighbours'],
    notes: '{{The Sister-in-Law}} and {{The Co-Worker}} (Neighbour A) grew up next door to each other and remain close friends.',
  },
  // 14. Wife/Mistress <-> Neighbour B / Bestie (Co-workers & In-Laws)
  {
    charAKey: 'mistress',
    charBKey: 'bestie',
    dynamics: ['Co-workers', 'Family (In-Laws)'],
    notes: '{{The Mistress}} and {{The Bestie}} (Neighbour B) are co-workers who work together, in addition to {{The Mistress}} being married to {{The Bestie}}\'s brother ({{The Co-Worker}}).',
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
      'Early in the Christmas party, {{The Sister-in-Law}} discovers that her own current bestie ({{The Mistress}}, who is married to {{The Co-Worker}} and used to be {{The Wife}}\'s old bestie) is having a secret affair with {{The Husband}}.',
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
      'Determined that the only way for {{The Wife}} to finally be happy and free is with {{The Husband}} gone, {{The Sister-in-Law}} slips away from her pantry tryst with {{The Bestie}} and uses the missing Christmas lights on {{The Husband}}.',
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
    internal_notes: '[FORMAT:chat] [CODE:R1-C1] REAL / CANON (Beat 1) - Exposes the secret affair between {{The Husband}} and {{The Mistress}}, and shows {{The Sister-in-Law}} was suspicious.',
    description:
      '❤️ (7:32 PM): Sneak into the coat closet before dinner. I can\'t keep smiling across the table like we\'re all just one big happy street.\nMe (7:33 PM): Keep your voice down. Someone\'s been staring at us all night like they know.\n❤️ (7:34 PM): Relax, she\'s my best friend. She\'d never suspect me.',
    generation_prompt: 'A glowing smartphone resting beside a crystal glass of mulled wine and pine branches on a dark wooden table. (No text).',
  },
  {
    legacyId: 'db9ad3d8-94fd-4b67-8de8-f2fcdc75b8ea',
    title: 'Patio Voice Memo: "Before Monday Morning" (7:25 PM)',
    clue_type: 'testimony',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 1,
    is_essential: false,
    beatNumber: null,
    format: 'audio',
    internal_notes: '[FORMAT:audio] [CODE:R1-C2] Fake Arc Step 1 ({{The Wife}} + {{The Co-Worker}}) - Exposes that exes {{The Wife}} and {{The Co-Worker}} conspired to break into {{The Husband}}\'s study safe at 8:00 PM.',
    description:
      'Recording Duration: 22.4 Seconds (7:25 PM • Kitchen Patio):\nMale Voice: "He brought the company audit folder to the house tonight. If he hands that over on Monday, my career is finished."\nFemale Voice: "And if I try to leave him, his new prenup clause leaves me with nothing. We grew up on this street together, you promised you\'d protect me."\nMale Voice: "I will. Meet me by the hallway closet at 8:00. We get into his study safe tonight."',
    generation_prompt: 'Two shadows standing near a frost-covered glass patio door with warm Christmas lights reflected in the glass. (No text).',
  },
  {
    legacyId: '5ff23ebe-96f7-49d5-8222-84ca13a932f4',
    title: 'Dropped Heirloom Snowflake Pin (7:40 PM)',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 1,
    is_essential: true,
    beatNumber: 1,
    format: 'physical_prop',
    internal_notes: '[FORMAT:physical_prop] [CODE:R1-C3] REAL / CANON (Beat 1) - Someone stood outside the coat closet at 7:40 PM and caught {{The Husband}} and {{The Mistress}} together, dropping a family snowflake pin.',
    description:
      'Found in the hallway carpet just outside the slatted coat closet door at 7:40 PM: a vintage silver snowflake hairpin with a broken clasp, passed down to the two sisters from their mother. Inside the closet, investigators also noted lipstick on {{The Husband}}\'s spare collar and a bent gold earring back.',
    generation_prompt: 'A vintage silver snowflake hairpin lying on a dark patterned hallway runner beside a partially open wooden closet door. (No text).',
  },
  {
    legacyId: '17ed93b2-803b-4fa4-964c-3a5800c6bad8',
    title: 'Empty Vintage Christmas Lights Box (7:55 PM)',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 1,
    is_essential: true,
    beatNumber: 2,
    format: 'physical_prop',
    internal_notes: '[FORMAT:physical_prop] [CODE:R1-C4] REAL / CANON (Beat 2) - Establishes the 25-foot heavy-duty Christmas lights went missing from the hallway storage closet before 7:55 PM.',
    description:
      'An empty cardboard storage box for a 25-foot strand of heavy-duty braided vintage Christmas tree lights, found kicked behind the hallway storage closet at 7:55 PM. The box was confirmed full when the guests arrived at 7:00 PM.',
    generation_prompt: 'An open vintage holiday storage box with packing tissue in a shadowy hallway. (No text).',
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
    internal_notes: '[FORMAT:chat] [CODE:R1-C5] Fake Arc Step 1 ({{The Mistress}} + {{The Bestie}}) - Exposes that co-workers {{The Mistress}} and {{The Bestie}} were both threatened by {{The Husband}} and plotted to wipe his phone.',
    description:
      '🤫💼 (7:35 PM): He just cornered me in the kitchen. Said he\'s never leaving her, and if I make a scene tonight he\'s telling my husband AND reporting the missing money from our work account.\nMe (7:36 PM): Are you kidding?! He just threatened me too. Said if I don\'t end my little secret tonight, he\'s telling my brother everything.\n🤫💼 (7:37 PM): Everything he has on us is on his phone. Help me get it unlocked before dessert or we\'re both done.',
    generation_prompt: 'Two smartphones lying side by side on a marble bar counter next to cocktail napkins. (No text).',
  },
  {
    legacyId: '3e8e61ad-32f1-4c0a-a75b-024969eef8f4',
    title: 'Hallway Storage Sensor Log (7:50 PM - 8:05 PM)',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 1,
    is_essential: true,
    beatNumber: 2,
    format: 'search_log',
    internal_notes: '[FORMAT:search_log] [CODE:R1-C6] REAL / CANON (Beat 2 + Ambiguous Overlap) - Logs 3 visits to the hallway storage area between 7:52 PM and 8:03 PM.',
    description:
      'SMART HOME SENSOR LOG • HALLWAY STORAGE CLOSET:\n• 7:52 PM - Storage closet door opened (Holiday light crates disturbed).\n• 7:58 PM - Storage closet door opened (Heavy-duty work gloves removed from top shelf).\n• 8:03 PM - Hallway utility & fuse-box panel opened beside the closet.',
    generation_prompt: 'A sleek smart-home wall panel glowing in a dimly lit hallway decorated with pine garland. (No text).',
  },

  // ── ROUND 2 (6 Clues: 4 Main Beat 3-4 Clues + 2 Double-Duty Step-2 Fake Clues, Shuffled) ──
  {
    legacyId: 'a1111111-1111-4111-8111-111111111105',
    title: 'Pried-Open Upstairs Study Safe & Work Glove (8:06 PM)',
    clue_type: 'physical',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 2,
    is_essential: false,
    beatNumber: null,
    format: 'physical_prop',
    internal_notes: '[FORMAT:physical_prop] [CODE:R2-C1] Fake Arc Step 2 ({{The Wife}} + {{The Co-Worker}}) - Shows why the study breaker was flipped and why work gloves were taken.',
    description:
      'The upstairs study circuit breaker was flipped off at 8:03 PM so the safe alarm wouldn\'t trigger, and the wall safe was pried open with a brass letter opener at 8:06 PM. Found on the study rug: one heavy-duty work glove from the hallway closet and a drop of blood from a scratched hand.',
    generation_prompt: 'An open wall safe behind a framed painting in a dark wood-paneled study, with a heavy work glove on the desk. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111101',
    title: 'Upstairs Hallway Audio Clip (8:12 PM)',
    clue_type: 'testimony',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 2,
    is_essential: true,
    beatNumber: 3,
    format: 'audio',
    internal_notes: '[FORMAT:audio] [CODE:R2-C2] REAL / CANON (Beat 3) - Captures the explosive marital fight between {{The Husband}} and {{The Wife}}, overheard outside the door at 8:12 PM.',
    description:
      'Recording Duration: 19.2 Seconds (8:12 PM • Upstairs Master Hallway):\n{{The Wife}}: "Why are you doing this to me?! Everyone downstairs knows our marriage is a lie! Just let me go!"\n{{The Husband}}: "You\'re never leaving me. You\'ll fix your makeup, come downstairs, and play the grateful wife, or I\'ll ruin your whole family."\n[Sound of footsteps retreating from the door and a hushed voice in the hallway: "He\'s never going to let her be happy..."]',
    generation_prompt: 'A dimly lit upstairs hallway with warm light spilling from underneath a closed wooden door and festive garland on the banister. (No text).',
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
    internal_notes: '[FORMAT:handwritten_note] [CODE:R2-C3] REAL / CANON (Beat 3) - Written right after overhearing the marital fight; ambiguous enough to sound like a childhood neighbour or sibling.',
    description:
      'Found torn in the upstairs bathroom bin (8:14 PM), written on the back of a holiday dinner place card:\n"We all grew up on this street together, and I watched him trap her year after year. Tonight I find out he\'s cheating behind her back while making her cry on Christmas. Someone has to set her free."',
    generation_prompt: 'A torn cream-colored holiday place card with gold trim resting beside a sink in a candlelit bathroom. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111106',
    title: 'Prescription: Zolpidem Tartrate Drops',
    clue_type: 'physical',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 2,
    is_essential: false,
    beatNumber: null,
    format: 'medical_rx',
    internal_notes: '[FORMAT:medical_rx] [CODE:R2-C4] Fake Arc Step 2 ({{The Mistress}} + {{The Bestie}}) - Shows the co-workers spiked {{The Husband}}\'s eggnog with fast-acting sleeping drops to unlock his phone.',
    description:
      'Medication: Zolpidem Tartrate Oral Drops (10mg/mL Fast-Acting Sedative)\nPrescribed to: Label Torn (Corporate Health Plan #04)\nIssue date: 2 Weeks Ago\nRef: RX-409-12\nWARNING: Causes rapid 20-minute sleep onset when mixed with spiced alcohol. Non-lethal at standard dropper dose.\nRecovered empty from the kitchen bar trash at 8:08 PM beside the nutmeg grater and the crystal eggnog cup carried into the living room for {{The Husband}}.',
    generation_prompt: 'A crystal glass of spiced eggnog with a cinnamon stick beside a small amber glass prescription dropper bottle on a dark bar tray. (No text).',
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
    internal_notes: '[FORMAT:chat] [CODE:R2-C5] REAL / CANON (Beat 4) - Proves {{The Sister-in-Law}} left {{The Bestie}} alone in the pantry from 8:15 to 8:25 PM and asked him to lie for her alibi.',
    description:
      'Me (8:25 PM): Where did you go?? You said you were stepping out of the pantry for one second, you\'ve been gone 10 minutes.\n❤️‍🔥 (8:26 PM): Shh. If anyone asks where I was between 8:15 and 8:25, tell them I was in the pantry with you the whole time.\nMe (8:27 PM): Of course I\'ll cover for you, if my brother found out about us we\'d be dead. Wait, why are your hands shaking?',
    generation_prompt: 'Two champagne flutes left behind on a marble pantry counter beside holiday ribbon and pine cones. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111104',
    title: 'Living Room Smart-Outlet Surge Log (8:18 PM - 8:22 PM)',
    clue_type: 'physical',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 2,
    is_essential: true,
    beatNumber: 4,
    format: 'search_log',
    internal_notes: '[FORMAT:search_log] [CODE:R2-C6] REAL / CANON (Beat 4) - Pinpoints the exact time of the Christmas lights attack in the living room to 8:19 PM.',
    description:
      'SMART HOME POWER LOG • GROUND FLOOR LIVING ROOM:\n• 8:18 PM - Living room overhead dimmer switched OFF.\n• 8:19 PM - Wall Outlet #2 (beside Christmas tree) registers a heavy load spike & short-circuit fault.\n• 8:22 PM - Living room side hallway door opened.',
    generation_prompt: 'A glowing Christmas tree corner in a dark living room with shadows cast across the hardwood floor. (No text).',
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
    internal_notes: '[FORMAT:document] [CODE:R3-C1] REAL / CANON (Beat 5) - Confirms cause of death was the 25-foot Christmas lights at 8:19 PM (not the sedative drops or work gloves), and matches the matching sister snowflake pin.',
    description:
      'LAB: FORENSIC CRIME SCENE UNIT\nTIME: 8:30 PM • LIVING ROOM\n• Cause of Death: {{The Husband}} was found beside the Christmas tree, tightly wrapped in the missing 25-foot strand of heavy-duty vintage Christmas lights plugged into Wall Outlet #2 at 8:19 PM.\n• Toxicology: The Zolpidem sedative in his spiced eggnog only made him groggy and was completely non-lethal.\n• Trace Evidence: Zero fireplace soot or work-glove fibers on the light cord. Snagged inside the knotted wire is the broken half of the sisters\' silver snowflake hairpin clasp.',
    generation_prompt: 'Tangled glowing red and green vintage Christmas tree lights coiled across a dark hardwood floor. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111107',
    title: 'Upstairs Study Fireplace Log & Burnt Prenup (8:19 PM)',
    clue_type: 'physical',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 3,
    is_essential: false,
    beatNumber: null,
    format: 'search_log',
    internal_notes: '[FORMAT:search_log] [CODE:R3-C2] Fake Arc Step 3 & Fatal Hole ({{The Wife}} + {{The Co-Worker}}) - Proves {{The Wife}} and {{The Co-Worker}} were locked upstairs burning documents at 8:19 PM when the living room murder happened downstairs.',
    description:
      'UPSTAIRS STUDY CHIMNEY SENSOR & ASH RECOVERY:\n• Timestamp: 8:18 PM - 8:21 PM (Simultaneous with the downstairs living room power surge at 8:19 PM).\n• Sensor: Upstairs study door latched from the inside while fireplace damper registers high heat.\n• Ash Recovery: Half-burnt pages of the company audit folder and marriage prenup clause.',
    generation_prompt: 'Glowing embers and half-burnt financial papers inside a brick study fireplace. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111110',
    title: 'Childhood Polaroid: "Happy & Free"',
    clue_type: 'secret',
    implication_type: 'direct',
    evidence_status: 'real',
    round_number: 3,
    is_essential: true,
    beatNumber: 4,
    format: 'handwritten_note',
    internal_notes: '[FORMAT:handwritten_note] [CODE:R3-C3] REAL / CANON (Beat 4 True Motive) - Reveals {{The Sister-in-Law}} didn\'t act to protect her fling with {{The Bestie}}, but chose for her sister ({{The Wife}}) to finally be happy and free.',
    description:
      'Found tucked inside a velvet clutch near the pantry beside a receipt for a one-way holiday flight:\nA childhood Polaroid of the two sisters outside their old house, with a note written on the back at 8:15 PM:\n"Let everyone think I was just hiding my fling in the pantry. After seeing what he did with my best friend and hearing him tell you that you\'d never escape him, I made my choice. This Christmas, you are finally going to be happy and free, sis."',
    generation_prompt: 'A vintage instant photograph of two young sisters in winter coats resting beside a holiday airline ticket envelope on velvet fabric. (No text).',
  },
  {
    legacyId: 'a1111111-1111-4111-8111-111111111108',
    title: 'Living Room Corridor Cam: The Phone Theft (8:16 PM)',
    clue_type: 'physical',
    implication_type: 'red_herring',
    evidence_status: 'fake',
    round_number: 3,
    is_essential: false,
    beatNumber: null,
    format: 'cctv',
    static_image_url: '/clues/doa/cctv-r2-hooded-table.jpg',
    internal_notes: '[FORMAT:cctv] [CODE:R3-C4] Fake Arc Step 3 & Fatal Hole ({{The Mistress}} + {{The Bestie}}) - Proves {{The Husband}} was still alive at 8:16 PM when {{The Mistress}} took his phone, and she was back at the dining table by 8:18 PM.',
    description:
      'Header: CAM 02 • LIVING ROOM CORRIDOR\nTimestamp: 8:16 PM (3 MINS BEFORE SURGE)\n• 8:16 PM: {{The Mistress}} slips out of the living room holding {{The Husband}}\'s unlocked phone while {{The Husband}} is seen groggy from the eggnog but still alive on the sofa.\n• 8:18 PM: Dining room witnesses confirm {{The Mistress}} was back at the dinner table pouring wine when the living room lights shorted out at 8:19 PM.',
    generation_prompt: 'Grainy surveillance angle of a woman in an evening dress slipping out of a doorway holding a glowing smartphone. (No text).',
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
        description: 'Step 1 (The Trigger): {{The Co-Worker}} learns {{The Husband}} brought company audit files to ruin him on Monday, while {{The Wife}} reveals {{The Husband}}\'s prenup clause leaves her penniless. The exes agree to meet by the hallway closet at 8:00 PM.',
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
      'Co-workers and in-laws {{The Mistress}} and {{The Bestie}} (Neighbour B) panic when {{The Husband}} threatens to expose both {{The Mistress}}\'s affair/work account and {{The Bestie}}\'s secret fling with {{The Sister-in-Law}}, leading them to spike his eggnog with sleep drops to wipe his phone.',
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
        description: 'Step 2 (The Escalation): At 8:08 PM, {{The Mistress}} and {{The Bestie}} spike {{The Husband}}\'s spiced eggnog with fast-acting sleep drops so they can unlock his phone with FaceID and delete his blackmail files.',
        linkedBeatNumber: 2,
      },
      {
        beat_number: 3,
        description: 'Step 3 (The Suspicious Action & Hole): At 8:16 PM, {{The Mistress}} steals {{The Husband}}\'s phone while he is groggy but alive on the living room sofa, and returns to the dining table by 8:18 PM, accidentally leaving him easy for {{The Sister-in-Law}} to overpower at 8:19 PM.',
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
