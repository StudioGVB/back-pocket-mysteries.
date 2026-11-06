import { LOTR_GOSSIP_MOODBOARD, LOTR_MAIN_COVER_URL, MoodboardPhoto } from '@/utils/moodboard';

export interface CanonicalCharacterRole {
  id: string;
  /** Role-only title — never a human first name, because guests supply their own names */
  name: string;
  roleTitle: string;
  gender: 'male' | 'female' | 'adaptable';
  is_victim: boolean;
  plot_role: 'victim' | 'killer' | 'assistant' | 'innocent';
  archetype: string;
  is_mandatory: boolean;
  vibeTag: string;
  profile_data: {
    color: string;
    bio: string;
    outfit_advice: string;
    act_summary: string;
    act_bullets: string[];
    traits: string[];
    presentation_female?: {
      bio: string;
      outfit_advice: string;
      act_summary: string;
      act_bullets: string[];
    };
    presentation_male?: {
      bio: string;
      outfit_advice: string;
      act_summary: string;
      act_bullets: string[];
    };
  };
}

export interface CanonicalActiveMystery {
  id: string;
  slug: string;
  title: string;
  theme: string;
  category: string;
  tone: string;
  spice_level: string;
  complexity: 'easy' | 'medium' | 'hard';
  difficultyLabel: string;
  min_players: number;
  max_players: number;
  playersLabel: string;
  gameTime: string;
  shortDesc: string;
  description: string;
  inside_jokes: string;
  bestFor: string;
  occasions: string[];
  image_url: string;
  coverUrl: string;
  moodboardPhotos: MoodboardPhoto[];
  whatIsIncluded: string[];
  characters: CanonicalCharacterRole[];
}

export const LOVE_ON_THE_ROCKS_MYSTERY: CanonicalActiveMystery = {
  id: '69b65a91-1cc2-4267-94a4-59297428af28',
  slug: 'love-on-the-rocks',
  title: 'Love On The Rocks',
  theme: 'Reality TV Reunion',
  category: 'Reality TV Reunion',
  tone: 'Chaotic & Spicy',
  spice_level: 'Spicy',
  complexity: 'medium',
  difficultyLabel: 'Medium',
  min_players: 4,
  max_players: 12,
  playersLabel: '4–12 Players',
  gameTime: '2–3 Hours',
  shortDesc:
    'The cameras stopped rolling six months ago, but the drama never did. Tonight, the cast of Season 3’s biggest dating show reunites at a luxury penthouse — until The Star collapses mid-champagne-toast.',
  description:
    'The cameras stopped rolling six months ago, but the drama never did. Tonight, the cast of "Love On The Rocks" — Season 3’s most-watched dating show — have reunited for the glitzy wrap party at a five-star hotel penthouse. The Star walked away with the crown, the following, and the prize. But in this room, everyone has a score to settle. When The Star collapses mid-champagne-toast, poisoned in front of fifty witnesses and a rolling camera, everyone becomes a suspect. One person planned to kill. Another switched the target. And now the story has a very different ending.',
  inside_jokes: 'Remember: the cameras are always on. Even when they shouldn’t be.',
  bestFor: "Bachelorette & Hen Nights, 20s & 30s Birthdays, Girls' Nights & Reality TV Fans",
  occasions: [
    '💖 Bachelorette & Hen Nights',
    '🍸 20s & 30s Birthday Parties',
    "💅 Girls' Night & Cocktail Parties",
    '🏝️ Love Island & Reality TV Fans',
    '🥂 Messy Friend Groups',
  ],
  image_url: LOTR_MAIN_COVER_URL,
  coverUrl: LOTR_MAIN_COVER_URL,
  moodboardPhotos: LOTR_GOSSIP_MOODBOARD,
  whatIsIncluded: [
    'Custom Bombshell & VIP Character Booklets Named After Your Guests',
    'Personalized Group-Chat Threads, Leaked DMs & Fininsta Posts',
    'Backstage Audio Voice Memos, Paparazzi Stills & Call Sheets',
    'It-Girl Dress Code & Signature Cocktail Guide',
    'Spoiler-Free Host Mode (Play & Sip Alongside Your Guests)',
    'Kahoot-Style Live Mobile Lobby, Theory Voting & Final Killer Reveal',
  ],
  characters: [
    {
      id: 'lotr-the-star',
      name: 'The Star',
      roleTitle: 'The Star',
      gender: 'female',
      is_victim: true,
      plot_role: 'victim',
      archetype: 'victim',
      is_mandatory: true,
      vibeTag: 'Poised • Strategic • Untouchable',
      profile_data: {
        color: 'Pink',
        bio: 'The Star won Love on the Rocks Season 3. Crowned queen of chaos, she had the most followers, the most airtime, and the most drama. She played the game flawlessly — sweet when the cameras rolled, ruthless when they didn’t. Ask anyone in this room and you’ll get a different version of The Star. She walks into the reunion like she’s still the main character, knowing how to keep her enemies close.',
        outfit_advice:
          'Elegant and effortless. Think a silky slip dress or bias-cut skirt in luxe neutrals or muted jewel tones — like someone used to being photographed. Add soft waves, dewy makeup, and a killer heel.',
        act_summary:
          'You won the show and you’re still the fan favourite — but you know people want to see you fall. Smile sweetly, keep it composed, and never let them forget who came out on top.',
        act_bullets: [
          'Be effortlessly poised, like everything rolls off you',
          'Stay friendly, but always keep control of the room',
          'Laugh off shade — or casually mention your brand deals instead',
          'Never raise your voice — just raise your eyebrows',
        ],
        traits: ['Poised', 'Strategic', 'Charming', 'Untouchable'],
      },
    },
    {
      id: 'lotr-the-sister',
      name: 'The Sister',
      roleTitle: 'The Sister',
      gender: 'female',
      is_victim: false,
      plot_role: 'innocent',
      archetype: 'witness',
      is_mandatory: true,
      vibeTag: 'Loud • Ambitious • Unpredictable',
      profile_data: {
        color: 'Pink (lighter shade)',
        bio: 'The Sister was never supposed to be on Love on the Rocks — but she showed up to every red carpet and finale taping like she was born for it. Half the fandom didn’t realise she wasn’t a cast member. She’s younger, louder, and tired of living in The Star’s shadow. She says she’s just here to support her sister, but that dress, that flirty laugh, and that weird tension with The Fan-Favourite Flameout say she’s here to make a name for herself.',
        outfit_advice:
          'Slinky, sultry, and just a little too polished for a reunion. Soft clingy fabrics, neutral or warm tones, mini skirts or a maxi with a cutout. Sunglasses (yes, indoors) and a smug little smirk.',
        act_summary:
          'The Sister is always performing — for the cameras, for the group, for herself. Charming until she’s not.',
        act_bullets: [
          'Always has a comeback (even if it makes no sense)',
          'Drops gossip like it’s casual conversation',
          'Jealousy masked as main-character confidence',
          'Flirts to cause chaos, not connection',
        ],
        traits: ['Loud', 'Ambitious', 'Jealous', 'Unpredictable'],
      },
    },
    {
      id: 'lotr-the-ex',
      name: 'The Ex',
      roleTitle: 'The Ex',
      gender: 'adaptable',
      is_victim: false,
      plot_role: 'assistant',
      archetype: 'villain',
      is_mandatory: true,
      vibeTag: 'Magnetic • Volatile • Unstable',
      profile_data: {
        color: 'Green',
        bio: 'The Ex was Love on the Rocks’ poster person — gorgeous, magnetic, and completely toxic. They and The Star were the golden couple… until Betrayal Week, when The Ex kissed another cast member "for the challenge" and tried to gaslight their way out of it. Now they’re back claiming inner peace, yet jittery, distracted, and constantly checking their phone.',
        outfit_advice:
          'Something clean and curated — white or beige button-up, relaxed pants, silver or leather chain — like you’re trying to look peaceful but still hot.',
        act_summary:
          'Speak in therapy buzzwords and act like everything is chill… until someone mentions The Star.',
        act_bullets: [
          'Pretend to be zen even when you’re clearly spiralling',
          'Use phrases like "I’m holding space" and "protecting my peace"',
          'Get passive-aggressive if anyone brings up Betrayal Week',
        ],
        presentation_female: {
          bio: 'She and The Star were the golden couple of Season 3 until Betrayal Week. She’s back, claiming inner peace — but her hands won’t stop shaking.',
          outfit_advice:
            'Something clean and curated — white or beige linen set or silk button-up, relaxed tailored trousers, and layered silver jewellery.',
          act_summary:
            'Speak in therapy buzzwords. Act like everything’s chill… until someone mentions The Star.',
          act_bullets: [
            'Pretend to be zen even when you’re clearly not',
            'Use phrases like "I’m holding space"',
            'Get passive-aggressive if people don’t agree with you',
          ],
        },
        presentation_male: {
          bio: 'He and The Star were the golden couple of Season 3 until Betrayal Week. He’s back, claiming inner peace — but his hands won’t stop shaking.',
          outfit_advice:
            'Something clean and curated — white or beige unbuttoned linen shirt, relaxed tailored trousers, and a silver or leather chain.',
          act_summary:
            'Speak in therapy buzzwords. Act like everything’s chill… until someone mentions The Star.',
          act_bullets: [
            'Pretend to be zen even when you’re clearly not',
            'Use phrases like "I’m holding space"',
            'Get passive-aggressive if people don’t agree with you',
          ],
        },
        traits: ['Volatile', 'Obsessive', 'Charming', 'Unstable'],
      },
    },
    {
      id: 'lotr-the-host',
      name: 'The Host',
      roleTitle: 'The Host',
      gender: 'adaptable',
      is_victim: false,
      plot_role: 'innocent',
      archetype: 'witness',
      is_mandatory: true,
      vibeTag: 'Smooth • Flirtatious • Camera-Ready',
      profile_data: {
        color: 'Gold',
        bio: 'The Host was the face of Love on the Rocks — smooth, flirty, and always camera-ready. Supposed to stay neutral, they blurred more than a few lines off-camera, though fans forgave them because it made for great TV. Everyone remembers the banter, the cocktail toasts, and that rumoured backstage hookup that mysteriously got edited out.',
        outfit_advice:
          'Slick but low-effort. A fitted shirt (one-too-few buttons), dark tailored trousers or jeans, and statement gold jewellery — like you’re still trying to look bookable for a panel show.',
        act_summary:
          'You’re not the drama — you just host it. Stay smooth, funny, and never admit to anything.',
        act_bullets: [
          'Be charming and flirty with everyone in the room',
          'Speak like you’re still mic’d up and reading a teleprompter',
          'Act above the drama — even if you caused half of it',
        ],
        presentation_female: {
          bio: 'She was the host of Love On The Rocks — smooth, flirty, camera-ready. Supposed to stay neutral. Didn’t.',
          outfit_advice:
            'Slick but effortless. A tailored blazer dress or fitted silk shirt, statement gold necklace, and camera-ready heels.',
          act_summary:
            'You’re not the drama — you just film it. Stay smooth, funny, and never admit to anything.',
          act_bullets: [
            'Be charming and flirty with everyone',
            'Speak like you’re still mic’d up',
            'Act above the drama — even if you’re behind it',
          ],
        },
        presentation_male: {
          bio: 'He was the host of Love On The Rocks — smooth, flirty, camera-ready. Supposed to stay neutral. Didn’t.',
          outfit_advice:
            'Slick but low-effort. A fitted shirt (one-too-few buttons), dark tailored jeans or trousers, and a gold chain.',
          act_summary:
            'You’re not the drama — you just film it. Stay smooth, funny, and never admit to anything.',
          act_bullets: [
            'Be charming and flirty with everyone',
            'Speak like you’re still mic’d up',
            'Act above the drama — even if you’re behind it',
          ],
        },
        traits: ['Smooth', 'Strategic', 'Flirtatious', 'Evasive'],
      },
    },
    {
      id: 'lotr-the-superfan',
      name: 'The Superfan',
      roleTitle: 'The Superfan',
      gender: 'adaptable',
      is_victim: false,
      plot_role: 'killer',
      archetype: 'villain',
      is_mandatory: true,
      vibeTag: 'Obsessive • Intense • Knows Too Much',
      profile_data: {
        color: 'Orange',
        bio: 'The Superfan wasn’t part of the original villa cast — they won the fan-voted wildcard spot for the reunion special. Their TikTok edits, Reddit theories, and encyclopedic posts made them a cult favourite. Charming in a "knows way too much" kind of way, they’ve been watching every move, every scandal, and every deleted scene for years.',
        outfit_advice:
          'Bookish but curated. Tucked-in shirts, knit jumpers over collars, wide-leg trousers, and round glasses — like they spent hours crafting an "I’m Smart but Hot" reunion look.',
        act_summary:
          'You were chosen by the fans, and you’ve made that everyone’s problem. Get weirdly intense if anyone questions why you’re invited.',
        act_bullets: [
          'Overshare show trivia and episode timestamps like casual conversation',
          'Stare a little too long; smile a little too wide',
          'Bring up The Star in conversation constantly',
        ],
        presentation_female: {
          bio: 'She campaigned to join the reunion like her life depended on it. She knows every deleted scene and every secret in the villa.',
          outfit_advice:
            'Bookish but curated. Tucked-in shirt, cropped jumper over collar, wide-leg trousers or pleated mini skirt, and chic glasses.',
          act_summary:
            'You were chosen by the fans, and you’ve made that everyone’s problem.',
          act_bullets: [
            'Overshare show trivia like it’s normal conversation',
            'Stare a little too long; smile a little too wide',
            'Mention The Star in casual conversation constantly',
          ],
        },
        presentation_male: {
          bio: 'He campaigned to join the reunion like his life depended on it. He knows every deleted scene and every secret in the villa.',
          outfit_advice:
            'Bookish but curated. Tucked-in shirt, jumper over collar, wide-leg trousers, and round frames.',
          act_summary:
            'You were chosen by the fans, and you’ve made that everyone’s problem.',
          act_bullets: [
            'Overshare show trivia like it’s normal conversation',
            'Stare a little too long; smile a little too wide',
            'Mention The Star in casual conversation constantly',
          ],
        },
        traits: ['Obsessive', 'Intense', 'Calculating', 'Devoted'],
      },
    },
    {
      id: 'lotr-the-producer-plant',
      name: 'The Producer Plant',
      roleTitle: 'The Producer Plant',
      gender: 'adaptable',
      is_victim: false,
      plot_role: 'innocent',
      archetype: 'investigator',
      is_mandatory: true,
      vibeTag: 'Calculating • Secretive • Pot-Stirrer',
      profile_data: {
        color: 'Blue',
        bio: 'The Producer Plant wasn’t just a mid-season bombshell — they were an industry twist. Secretly planted by executive producers to stir drama in the villa, every whisper, every fight, and every "accidental" reveal traced back to them. Off contract now, yet still taking notes and still pushing everyone’s buttons.',
        outfit_advice:
          'Creative industry cool — tucked tee, rolled-sleeve blazer, tailored trousers, and a VIP lanyard or notebook. The vibe is "I’m just here to observe" while secretly running the room.',
        act_summary:
          'Act like a supportive friend while calculating every angle for maximum ratings. Never raise your voice, never show your cards.',
        act_bullets: [
          'Smile like you’re in on a secret nobody else knows',
          'Drop passive little gossip bombs, then step back and watch',
          'If cornered, shrug and say "that’s above my pay grade"',
        ],
        presentation_female: {
          bio: 'Planted by production as a contestant, she knows everything that happens off-camera — and always puts ratings first.',
          outfit_advice:
            'Oversizedrolled-sleeve blazer, sleek camisole or tucked tee, tailored trousers, and an earpiece or notebook.',
          act_summary:
            'Act like a casual friend while calculating everything. Never raise your voice, never show your cards.',
          act_bullets: [
            'Smile like you’re in on something',
            'Drop passive little bombs, then walk away',
            'If cornered, claim "that’s not really my role anymore"',
          ],
        },
        presentation_male: {
          bio: 'Planted by production as a contestant, he knows everything that happens off-camera — and always puts ratings first.',
          outfit_advice:
            'Tucked tee, rolled-sleeve blazer, chinos, and a too-cool notebook.',
          act_summary:
            'Act like a casual friend while calculating everything. Never raise your voice, never show your cards.',
          act_bullets: [
            'Smile like you’re in on something',
            'Drop passive little bombs, then walk away',
            'If cornered, claim "that’s not really my role anymore"',
          ],
        },
        traits: ['Calculating', 'Charming', 'Secretive', 'Manipulative'],
      },
    },
    {
      id: 'lotr-the-runner-up',
      name: 'The Runner-Up',
      roleTitle: 'The Runner-Up',
      gender: 'female',
      is_victim: false,
      plot_role: 'innocent',
      archetype: 'hero',
      is_mandatory: true,
      vibeTag: 'Polished • Competitive • Wounded',
      profile_data: {
        color: 'Yellow',
        bio: 'The Runner-Up made it to the final two — and then watched The Star take the crown. For weeks the hashtags trended her way: #WrongGirlWon. She and The Star were inseparable in the villa until The Star stopped replying after the finale. Tonight she arrived polished, prepared, and one glass of champagne away from a breakdown.',
        outfit_advice:
          'High-glam revenge look. Sequins, metallics, or anything body-hugging and eye-catching — the outfit that says "I’m thriving" while setting the room on fire. Heels, glossy lips, and sharp jewellery.',
        act_summary:
          'You’re here to be civil, mature, and definitely not bitter. But the second someone brings up the finale vote, your smile gets tight.',
        act_bullets: [
          'Overcompensate with pageant-level confidence and sass',
          'Throw "no shade, just being honest" shade constantly',
          'Look for every opportunity to steal back the spotlight',
        ],
        traits: ['Bitter', 'Polished', 'Competitive', 'Wounded'],
      },
    },
    {
      id: 'lotr-the-flameout',
      name: 'The Fan-Favourite Flameout',
      roleTitle: 'The Fan-Favourite Flameout',
      gender: 'adaptable',
      is_victim: false,
      plot_role: 'innocent',
      archetype: 'sidekick',
      is_mandatory: true,
      vibeTag: 'Chaotic • Magnetic • Vengeance Arc',
      profile_data: {
        color: 'Black',
        bio: 'The Fan-Favourite Flameout walked into the villa bold, loud, and instantly iconic. They flirted with everyone, stirred the pot on purpose, and gave the kind of messy confessionals that live forever as viral audio. They won the internet — until production edited most of their scenes out of the reunion cut. Tonight: fresh spray tan, vengeance arc, nothing left to lose.',
        outfit_advice:
          'All black, all attitude. Fitted top or mesh shirt, leather or wide-leg trousers, chunky rings, and boots you can dramatically storm out in.',
        act_summary:
          'You’re flirty, shady, and deeply unserious… until someone brings up how your best scenes got cut.',
        act_bullets: [
          'Flirt with everyone — especially people you shouldn’t',
          'Drop snarky one-liners and play completely innocent',
          'Blame "the edit" for everything you did on the show',
        ],
        presentation_female: {
          bio: 'She flirted with everyone, gave messy interviews, and won the internet — until production edited her out of the reunion. She’s back with nothing to lose.',
          outfit_advice:
            'All black, all attitude. Leather jacket or corset top, wide-leg trousers or mini skirt, chunky silver rings, and statement boots.',
          act_summary:
            'You’re flirty, shady, and deeply unserious… until someone brings up the edit.',
          act_bullets: [
            'Flirt with everyone — especially people you shouldn’t',
            'Drop snarky one-liners and play innocent',
            'Refer to "the edit" constantly',
          ],
        },
        presentation_male: {
          bio: 'He flirted with everyone, gave messy interviews, and won the internet — until production edited him out of the reunion. He’s back with nothing to lose.',
          outfit_advice:
            'All black, all attitude. Fitted black shirt or leather jacket, wide-leg trousers, chunky rings, and boots.',
          act_summary:
            'You’re flirty, shady, and deeply unserious… until someone brings up the edit.',
          act_bullets: [
            'Flirt with everyone — especially people you shouldn’t',
            'Drop snarky one-liners and play innocent',
            'Refer to "the edit" constantly',
          ],
        },
        traits: ['Chaotic', 'Magnetic', 'Vengeful', 'Theatrical'],
      },
    },
    {
      id: 'lotr-the-glam-artist',
      name: 'The Hair & Makeup Artist',
      roleTitle: 'The Hair & Makeup Artist',
      gender: 'female',
      is_victim: false,
      plot_role: 'innocent',
      archetype: 'witness',
      is_mandatory: true,
      vibeTag: 'Perceptive • Petty • Backstage Insider',
      profile_data: {
        color: 'Purple',
        bio: 'The Hair & Makeup Artist was the glam guru behind the scenes of Love On The Rocks. Everyone spills their secrets in the makeup chair at 2 AM, and she heard every single one of them. After being ghosted by The Star post-finale, she’s back in the green room with her touch-up kit in tow — and she knows where all the bodies are buried.',
        outfit_advice:
          'Vibrant, artsy, and expressive. Bold patterns, statement knits, playful textures, or vintage-inspired pieces — dopamine dressing with a makeup brush in your clutch.',
        act_summary:
          'You know too much and you’re not above letting it slip. Sarcastic, observant, and always one step ahead.',
        act_bullets: [
          'Make every piece of gossip sound like a casual joke… until it’s not',
          'Give backhanded compliments while offering to fix someone’s lip gloss',
          'If accused of stirring drama: "I don’t start it, I just retouch it"',
        ],
        traits: ['Perceptive', 'Petty', 'Artistic', 'Emotionally Guarded'],
      },
    },
  ],
};

export const ACTIVE_MYSTERIES: CanonicalActiveMystery[] = [LOVE_ON_THE_ROCKS_MYSTERY];

export function getCanonicalActiveMysteryBySlugOrId(slugOrId: string): CanonicalActiveMystery | null {
  const normalized = (slugOrId || '').trim().toLowerCase();
  return (
    ACTIVE_MYSTERIES.find(
      (m) =>
        m.slug.toLowerCase() === normalized ||
        m.id.toLowerCase() === normalized ||
        m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === normalized
    ) || null
  );
}
