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
      'Hen Party & Bachelorette Murder Mystery Games (100% Online & Custom) | Back Pocket Mysteries',
    metaDescription:
      'Looking for the ultimate hen do or bachelorette murder mystery party game? Personalize characters with the bride’s inside jokes, leaked group chats, and audio clues in ~20 minutes.',
    keywords: [
      'hen party murder mystery game',
      'bachelorette murder mystery party',
      'hen do murder mystery game online',
      'girls night murder mystery game',
      'bachelorette party games at home',
      'all female murder mystery game',
      'love island murder mystery game',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: 'Up to 16 Hens / Bridesmaids',
    prepTimeLabel: 'Ready to Play on Phones in ~20 Mins',
    whyTitle: 'Why a Custom Murder Mystery is the #1 Hen Do & Bachelorette Icebreaker',
    whyParagraphs: [
      'The hardest part of any hen weekend or bachelorette party is getting different friend groups—school friends, work friends, sisters, and cousins—laughing together without awkward small talk.',
      'Back Pocket Mysteries turns your real bridesmaids and hens into larger-than-life suspects (like tangled childhood friends and neighbours in Christmas Nightmare). Because our AI weaves your friends’ real names, traits, and inside jokes into the alibis and leaked group-chat clues, everyone is howling with laughter before the first drink is finished.',
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
        title: 'Airbnb & Living Room Friendly (Zero Printing)',
        description:
          'No need to pack paper folders—guests join the interactive Playroom + voice-acted Inspector audio clues straight from their phones via a 6-digit Game PIN.',
      },
    ],
    faqs: [
      {
        question: 'Can we play a Back Pocket Mystery with an all-female hen party?',
        answer:
          'Yes! Every character role in our mysteries can be cast as female, male, or adaptable, and pronouns, portraits, and relationships adjust automatically to match your exact hen party line-up.',
      },
      {
        question: 'Does the Maid of Honour or organizer get spoiled on who the killer is?',
        answer:
          'No! Our Spoiler-Free Host Mode lets the organizer play as a full suspect alongside the bride and bridesmaids. The digital Playroom keeps the murderer hidden until the final vote.',
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
      'Host an unforgettable adult birthday murder mystery party at home. Custom character dossiers, inside jokes, digital CCTV & chat clues, and interactive audio briefings for up to 16 guests.',
    keywords: [
      'birthday murder mystery party game',
      '30th birthday murder mystery party',
      '40th birthday murder mystery ideas',
      'adult birthday murder mystery game',
      'custom birthday murder mystery kit',
      'murder mystery dinner party birthday',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: 'Up to 16 Birthday Guests',
    prepTimeLabel: '100% Online Custom Pack Ready in ~20 Mins',
    whyTitle: 'Roast the Birthday Star with a Mystery Built Around Their Friends',
    whyParagraphs: [
      'Milestone birthdays deserve more than sitting around a table scrolling through phones. A custom murder mystery gives everyone a costume prompt, a secret motive, and an excuse to accuse their best friends of murder over cocktails.',
      'With Back Pocket Mysteries, you can weave the birthday guest of honour’s funniest memories, quirks, and friend-group lore straight into the crime scene evidence, intercepted text messages, and character rivalries.',
    ],
    highlights: [
      {
        title: 'Personalized Inside Jokes & Roasts',
        description:
          'Add your group’s favourite memories and traits during setup—we weave them naturally into character dossiers and forensic clues.',
      },
      {
        title: 'Birthday Host Plays Spoiler-Free',
        description:
          'Even if you’re planning your own birthday dinner party, you never see who the killer is until the dramatic final reveal.',
      },
      {
        title: 'Works Over Dinner or Drinks',
        description:
          'Structured into 3 to 5 rounds (Basic = 3 rounds, Premium = 4 rounds, Grand = 5 rounds) that flow naturally alongside dinner or casual buffet and drinks.',
      },
    ],
    faqs: [
      {
        question: 'How long does a birthday murder mystery party take to play?',
        answer:
          'Most groups play across 2 to 3 hours alongside dinner and drinks. Depending on your package tier (Basic = 3 rounds, Premium = 4 rounds, Grand = 5 rounds), each round takes about 30–40 minutes, followed by final voting and the big killer reveal.',
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
      'Host a killer dinner party tonight with zero theatre-kid awkwardness. Modern, sharp, personalised murder mystery kits with CCTV evidence, leaked text messages, and voice-acted Inspector briefings.',
    metaTitle:
      'Murder Mystery Dinner Party Games for Adults (100% Online & Personalised) | Back Pocket Mysteries',
    metaDescription:
      'Host a modern murder mystery dinner party for adults at home. Personalised characters, interactive mobile evidence, voice-acted audio clues, and spoiler-free host mode.',
    keywords: [
      'murder mystery dinner party games for adults',
      'online murder mystery dinner party game',
      'dinner party murder mystery kit',
      'murder mystery games for adults at home',
      'modern murder mystery party game',
      'interactive murder mystery dinner party',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: 'Up to 16 Dinner Guests',
    prepTimeLabel: 'Zero-Prep Host Mode • 3 to 5 Guided Rounds',
    whyTitle: 'Designed for Modern Adult Dinner Parties (Not Cheesy 1990s Board Games)',
    whyParagraphs: [
      'Most downloadable murder mystery games feel like dusty 40-page scripts written in 1998 where guests have to read awkward paragraphs word-for-word. Back Pocket Mysteries replaces stiff script-reading with natural conversation objectives, juicy secrets, and visual crime-scene evidence.',
      'Between courses, guests open the live Playroom on their phones to hear voice-acted Inspector updates, inspect forensic reports, and grill each other across the dinner table.',
    ],
    highlights: [
      {
        title: '3 to 5 Rounds Timed to Your Courses',
        description:
          'Basic packs run 3 rounds, Premium packs run 4 rounds, and Grand packs run 5 rounds—pairing seamlessly with arrival drinks, starters, mains, and dessert before final accusations.',
      },
      {
        title: 'Choose Your Spice & Tone Level',
        description:
          'From clean family-friendly whodunnits to messy, scandalous adult drama with blackmail, secret flings, and sharp banter.',
      },
      {
        title: '100% Paperless Mobile Playroom',
        description:
          'Zero printing or envelope stuffing required—guests view their custom character dossiers, CCTV stills, and clues right on their phones via a 6-digit Game PIN.',
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
          'About 15–20 minutes total. You enter your guest list, send one-click digital invites so friends know their costume vibe, and launch the live 6-digit PIN Playroom on party night.',
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
      'Struggling to find a murder mystery that actually works for 4, 5, 6, 7, or 8 players? Every story scales suspects, alibis, and red herrings to your exact headcount so nobody is left out.',
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
    recommendedThemeSlug: 'christmas-nightmare',
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
  {
    slug: 'christmas-murder-mystery-party-games',
    navLabel: 'Christmas & Holiday Parties',
    emoji: '🎄',
    badge: 'Christmas Eve, Festive Dinners & Office Xmas Parties',
    title: 'Christmas Murder Mystery',
    titleHighlight: 'Party Games',
    subtitle:
      'Swap awkward festive charades for a high-stakes Christmas mansion scandal. Cast your real family, friends, or workmates into our signature Christmas Nightmare mystery with custom portraits, CCTV stills, and audio wiretaps.',
    metaTitle:
      'Christmas Murder Mystery Party Games for Adults (100% Online & Custom) | Back Pocket Mysteries',
    metaDescription:
      'Host an unforgettable Christmas murder mystery dinner party. Cast your friends or family into Christmas Nightmare with custom character dossiers, CCTV clues, and a live 6-digit PIN mobile lobby.',
    keywords: [
      'christmas murder mystery game',
      'christmas murder mystery party game for adults',
      'holiday murder mystery dinner party',
      'christmas eve murder mystery game',
      'festive murder mystery party kit',
      'custom christmas murder mystery',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: '6 to 16 Festive Suspects (+ Unlimited Extra Detectives)',
    prepTimeLabel: '100% Online • Ready in ~20 Mins',
    whyTitle: 'Why a Custom Christmas Murder Mystery Beats Every Board Game',
    whyParagraphs: [
      'Every December, hosts face the same challenge: finding a Christmas party activity that keeps everyone from your competitive brother-in-law to your best friends laughing and engaged between turkey and dessert.',
      'Our flagship holiday pack, Christmas Nightmare, locks your guests inside a snowbound black-tie Christmas Eve dinner where the host of the manor is found dead by the tree. Because we weave your guests’ real names, traits, and inside jokes into the alibis, leaked texts, and CCTV evidence, everyone is invested from the first glass of mulled wine.',
    ],
    highlights: [
      {
        title: 'Choose Clean (Family/Office SFW) or Mild/Spicy Drama',
        description:
          'Hosting family or co-workers? Choose Clean for high-stakes inheritance greed, blackmail, and sabotage with zero romantic affairs or swearing. Hosting close friends? Dial up the festive scandal.',
      },
      {
        title: 'Flexible Casting for Any Holiday Table',
        description:
          'Whether your Christmas table has 3 men and 3 women, 5 women and 1 man, or an all-female friendsmas group, every character role adapts titles, pronouns, and festive outfits automatically.',
      },
      {
        title: 'Zero Last-Minute Christmas Printing',
        description:
          'No running out of printer ink on Christmas Eve—guests join the live Playroom on their phones via a 6-digit Game PIN to inspect forensic reports and audio wiretaps.',
      },
    ],
    faqs: [
      {
        question: 'Is Christmas Nightmare suitable for a family or work Christmas party?',
        answer:
          'Yes! You can select the Clean (Safe For Work & Family) spice tier so the entire mystery revolves around financial blackmail, inheritance greed, and sabotage with zero romantic affairs and 100% clean dialogue, or select Mild to include romantic betrayal.',
      },
      {
        question: 'Can the Christmas party host play without knowing who the killer is?',
        answer:
          'Yes! Spoiler-Free Host Mode keeps the murderer’s identity locked until the Round 3 accusation vote so the host plays as a full suspect.',
      },
    ],
  },
  {
    slug: 'all-female-murder-mystery-party-games',
    navLabel: 'All-Female & Girls Night',
    emoji: '👑',
    badge: 'All-Female Casts, Girls Night In & Bachelorettes',
    title: 'All-Female Murder Mystery',
    titleHighlight: 'Party Games',
    subtitle:
      'Finally, a murder mystery where nobody is forced to draw on a fake moustache and play "Lord Reginald." Every suspect role, relationship, and costume portrait adapts automatically for a 100% female cast.',
    metaTitle:
      'All-Female Murder Mystery Party Games (Girls Night & Bachelorette) | Back Pocket Mysteries',
    metaDescription:
      'Looking for an all-female murder mystery game for adults? Every Back Pocket Mystery adapts 100% of character titles, pronouns, outfits, and clues to an all-women cast.',
    keywords: [
      'all female murder mystery game',
      'all women murder mystery party',
      'girls night murder mystery game for adults',
      'female only murder mystery party kit',
      'bachelorette murder mystery game all female',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: '6 to 16 Female Suspects (+ Extra Detectives)',
    prepTimeLabel: 'Auto-Adapts Titles, Pronouns & Outfits',
    whyTitle: 'How Our Flexible Casting Solves the All-Female Party Problem',
    whyParagraphs: [
      'Almost every off-the-shelf murder mystery kit is written for a rigid 50/50 male-female split. If you are hosting a girls’ night in, a birthday dinner, or a bachelorette weekend, half your friends are usually stuck reading male pronouns and wearing awkward masculine costumes.',
      'Back Pocket Mysteries was designed from the ground up to adapt to any guest list. When you cast an all-female group (or 5 women and 1 man), the story automatically adapts character titles (e.g., The Brother-in-Law becomes The Sister-in-Law), updates every pronoun and relationship across every round of clues, and generates chic feminine costume portraits for every guest.',
    ],
    highlights: [
      {
        title: 'Zero Awkward Cross-Gender Scripts',
        description:
          'Every character bio, leaked group-chat message, audio wiretap, and forensic report uses your guests’ actual names and pronouns naturally.',
      },
      {
        title: 'Glamorous Costume Guides & Portraits',
        description:
          'Send 1-click WhatsApp character invites before the party with tailored feminine outfit inspiration and custom character portraits.',
      },
      {
        title: 'Designed & Tested for All-Female Groups',
        description:
          'Every story in our catalog is tested with an all-female cast so every clue, relationship, and alibi reads seamlessly.',
      },
    ],
    faqs: [
      {
        question: 'Does the story still make sense if all 6 to 10 players are women?',
        answer:
          '100% yes. Every relationship (sister/wife/partner/ex) and pronoun across every single clue, timeline, and motive adapts automatically so the mystery reads as if it were written exclusively for your girls’ night.',
      },
      {
        question: 'What if we have mostly women and just 1 or 2 men?',
        answer:
          'It works seamlessly for any ratio—whether all-female, mostly women, mixed, or all-male. Each role adapts automatically to match your exact guest list.',
      },
    ],
  },
  {
    slug: 'corporate-team-building-murder-mystery-games',
    navLabel: 'Corporate & Team Building',
    emoji: '💼',
    badge: 'Safe-For-Work (Clean Tier) • In-Office or Remote Teams',
    title: 'Corporate Team-Building',
    titleHighlight: 'Murder Mystery Games',
    subtitle:
      'High-stakes deductive team-building without the HR headaches. Full adult murder mystery plots with corporate sabotage, financial blackmail, and alibi cross-examination—with 100% clean dialogue and zero romantic affair roleplay.',
    metaTitle:
      'Corporate Team-Building Murder Mystery Games (Safe For Work & Online) | Back Pocket Mysteries',
    metaDescription:
      'Host a corporate team-building murder mystery game for 6 to 16 colleagues (+ extra Detectives). Clean SFW spice level guarantees zero romantic roleplay and zero profanity while delivering complex forensic deduction.',
    keywords: [
      'corporate murder mystery team building',
      'office murder mystery party game',
      'work friendly murder mystery game',
      'team building murder mystery online',
      'clean adult murder mystery game for coworkers',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: '6 to 16 Core Roles + Unlimited Team Detectives',
    prepTimeLabel: '✨ Clean SFW Tier • 100% Online Mobile Lobby',
    whyTitle: 'Built for Smart Teams Who Hate Cringey Icebreakers',
    whyParagraphs: [
      'Most corporate team-building activities fail for one of two reasons: either they feel like childish trust-falls, or someone buys a standard murder mystery kit and two co-workers suddenly discover their characters are having a steamy love affair.',
      'Our Clean (Safe For Work & Family) tier keeps all the intellectual thrill of a real adult murder investigation—poisoned drinks, stolen patents, embezzlement, blackmail ledgers, and timestamped CCTV alibi math—while strictly enforcing zero romantic affair roleplay between players and zero profanity.',
    ],
    highlights: [
      {
        title: 'Strict SFW Roleplay Boundary (Zero Office Awkwardness)',
        description:
          'Colleagues interrogate each other over financial motives, alibi timeline gaps, and forensic evidence—never awkward romantic subplots.',
      },
      {
        title: 'Scales to Large Teams with Free Guest Detective Slots',
        description:
          'Cast 6 to 16 team members as the core suspects while unlimited additional colleagues join the live 6-digit PIN lobby on their phones as named Detectives (or pair up in 2-person investigative teams).',
      },
      {
        title: 'Works In-Person, Hybrid, or 100% Remote on Zoom/Teams',
        description:
          'Because all dossiers, CCTV stills, chat logs, and audio wiretaps are delivered in the live browser Playroom, remote and in-office teammates can play together effortlessly.',
      },
    ],
    faqs: [
      {
        question: 'What happens if we have 20 or 30 people on our team?',
        answer:
          'You can cast up to 16 colleagues as the core suspects (or 6–10 in Basic/Premium), and unlimited extra team members can join the exact same 6-digit Game PIN lobby on their phones as "Detective [Name]" to inspect every clue and vote on the killer!',
      },
      {
        question: 'Can the team manager or event organizer transferred host controls to a colleague?',
        answer:
          'Yes! Any purchaser can use the 1-click "🔁 Transfer Host" button inside My Mysteries to hand full host ownership to the event facilitator.',
      },
    ],
  },
  {
    slug: 'online-virtual-zoom-murder-mystery-party-games',
    navLabel: '100% Online & Virtual / Zoom',
    emoji: '📱',
    badge: '100% Online Live Mobile & Web Playroom • Zero Printing',
    title: '100% Online & Virtual',
    titleHighlight: 'Murder Mystery Games',
    subtitle:
      'Whether your friends are sitting around the same living room or dialing in over Zoom, FaceTime, or Discord across three time zones, our Kahoot-style 6-digit Game PIN Playroom syncs everyone’s dossiers and clues in real time.',
    metaTitle:
      '100% Online & Virtual Zoom Murder Mystery Party Games | Back Pocket Mysteries',
    metaDescription:
      'Play a 100% online custom murder mystery game on phones, tablets, or laptops via a 6-digit Game PIN. Perfect for paperless in-person parties or virtual Zoom game nights.',
    keywords: [
      'online murder mystery party game',
      'virtual murder mystery game zoom',
      'digital murder mystery game on phones',
      'paperless murder mystery party',
      'remote murder mystery game for friends',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: '4 to 16 Players (+ Extra Detectives) Anywhere in the World',
    prepTimeLabel: 'Instant 6-Digit PIN Join • No App Download',
    whyTitle: 'One Live 6-Digit Game PIN. Zero PDFs. Zero App Downloads.',
    whyParagraphs: [
      'Running a virtual or modern in-person murder mystery used to mean emailing 12 separate PDF attachments and hoping nobody accidentally opened the killer solution file.',
      'Back Pocket Mysteries runs entirely inside our synchronized Live Mobile & Web Playroom. Before the party, you send each friend their spoiler-free 1-click invite link. When the game begins, the host clicks "🚀 Start Game" to reveal the 6-digit Game PIN, and every round’s CCTV photos, leaked group-chat texts, and multi-speaker audio wiretaps unlock on everyone’s screens simultaneously.',
    ],
    highlights: [
      {
        title: 'Synchronized Multi-Round Evidence Drops (3–5 Rounds)',
        description:
          'When the host advances the round (across 3 rounds in Basic, 4 in Premium, or 5 in Grand), every player’s phone or laptop browser unlocks the new forensic clues, audio briefings, and accusation prompts in real time.',
      },
      {
        title: 'Built-In Detective Notebook & Live Voting',
        description:
          'Players can tag clues, cross-reference suspect bios, and cast their final killer vote right inside the browser before the dramatic animated reveal.',
      },
      {
        title: 'Works In-Person OR Over Zoom / Discord / Teams',
        description:
          'Use phones as second-screen detective dossiers in your living room, or share your screen on a video call for long-distance friend groups.',
      },
    ],
    faqs: [
      {
        question: 'Do my guests need to download an app or create an account to play?',
        answer:
          'No! Guests join directly in any mobile, tablet, or desktop web browser using their character invite link or your 6-digit Game PIN.',
      },
      {
        question: 'Can I play with fewer than 6 people online?',
        answer:
          'Yes! If you have 2 to 5 players on a call (or on the sofa), simply choose Hybrid Mode or Couch Detective / Case-File Mode to investigate all 6 interlocking suspect dossiers together.',
      },
    ],
  },
  {
    slug: 'murder-mystery-game-for-6-players',
    navLabel: '6-Player Murder Mystery Games',
    emoji: '6️⃣',
    badge: 'Exact Fit for 6 Players (1 Victim + 5 Suspects)',
    title: 'Murder Mystery Games',
    titleHighlight: 'for 6 Players',
    subtitle:
      'Looking for a murder mystery party game built specifically for 6 players? Our Basic Tier features 6 tightly interlocked characters with tangled alibis, 25+ timeline data points, and Spoiler-Free Host Mode so all 6 of you play.',
    metaTitle:
      'Murder Mystery Games for 6 Players (Custom & 100% Online) | Back Pocket Mysteries',
    metaDescription:
      'Host a custom 6-player murder mystery dinner party. Cast your 6 guests into interlocking suspect roles with personalised clues, CCTV evidence, audio wiretaps, and spoiler-free host mode.',
    keywords: [
      'murder mystery game for 6 players',
      '6 player murder mystery party game',
      '6 person murder mystery dinner party',
      'murder mystery game 6 adults',
      'small group murder mystery 6 players',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: '6 Core Characters (+ Unlimited Free Extra Detectives)',
    prepTimeLabel: 'Basic Tier • Ready in ~20 Mins',
    whyTitle: 'Why 6 Players Is the Ultimate Dinner Table Detective Count',
    whyParagraphs: [
      'Six players is the golden number for an intimate dinner party—everyone sits around one table, hears every accusation, and gets caught in real-time contradictions. Yet most boxed murder mystery kits require 8 to 12 people and force the host to sit out as a referee.',
      'In a Back Pocket Mysteries 6-player game, every single seat at your table is essential to the crime timeline. Because our Spoiler-Free Host Mode automates the round briefings and final reveal, the host plays as a full suspect—and if a 7th or 8th friend joins last minute, they can hop into the 6-digit PIN lobby for free as "Detective [Name]"!',
    ],
    highlights: [
      {
        title: 'Zero Filler Roles — All 6 Characters Have Deep Motives',
        description:
          'Every suspect in a 6-player pack has a serious motive, a secret to hide, and timestamped movements that collide with the other 5 players across Rounds 1, 2, and 3.',
      },
      {
        title: 'Any Group Mix Works (Mixed, Mostly Women, or All-Female)',
        description:
          'Don’t have an even 3-male / 3-female split? Every role automatically adapts titles, pronouns, and outfits to your exact 6 guests.',
      },
      {
        title: 'Flat One-Time Package Price ($0 Per-Guest Add-On Fees)',
        description:
          'One flat price covers the entire 6-player custom mystery with zero per-player add-on fees and zero subscriptions.',
      },
    ],
    faqs: [
      {
        question: 'In a 6-player mystery, does the person playing the Victim still play the whole game?',
        answer:
          'Yes! Either the Victim is discovered right as Round 1 begins and immediately transitions into the Lead Inspector / Detective role with full investigative powers, or you can assign the Victim slot to a Fictional Character so all 6 of your real friends play active suspects!',
      },
      {
        question: 'What if a 7th friend shows up on the night of our 6-player party?',
        answer:
          'Unlimited extra friends can scan the QR code or enter your 6-digit Game PIN to join free as "Detective [Name]" with full access to the evidence feed and final killer vote.',
      },
    ],
  },
  {
    slug: 'murder-mystery-game-for-8-players',
    navLabel: '8-Player Murder Mystery Games',
    emoji: '8️⃣',
    badge: 'Perfect for 8-Player Dinner Parties & Four Couples',
    title: 'Murder Mystery Games',
    titleHighlight: 'for 8 Players',
    subtitle:
      'Hosting 8 friends or 4 couples for dinner and drinks? Cast all 8 guests into a custom human-written murder mystery tailored with their real names, traits, inside jokes, and interactive mobile evidence.',
    metaTitle:
      'Murder Mystery Games for 8 Players (Custom & 100% Online) | Back Pocket Mysteries',
    metaDescription:
      'Host a custom 8-player murder mystery party at home or online. Personalised character dossiers, CCTV & chat clues, voice-acted audio wiretaps, and spoiler-free host mode.',
    keywords: [
      'murder mystery game for 8 players',
      '8 player murder mystery party',
      '8 person murder mystery dinner party game',
      'murder mystery for 8 adults',
      'four couples murder mystery game',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: '8 Personalized Suspects (+ Free Extra Detectives)',
    prepTimeLabel: '100% Online Live Mobile Lobby • Ready in ~20 Mins',
    whyTitle: 'Why 8 Players Is the Classic Dinner Party Sweet Spot',
    whyParagraphs: [
      'Eight players is large enough for secret side-alliances, tangled red-herring subplots, and whispered accusations by the drinks table, while still small enough that everyone interacts with everyone else in every round.',
      'With Back Pocket Mysteries, you can either run our Premium 8-to-10-character suspect web (filling any extra slots with Fictional Suspects in Hybrid Mode) or cast 6 core roles and let 2 guests play as Lead Detectives—all synchronized through a single 6-digit Game PIN.',
    ],
    highlights: [
      {
        title: 'Multi-Subplot Red Herrings & Alibi Pairs',
        description:
          'With 8 players in the room, innocent suspects are busy covering up secondary scandals (blackmail, secret affairs, or sabotaged contracts), making Round 1 and Round 2 deductions electric.',
      },
      {
        title: 'Dropout-Proof Hybrid Casting',
        description:
          'If 1 or 2 of your 8 guests cancel on party day, simply switch their slot to a Fictional Suspect in 1 click without spoiling or breaking the clue chain.',
      },
      {
        title: 'Host Plays Along 100% Spoiler-Free',
        description:
          'All 8 people at your table get to play and vote on the killer without anyone having to read the solution ahead of time.',
      },
    ],
    faqs: [
      {
        question: 'What if we have 8 players with an uneven gender ratio (like 6 women and 2 men)?',
        answer:
          'Every character role flexes automatically to any guest gender—updating titles, pronouns, relationship references, and costume recommendations so your exact 8 guests fit effortlessly.',
      },
      {
        question: 'How long does an 8-player murder mystery take to play?',
        answer:
          'Typically 90 to 150 minutes across 4 investigation rounds (on our Premium Tier), timed naturally around drinks or dinner.',
      },
    ],
  },
  {
    slug: 'murder-mystery-game-for-10-players',
    navLabel: '10-Player Murder Mystery Games',
    emoji: '🔟',
    badge: 'Premium Tier • Up to 10 Custom Characters • 4 Rounds',
    title: 'Murder Mystery Games',
    titleHighlight: 'for 10 Players',
    subtitle:
      'Built for lively 10-player dinner parties, milestone birthdays, and hen weekends. Ten custom-named characters, entangled rival factions, leaked group-chat screenshots, CCTV evidence, and multi-speaker audio wiretaps across 4 rounds.',
    metaTitle:
      'Murder Mystery Games for 10 Players (Custom & 100% Online) | Back Pocket Mysteries',
    metaDescription:
      'Host a custom 10-player murder mystery party game. Cast 10 real friends into iconic roles with custom dossiers, CCTV & audio clues, and a live 6-digit PIN mobile Playroom.',
    keywords: [
      'murder mystery game for 10 players',
      '10 player murder mystery party game',
      '10 person murder mystery dinner party',
      'murder mystery game 10 adults',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: 'Up to 10 Custom Characters (+ Unlimited Extra Detectives)',
    prepTimeLabel: 'Premium Tier • 4 Investigation Rounds • 100% Online Mobile Playroom',
    whyTitle: 'High-Energy Mingling & Rival Alliances for 10 Players',
    whyParagraphs: [
      'At 10 players, a murder mystery transforms from a single-table conversation into a full-room social deduction event where guests pull each other aside to compare alibis, trade leaked text screenshots, and verify timestamps.',
      'Our Premium Tier weaves all 10 of your guests’ real names, traits, and inside jokes into an interlocking web of motives and red herrings across 4 structured rounds—delivered 100% paperlessly to every guest’s phone via your 6-digit Game PIN.',
    ],
    highlights: [
      {
        title: '10 Interlocking Suspect Dossiers',
        description:
          'Every guest receives a pre-party invite link with their character backstory and outfit guide, plus round-by-round secrets and talking points on party night.',
      },
      {
        title: 'Synchronized 4-Round Mobile Clue Drops',
        description:
          'No shouting over a noisy 10-person room to hand out paper slips—as each of the 4 rounds unlocks, everyone’s phones chime with the new CCTV and audio wiretap evidence.',
      },
      {
        title: 'Live Accusation Tally & Superlative Awards',
        description:
          'At the end of Round 4, all 10 players lock in their killer vote and motive on their phones before the dramatic final reveal.',
      },
    ],
    faqs: [
      {
        question: 'What if we book for 10 players and 11 or 12 friends end up coming?',
        answer:
          'Any extra guests beyond the 10 character roles can join the live 6-digit Game PIN lobby for free as "Detective [Name]" with full access to all clues and voting!',
      },
      {
        question: 'What if only 8 or 9 of our 10 guests can make it?',
        answer:
          'You can either toggle optional characters off or assign any uncast role to a Fictional Mystery Suspect in Hybrid Mode so the 10-character web stays 100% intact.',
      },
    ],
  },
  {
    slug: 'murder-mystery-game-for-12-to-16-players',
    navLabel: 'Large Group (12–16 Players)',
    emoji: '🥂',
    badge: 'Grand Tier • 12 to 16 Player House Parties (+ Extra Detectives) • 5 Rounds',
    title: 'Large Group Murder Mystery',
    titleHighlight: 'Games (12–16 Players)',
    subtitle:
      'Hosting a big house party, weekend Airbnb getaway, hen party, or team social for 12 to 16 players? Our Grand Tier scales up to 16 custom suspect roles across 5 investigation rounds—plus unlimited extra friends can join free as named Guest Detectives.',
    metaTitle:
      'Large Group Murder Mystery Games for 12, 14 & 16 Players (+ Extra Detectives) | Back Pocket Mysteries',
    metaDescription:
      'Host a custom large-group murder mystery party for 12 to 16 players (+ unlimited extra Guest Detectives). Full-house suspect web, custom character dossiers, CCTV & audio clues, and a live 6-digit PIN mobile lobby.',
    keywords: [
      'murder mystery game for 12 players',
      'murder mystery game for 14 players',
      'murder mystery game for 16 players',
      'large group murder mystery party game',
      'house party murder mystery game for adults',
    ],
    recommendedThemeSlug: 'christmas-nightmare',
    groupSizeLabel: 'Up to 16 Suspects + Unlimited Free Extra Detectives',
    prepTimeLabel: 'Grand Tier • 5 Investigation Rounds • Zero Printing Required',
    whyTitle: 'How to Run a 12-to-16 Person Murder Mystery (+ Extra Detectives) Without Chaos',
    whyParagraphs: [
      'Anyone who has tried to run a traditional paper murder mystery for 14 or 16 people knows the nightmare: 80 pages of printing, 48 paper clue slips to sort into envelopes, and guests constantly asking "Wait, who is Lord Pemberton again?"',
      'Back Pocket Mysteries eliminates large-group chaos completely. First, every character is named after your real guests (`Sarah | The Bombshell`, `Marcus | The Producer`), and the live Room Cast directory on every phone shows each guest’s photo and role. Second, our 6-digit Game PIN Playroom pushes all 5 rounds of clues to all 16 suspects (plus any extra Guest Detectives) simultaneously.',
    ],
    highlights: [
      {
        title: 'Live Room Cast Directory on Every Phone',
        description:
          'Even in a group of 16 where some friends are meeting for the first time, everyone can see each suspect’s photo, real name, and role title right on their phone.',
      },
      {
        title: 'Multi-Faction Subplots & Accomplice Conspiracies',
        description:
          'Large groups thrive on faction drama—choose Medium or Hard difficulty packs where decoy alliances and secret accomplices keep the whole room debating.',
      },
      {
        title: 'Have More Than 16 Guests? Unlimited Detectives Join Free',
        description:
          'Hosting 18, 20, or 25 people? Cast 16 core suspects and let every additional guest join the live 6-digit PIN lobby free as "Detective [Name]".',
      },
    ],
    faqs: [
      {
        question: 'How do 12 to 16 players hear the audio wiretap clues at a lively house party?',
        answer:
          'Both the host’s screen (which you can connect to a TV or Bluetooth speaker) and every individual guest’s phone can play and replay the audio wiretaps and read the synced transcript anytime during the round!',
      },
      {
        question: 'Do I have to print 16 booklets for a large group?',
        answer:
          'Zero printing! Everything runs 100% online on your guests’ phones via your 6-digit Game PIN.',
      },
    ],
  },
];

export function getOccasionSeoPageBySlug(slug: string): OccasionSeoPageData | undefined {
  return OCCASION_SEO_PAGES.find((p) => p.slug === slug);
}

