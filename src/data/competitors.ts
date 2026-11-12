export interface Competitor {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  format: string;
  bestFor: string;
  price: string;
  priceNote: string;
  groupSize: string;
  personalisation: string;
  instant: boolean;
  searchKeywords: string[];
  pros: string[];
  cons: string[];
  verdict: string;
  rating: number; // out of 5
}

export const competitors: Competitor[] = [
  {
    slug: 'hunt-a-killer',
    name: 'Hunt a Killer',
    tagline: 'Monthly subscription puzzle boxes',
    description: 'Hunt a Killer is an episodic subscription service that mails physical evidence boxes, autopsy reports, cipher puzzles, and clue envelopes, across multiple months to build towards a mystery resolution.',
    format: 'Physical subscription box (monthly)',
    bestFor: 'Solo players and couples who enjoy puzzle-solving',
    price: '$30–$40/month',
    priceNote: 'Plus shipping. A full season costs $170–$200.',
    groupSize: '1–4 people',
    personalisation: 'None - fixed stories, pre-printed characters',
    instant: false,
    searchKeywords: ['hunt a killer review', 'hunt a killer alternative', 'hunt a killer vs', 'is hunt a killer worth it'],
    pros: ['High production quality physical items', 'Immersive true-crime storytelling', 'Fun for couples and small groups'],
    cons: [
      'Requires a monthly subscription, you wait weeks between episodes',
      'Not designed for parties, no roleplay or character roles for guests',
      'Expensive: $170–$200 per season vs $19 for a full personalised mystery',
      'Zero personalisation, same fixed story for everyone',
      'Physical shipping means you cannot play tonight',
    ],
    verdict: 'Hunt a Killer is great for solo puzzle fans, but it is not a party game. If you want guests laughing, acting, and mingling with a live mobile lobby and custom character booklets - Back Pocket Mysteries wins by a mile.',
    rating: 3,
  },
  {
    slug: 'my-mystery-party',
    name: 'My Mystery Party',
    tagline: 'Pre-written downloadable party kits',
    description: 'My Mystery Party sells pre-written murder mystery kits as instant downloads. They have a large library of fixed themes, but every character, clue, and script is the same for every buyer.',
    format: 'Instant download PDF kit',
    bestFor: 'Large corporate events and pre-planned parties',
    price: '$34.99–$59.99',
    priceNote: 'Per kit, fixed player count. Extra packs cost more.',
    groupSize: '6–300+ people',
    personalisation: 'None - same story, same characters, same clues every time',
    instant: true,
    searchKeywords: ['my mystery party review', 'my mystery party alternative', 'my mystery party vs', 'my mystery party coupon'],
    pros: ['Huge catalogue of themes', 'Instant download', 'Scales to very large groups'],
    cons: [
      'Completely fixed, guests may have played it before',
      'No AI personalisation, names, backstories, relationships are all generic',
      'No interactive mobile lobby or audio wiretap clues',
      'More expensive than Back Pocket Mysteries for comparable group sizes',
      'One-size-fits-all scripts feel impersonal',
    ],
    verdict: 'My Mystery Party has a large static PDF library, but every kit is identical. Back Pocket Mysteries casts your actual guests into iconic roles, with their real names, inside jokes, leaked group-chat clues, and a live 6-digit Game PIN lobby.',
    rating: 3,
  },
  {
    slug: 'night-of-mystery',
    name: 'Night of Mystery',
    tagline: 'Themed PDF murder mystery kits',
    description: 'Night of Mystery provides themed mystery party kits as downloadable PDFs. Popular for dinner parties, they offer a range of settings from 1920s Gatsby to pirate themes, but each game is entirely pre-written with no customisation.',
    format: 'Instant download PDF kit',
    bestFor: 'Themed dinner parties with 8–20 guests',
    price: '$60–$110+',
    priceNote: 'Per theme depending on party size tier.',
    groupSize: '8–20+ people',
    personalisation: 'None - fixed theme, characters, and clues',
    instant: true,
    searchKeywords: ['night of mystery review', 'night of mystery alternative', 'night of mystery vs', 'night of mystery coupon code'],
    pros: ['Good themed variety', 'Well-structured host guides', 'Instant download'],
    cons: [
      'No personalisation whatsoever, guests must memorize pre-set stranger names',
      'Fixed character brackets, awkward if your group size changes',
      'Downloaded by thousands, guests can look up spoilers online',
      'Static PDFs only, no live mobile lobby or audio wiretap clues',
      'Expensive ($60–$110+) compared to Back Pocket Mysteries',
    ],
    verdict: 'Night of Mystery delivers a solid off-the-shelf PDF, but "off the shelf" is the limitation. Back Pocket Mysteries generates a mystery written specifically for your group, complete with a Kahoot-style live mobile lobby and Spoiler-Free Host Mode.',
    rating: 3,
  },
  {
    slug: 'the-dinner-detective',
    name: 'The Dinner Detective',
    tagline: 'Professional actors at your venue',
    description: 'The Dinner Detective and The Murder Mystery Company send professional actors to perform an interactive murder mystery at your venue or their own restaurant events. Theatrical, polished - and extremely expensive.',
    format: 'Live actor-hosted event',
    bestFor: 'Corporate events with unlimited budget',
    price: '$950–$2,500+',
    priceNote: 'Per event. Travel fees and gratuity additional.',
    groupSize: '20–200 people',
    personalisation: 'Actors can improvise around the room, but the script is fixed',
    instant: false,
    searchKeywords: ['dinner detective review', 'dinner detective price', 'murder mystery company alternative', 'dinner detective vs'],
    pros: ['Professional actor performances', 'Zero host preparation', 'Theatrical and dramatic'],
    cons: [
      'Costs $950–$2,500+ per event, hugely expensive',
      'Requires booking weeks or months in advance',
      'Fixed script, same performance for every group',
      'No personalisation for your specific guests',
      'Geographically limited to certain cities',
    ],
    verdict: 'If you have a $2,000 event budget, The Dinner Detective is impressive. For everyone else, Back Pocket Mysteries delivers a fully personalised mystery from $19 (£15) that your group runs themselves with a live mobile lobby and printable kit.',
    rating: 4,
  },
  {
    slug: 'freeform-games',
    name: 'Freeform Games',
    tagline: 'Character-heavy roleplay mystery scripts',
    description: 'Freeform Games produces detailed, character-driven murder mystery scripts with rich backstories and secrets. Popular with theatrical groups who want deep roleplay, but the games are long, complex, and completely pre-written.',
    format: 'Downloadable PDF scripts',
    bestFor: 'Experienced roleplay groups who want complex narratives',
    price: '$29.99–$55.00',
    priceNote: 'Per game. Fixed player count, typically 8–18.',
    groupSize: '8–18 people',
    personalisation: 'None - all characters and plots are pre-written',
    instant: true,
    searchKeywords: ['freeform games review', 'freeform games alternative', 'freeform games murder mystery'],
    pros: ['Very deep character writing', 'Complex plots with many secrets', 'Instant download'],
    cons: [
      'Very long setup time, host must read everything in advance and cannot play along',
      'Fixed character count with no flexibility',
      'Pre-written stories lack personal connection to your guests',
      'Complex for casual parties, better suited to LARP enthusiasts',
      'Static PDFs with no live mobile lobby or custom guest casting',
    ],
    verdict: 'Freeform Games is great for dedicated LARP groups, but the host can never play along. Back Pocket Mysteries creates equally rich character drama around your real friends with Spoiler-Free Host Mode so the host can play too.',
    rating: 3,
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find(c => c.slug === slug);
}
