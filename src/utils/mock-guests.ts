export interface MockGuest {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  gender: string;
  eye_color: string;
  height: string;
  avatar_url: string;
  traits: string[];
  bio: string;
  created_at?: string;
  updated_at?: string;
}

export function getStaticMockGuests(): MockGuest[] {
  const avatarUrlHelper = (seed: string, top: string, hairColor: string, skinColor: string, facialHair?: string) => {
    const params = new URLSearchParams({
      seed,
      top,
      topColor: hairColor,
      hairColor: hairColor,
      skinColor,
      ...(facialHair ? { facialHair } : {}),
      backgroundColor: 'transparent',
    });
    return `https://api.dicebear.com/7.x/avataaars/svg?${params}`;
  };

  return [
    {
      id: 'mock-guest-gabriella',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Gabriella Blyth',
      email: 'hello@studiogvb.com',
      gender: 'female',
      eye_color: 'Hazel',
      height: 'Average',
      avatar_url: avatarUrlHelper('gabriella', 'straight01', '282828', 'ffcd94'),
      traits: ['Cryptographer', 'Observant', 'Earl Grey Lover'],
      bio: 'Gabriella, an amateur cryptographer and professional cat whisperer, claims she can decipher any coded message, especially after a strong cup of Earl Grey and a good snoop.',
    },
    {
      id: 'mock-guest-luke',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Luke',
      email: null,
      gender: 'male',
      eye_color: 'Blue',
      height: 'Tall',
      avatar_url: avatarUrlHelper('luke', 'shortFlat', 'e8c170', 'ffe0bd'),
      traits: ['Developer', 'Surfer', 'Easygoing'],
      bio: 'A charismatic and easygoing developer who loves surfing, fine dining, and mysterious plots.',
    },
    {
      id: 'mock-guest-polly',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Polly',
      email: null,
      gender: 'female',
      eye_color: 'Green',
      height: 'Petite',
      avatar_url: avatarUrlHelper('polly', 'longButNotTooLong', 'c25c38', 'ffcd94'),
      traits: ['Bookworm', 'Lively', 'Enthusiastic'],
      bio: 'A lively and enthusiastic book club enthusiast who loves historical dramas and good mystery novels.',
    },
    {
      id: 'mock-guest-jason',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Jason',
      email: null,
      gender: 'male',
      eye_color: 'Brown',
      height: 'Average',
      avatar_url: avatarUrlHelper('jason', 'dreads', '4a3728', 'ffe0bd'),
      traits: ['Analytical', 'Detail-oriented', 'Detective Fan'],
      bio: 'A meticulous detective novel reader who always spots the key clues before anyone else at the table.',
    },
    {
      id: 'mock-guest-darren',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Darren',
      email: null,
      gender: 'male',
      eye_color: 'Grey',
      height: 'Tall',
      avatar_url: avatarUrlHelper('darren', 'frizzle', '1a1a1a', 'ffcd94'),
      traits: ['Quiet', 'Dry Humored', 'Observer'],
      bio: 'A quiet observer with an exceptional eye for detail, dry sense of humor, and penchant for secrets.',
    },
    {
      id: 'mock-guest-matt',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Matt',
      email: null,
      gender: 'male',
      eye_color: 'Blue',
      height: 'Average',
      avatar_url: avatarUrlHelper('matt', 'shaved', '4a3728', 'ffe0bd'),
      traits: ['High Energy', 'Board Gamer', 'Social'],
      bio: 'A high-energy board game enthusiast who always keeps the party vibe alive and the conversations flowing.',
    },
    {
      id: 'mock-guest-sarah',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Sarah',
      email: null,
      gender: 'female',
      eye_color: 'Brown',
      height: 'Average',
      avatar_url: avatarUrlHelper('sarah', 'bob', '282828', 'ffcd94'),
      traits: ['Elegant', 'Art Collector', 'Classy'],
      bio: 'An elegant art collector with a penchant for vintage jewelry, classical paintings, and classy masquerades.',
    },
    {
      id: 'mock-guest-david',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'David',
      email: null,
      gender: 'male',
      eye_color: 'Green',
      height: 'Tall',
      avatar_url: avatarUrlHelper('david', 'curly', '7a5a3f', 'ffe0bd', 'beardLight'),
      traits: ['Charismatic', 'Gourmet Chef', 'Wine Lover'],
      bio: 'A charismatic gourmet chef who appreciates fine wine, exquisite recipes, and dramatic dinner parties.',
    },
    {
      id: 'mock-guest-polina',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Polina',
      email: null,
      gender: 'female',
      eye_color: 'Blue',
      height: 'Tall',
      avatar_url: avatarUrlHelper('polina', 'curly', 'ebd5a2', 'ffcd94'),
      traits: ['Brilliant', 'Pianist', 'Melodic'],
      bio: 'A brilliant classical pianist who finds secret rhythms and complex, hidden patterns in every mystery.',
    },
    {
      id: 'mock-guest-darcy',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Darcy',
      email: null,
      gender: 'female',
      eye_color: 'Hazel',
      height: 'Petite',
      avatar_url: avatarUrlHelper('darcy', 'straight02', '111111', 'ffcd94'),
      traits: ['Adventurous', 'Blogger', 'Curious'],
      bio: 'An adventurous travel blogger who is always hunting for the next hidden gem and ancient local legend.',
    },
    {
      id: 'mock-guest-jack',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Jack',
      email: null,
      gender: 'male',
      eye_color: 'Brown',
      height: 'Tall',
      avatar_url: avatarUrlHelper('jack', 'shortWaved', 'a0a0a0', 'ffe0bd', 'beardMajestic'),
      traits: ['Retired Professor', 'Wise', 'Historian'],
      bio: 'A retired professor of antiquities who knows a little too much about ancient societies, cultures, and historical mysteries.',
    },
    {
      id: 'mock-guest-cleo',
      user_id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      name: 'Cleo',
      email: null,
      gender: 'female',
      eye_color: 'Amber',
      height: 'Average',
      avatar_url: avatarUrlHelper('cleo', 'dreads', 'b04a2a', 'ffcd94'),
      traits: ['Quick-witted', 'Journalist', 'Relentless'],
      bio: 'A quick-witted investigative journalist who is always at the right place at the right time to uncover the absolute truth.',
    }
  ];
}
