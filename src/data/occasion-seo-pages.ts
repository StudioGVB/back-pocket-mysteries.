export interface OccasionSeoPageData {
  slug: string;
  navLabel: string;
  emoji: string;
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  recommendedThemeSlug: string;
  groupSizeLabel: string;
  prepTimeLabel: string;
  whyTitle: string;
  whyParagraphs: string[];
  highlights: Array<{
    title: string;
    description: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export const OCCASION_SEO_PAGES: OccasionSeoPageData[] = [
  {
    slug: 'hen-party-bachelorette-murder-mystery-games',
    navLabel: 'Hen Do & Bachelorette Games',
    emoji: '💍',
    badge: 'Hen Do, Bachelorette & Girls Night In',
    title: 'Hen Party & Bachelorette',
    titleHighlight: 'Murder Mystery Games',
    subtitle:
      'Ditch the cringey plastic sashes and awkward icebreakers. Cast the Bride-to-Be and your whole hen party into a hilarious, drama-filled Reality TV or VIP Gala murder mystery personalized with your group’s actual inside jokes.',
    metaTitle:
      'Hen Party & Bachelorette Murder Mystery Games (Printable & Custom) | Back Pocket Mysteries',
    metaDescription:
      'Looking for the ultimate hen do or bachelorette murder mystery party game? Personalize characters with the bride’s inside jokes, leaked group chats, and audio clues in ~20 minutes.',
    keywords: [
      'hen party murder mystery game',
      'bachelorette murder mystery party',
      'hen do murder mystery game printable',
      'girls night murder mystery game',
      'bachelorette party games at home',
      'all female murder mystery game',
      'love island murder mystery game',
    ],
    recommendedThemeSlug: 'death-on-arrival',
    groupSizeLabel: 'Up to 16 Hens / Bridesmaids',
    prepTimeLabel: 'Ready to Print or Play on Phones in ~20 Mins',
    whyTitle: 'Why a Custom Murder Mystery is the #1 Hen Do & Bachelorette Icebreaker',
    whyParagraphs: [
      'The hardest part of any hen weekend or bachelorette party is getting different friend groups—school friends, work friends, sisters, and cousins—laughing together without awkward small talk.',
      'Back Pocket Mysteries turns your real bridesmaids and hens into larger-than-life suspects (like messy Reality TV contestants in Love On The Rocks or glamorous performers in Cirque du Crime). Because our AI weaves your friends’ real names, traits, and inside jokes into the alibis and leaked group-chat clues, everyone is howling with laughter before the first drink is finished.',
    ],
    highlights: [
      {
        title: 'All-Female & Flexible Gender Casting',
        description:
          'Unlike traditional box sets that force half your hens to play wooden male roles, every character adapts seamlessly to an all-female, mixed, or non-binary group.',
      },
      {
        title: 'Make the Bride the Main Character (or Victim!)',
        description:
          'Cast the Bride-to-Be as the glamorous centre of every scandal, while the Maid of Honour can play along spoiler-free without knowing who the killer is.',
      },
      {
        title: 'Airbnb & Living Room Friendly',
        description:
          'Print the character booklets before you travel or cast the interactive Playroom + voice-acted Inspector audio clues straight to the Airbnb TV and guests’ phones.',
      },
    ],
    faqs: [
      {
        question: 'Can we play a Back Pocket Mystery with an all-female hen party?',
        answer:
          'Yes! Every character role in our mysteries can be cast as female, male, or adaptable, and our engine automatically adjusts pronouns, portraits, and relationships to match your exact hen party line-up.',
      },
      {
        question: 'Does the Maid of Honour or organizer get spoiled on who the killer is?',
        answer:
          'No! Our Spoiler-Free Host Mode lets the organizer play as a full suspect alongside the bride and bridesmaids. The digital Playroom and sealed reveal pack keep the murderer hidden until the final vote.',
      },
      {
        question: 'What if someone drops out last-minute before the hen weekend?',
        answer:
          'You can swap guests or use Hybrid Mode to fill any empty slot with a Fictional Mystery Suspect in seconds without breaking the plot.',
      },
    ],
  },
  {
    slug: 'birthday-murder-mystery-party-games',
    navLabel: 'Birthday Murder Mystery Games',
    emoji: '🎂',
    badge: '30th, 40th, 50th & Adult Birthday Parties',
    title: 'Birthday Party',
    titleHighlight: 'Murder Mystery Games',
    subtitle:
      'Turn your 21st, 30th, 40th, or 50th birthday dinner into the night your friends talk about all year. A custom murder mystery written around the birthday host and your actual guest list.',
    metaTitle:
      'Birthday Murder Mystery Party Games for Adults (30th, 40th, 50th) | Back Pocket Mysteries',
    metaDescription:
      'Host an unforgettable adult birthday murder mystery party at home. Custom character booklets, inside jokes, printable clues, and interactive audio briefings for up to 16 guests.',
    keywords: [
      'birthday murder mystery party game',
      '30th birthday murder mystery party',
      '40th birthday murder mystery ideas',
      'adult birthday murder mystery game',
      'custom birthday murder mystery kit',
      'murder mystery dinner party birthday',
    ],
    recommendedThemeSlug: 'death-on-arrival',
    groupSizeLabel: 'Up to 16 Birthday Guests',
    prepTimeLabel: 'Custom Digital Pack + Printable PDFs in ~20 Mins',
    whyTitle: 'Roast the Birthday Star with a Mystery Built Around Their Friends',
    whyParagraphs: [
      'Milestone birthdays deserve more than sitting around a table scrolling through phones. A custom murder mystery gives everyone a costume prompt, a secret motive, and an excuse to accuse their best friends of murder over cocktails.',
      'With Back Pocket Mysteries, you can weave the birthday guest of honour’s funniest memories, quirks, and friend-group lore straight into the crime scene evidence, intercepted text messages, and character rivalries.',
    ],
    highlights: [
      {
        title: 'Personalized Inside Jokes & Roasts',
        description:
          'Add your group’s favourite memories and traits during setup—our story engine embeds them naturally into character dossiers and forensic clues.',
      },
      {
        title: 'Birthday Host Plays Spoiler-Free',
        description:
          'Even if you’re planning your own birthday dinner party, you never see who the killer is until the dramatic final reveal.',
      },
      {
        title: 'Works Over Dinner or Drinks',
        description:
          'Structured into 3 easy rounds (Mingling, Investigation, and Final Accusations) that flow naturally alongside a 3-course dinner or casual buffet and drinks.',
      },
    ],
    faqs: [
      {
        question: 'How long does a birthday murder mystery party take to play?',
        answer:
          'Most groups play across 2 to 3 hours alongside dinner and drinks. Each of the 3 rounds takes about 35–45 minutes, followed by final voting and the big killer reveal.',
      },
      {
        question: 'Can we customize the characters around the birthday person?',
        answer:
          'Absolutely. You assign your real guests to the characters, pick their traits, and add inside jokes so the dossiers feel tailormade for the birthday group.',
      },
    ],
  },
  {
    slug: 'dinner-party-murder-mystery-games-for-adults',
    navLabel: 'Adult Dinner Party Games',
    emoji: '🍷',
    badge: 'Dinner Parties & Game Nights at Home',
    title: 'Murder Mystery Dinner Party',
    titleHighlight: 'Games for Adults',
    subtitle:
      'Host a killer dinner party tonight with zero theatre-kid awkwardness. Modern, sharp, personalised murder mystery kits with printable evidence, leaked text messages, and voice-acted Inspector briefings.',
    metaTitle:
      'Murder Mystery Dinner Party Games for Adults (Printable & Digital) | Back Pocket Mysteries',
    metaDescription:
      'Host a modern murder mystery dinner party for adults at home. Personalised characters, printable evidence, voice-acted audio clues, and spoiler-free host mode.',
    keywords: [
      'murder mystery dinner party games for adults',
      'printable murder mystery dinner party game',
      'dinner party murder mystery kit',
      'murder mystery games for adults at home',
      'modern murder mystery party game',
      'interactive murder mystery dinner party',
    ],
    recommendedThemeSlug: 'cirque-du-crime',
    groupSizeLabel: 'Up to 16 Dinner Guests',
    prepTimeLabel: 'Zero-Prep Host Mode • 3 Guided Rounds',
    whyTitle: 'Designed for Modern Adult Dinner Parties (Not Cheesy 1990s Board Games)',
    whyParagraphs: [
      'Most downloadable murder mystery games feel like dusty 40-page scripts written in 1998 where guests have to read awkward paragraphs word-for-word. Back Pocket Mysteries replaces stiff script-reading with natural conversation objectives, juicy secrets, and visual crime-scene evidence.',
      'Between courses, guests scan QR codes or open the live Playroom to hear voice-acted Inspector updates, inspect forensic reports, and grill each other across the dinner table.',
    ],
    highlights: [
      {
        title: '3 Rounds Timed to Your Courses',
        description:
          'Round 1 pairs with starters/aperitifs, Round 2 unfolds over the main course as new physical and audio evidence drops, and Round 3 wraps up over dessert with final accusations.',
      },
      {
        title: 'Choose Your Spice & Tone Level',
        description:
          'From clean family-friendly whodunnits to messy, scandalous adult drama with blackmail, secret flings, and sharp banter.',
      },
      {
        title: 'Print-at-Home or Paperless Mobile Mode',
        description:
          'Love tactile crime scene folders? Print our formatted PDF dossiers. Prefer zero printing? Guests can view their booklets and clues right on their phones via a 6-digit Game PIN.',
      },
    ],
    faqs: [
      {
        question: 'Do guests have to memorize scripts or act in front of everyone?',
        answer:
          'No! Nobody has to memorize lines. Each guest gets simple round-by-round conversation prompts, secrets to hide, and questions to ask other suspects during normal dinner conversation.',
      },
      {
        question: 'How much preparation does the dinner party host need to do?',
        answer:
          'About 15–30 minutes total. You enter your guest list, send one-click digital invites so friends know their costume vibe, and either print the PDF pack or launch the digital Playroom on party night.',
      },
    ],
  },
  {
    slug: 'small-group-murder-mystery-games-4-6-8-players',
    navLabel: 'Small Group (4–8 Players)',
    emoji: '🕵️',
    badge: '4, 5, 6, 7 & 8 Player Murder Mystery Games',
    title: 'Small Group Murder Mystery',
    titleHighlight: 'Games (4–8 Players)',
    subtitle:
      'Struggling to find a murder mystery that actually works for 4, 5, 6, 7, or 8 players? Our dynamic story engine scales suspects, alibis, and red herrings to your exact headcount so nobody is left out.',
    metaTitle:
      'Small Group Murder Mystery Games for 4, 5, 6, 7 or 8 Players | Back Pocket Mysteries',
    metaDescription:
      'Play a custom murder mystery game designed for small groups of 4, 5, 6, 7, or 8 players. Spoiler-free for the host so everyone plays as a suspect!',
    keywords: [
      'murder mystery game for 4 players',
      'murder mystery game for 5 players',
      'murder mystery game for 6 players',
      'murder mystery game for 7 players',
      'murder mystery game for 8 players',
      'small group murder mystery party game',
      'couples murder mystery dinner party',
    ],
    recommendedThemeSlug: 'cirque-du-crime',
    groupSizeLabel: 'Exact Fit for 4, 5, 6, 7, or 8 Players',
    prepTimeLabel: 'Host Plays as a Suspect Too',
    whyTitle: 'Why Small Groups Love Back Pocket Mysteries',
    whyParagraphs: [
      'Traditional murder mystery box sets require an exact fixed number of guests (usually 8 to 12) plus a dedicated non-playing host. If you only have 4, 5, or 6 friends coming over—or if one couple cancels an hour before dinner—traditional kits fall apart because the killer or key witness is missing.',
      'Back Pocket Mysteries dynamically builds the investigation around your exact active cast. Even better, our Spoiler-Free Host Mode means in a group of 4 or 6, the host gets to be a full suspect instead of sitting on the sidelines reading a rulebook.',
    ],
    highlights: [
      {
        title: 'Works for Odd & Even Numbers (4, 5, 6, 7, 8+)',
        description:
          'Whether you are hosting two couples (4 players), a cosy dinner of 5 or 7, or a table of 8, every active character holds essential clues and a plausible motive.',
      },
      {
        title: 'Last-Minute Dropout Protection',
        description:
          'Someone sick on the day of the party? Toggle them off in your cast dashboard and your mystery pack automatically adjusts.',
      },
      {
        title: 'Intimate, High-Stakes Interrogation',
        description:
          'With a smaller group, everyone gets more spotlight time, deeper character connections, and hilarious cross-table interrogations.',
      },
    ],
    faqs: [
      {
        question: 'Can you really play a murder mystery party game with just 4 or 5 people?',
        answer:
          'Yes! Because the host plays spoiler-free as one of the suspects and our voice-acted Inspector guides the rounds, a 4-player or 5-player table has plenty of suspects, alibis, and twists.',
      },
      {
        question: 'What happens if we have 6 players and 1 person cancels on the night?',
        answer:
          'Simply mark that guest inactive in your Back Pocket Mysteries dashboard before starting Round 1—the game ensures the killer and critical clues remain among your active guests.',
      },
    ],
  },
];

export function getOccasionSeoPageBySlug(slug: string): OccasionSeoPageData | undefined {
  return OCCASION_SEO_PAGES.find((p) => p.slug === slug);
}
