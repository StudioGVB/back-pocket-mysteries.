export const UNIBREAK_CABIN_TITLE = 'Unibreak at the Cabin';
export const UNIBREAK_CABIN_THEME = 'Rowdy Uni Break Ski & Mountain Cabin Getaway';
export const UNIBREAK_CABIN_DESCRIPTION =
  'Six uni friends rent an isolated two-story timber mountain cabin for a wild mid-semester break of tequila, secret hookups, and cutthroat campus rivalries. When a mountain storm traps everyone inside and The Prom Queen is found dead on the stone patio below the second-story balcony at 11:28 PM, everyone in the cabin has blood on their hands, a secret to hide, and a reason to lie.';
export const UNIBREAK_CABIN_INSIDE_JOKES =
  'Cast-iron fireplace poker from the upstairs balcony chiminea, varsity sports-betting ledger, smashed pink-gold iPhone in the snowbank, crimson velvet tracksuit fibers on the balcony railing.';

export function isUnibreakCabinMystery(title?: string | null, theme?: string | null): boolean {
  const combined = `${title || ''} ${theme || ''}`.toLowerCase();
  return combined.includes('unibreak') || combined.includes('uni break at the cabin');
}

export interface UnibreakCharacterSpec {
  key: 'prom_queen' | 'girlfriend' | 'co_captain' | 'teammate' | 'bestie' | 'brother';
  roleTitle: string;
  name: string;
  gender: 'female' | 'male' | 'adaptable';
  is_victim: boolean;
  plot_role: 'victim' | 'killer' | 'assistant' | 'innocent';
  archetype: 'victim' | 'villain' | 'sidekick' | 'witness';
  is_mandatory: boolean;
  min_player_count: number;
  profile_data: {
    age: string;
    color: string;
    bio: string;
    outfit_advice: string;
    act_summary: string;
    act_bullets: string[];
    traits: string[];
    avatar_url: string;
  };
  motive?: {
    motive_type: 'revenge' | 'greed' | 'love' | 'fear' | 'power' | 'justice';
    strength: 'low' | 'moderate' | 'high' | 'critical';
    notes: string;
  };
}

export const UNIBREAK_CABIN_CHARACTERS: UnibreakCharacterSpec[] = [
  {
    key: 'prom_queen',
    roleTitle: 'The Prom Queen',
    name: 'The Prom Queen|The Prom Queen|Victim',
    gender: 'female',
    is_victim: true,
    plot_role: 'victim',
    archetype: 'victim',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Hot Pink',
      bio: '{{The Prom Queen}} rules the campus social hierarchy with a toxic smile and a phone full of receipts. {{The Prom Queen_he}} is {{The Brother}}\'s {{The Prom Queen_sibling}}, {{The Bestie}}\'s supposed ride-or-die best friend, and {{The Girlfriend}}\'s sworn rival. Earlier tonight at 9:15 PM, {{The Prom Queen}} used {{The Co-Captain}}\'s obsessive crush on {{The Prom Queen_him}} to lure {{The Co-Captain_him}} into the upstairs master bedroom and steal the varsity sports-betting ledger from {{The Co-Captain_his}} jacket, all while secretly hooking up with {{The Girlfriend}}\'s partner {{The Teammate}}.',
      outfit_advice:
        'Glamorous aprés-ski main-character energy: Option 1 — White faux-fur crop jacket over a hot-pink satin slip top with a rhinestone tiara headband; Option 2 — Sequin mini dress with metallic snow boots and oversized designer sunglasses indoors; Option 3 — Tailored hot-pink velvet blazer with statement crystal jewelry.',
      act_summary:
        'You hold everyone\'s dirt on your phone and you love watching the room sweat. Flaunt your leverage, tease {{The Co-Captain}}, and bait {{The Girlfriend}} until the clock runs out.',
      act_bullets: [
        'Remind everyone that your phone cloud-syncs at midnight and nobody\'s secret is safe.',
        'Treat {{The Co-Captain}} like an eager puppy while exchanging secret glances with {{The Teammate}}.',
        'Dismiss {{The Brother}}\'s begging about the family trust fund in front of the group.',
        'Trade razor-sharp passive-aggressive toasts with your sworn enemy {{The Girlfriend}}.',
      ],
      traits: ['Manipulative', 'Glamorous', 'Ruthless', 'Untouchable'],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=The%20Prom%20Queen',
    },
  },
  {
    key: 'girlfriend',
    roleTitle: 'The Girlfriend',
    name: 'The Girlfriend|The Girlfriend|Killer',
    gender: 'female',
    is_victim: false,
    plot_role: 'killer',
    archetype: 'villain',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Crimson Red',
      bio: '{{The Girlfriend}} is dating varsity star {{The Teammate}}, fiercely protective of {{The Girlfriend_his}} {{The Co-Captain_sibling}} {{The Co-Captain}}, and sworn enemies with {{The Prom Queen}}. At 10:15 PM, {{The Prom Queen}} humiliated {{The Co-Captain}} in front of {{The Girlfriend}}, boasted about secretly sleeping with {{The Teammate}}, and threatened to leak the stolen varsity betting ledger at midnight. When {{The Girlfriend}} stepped onto the upstairs balcony at 11:25 PM and found {{The Co-Captain}} panicking over a bleeding, groaning {{The Prom Queen}}, {{The Girlfriend}} sent {{The Co-Captain}} downstairs for an alibi, delivered the fatal strike with the cast-iron chiminea poker at 11:28 PM, smashed the phone, and pushed {{The Prom Queen}} over the railing.',
      outfit_advice:
        'Sharp after-dark crimson luxury: Option 1 — Sleek crimson crushed-velvet tracksuit with gold hoop earrings and dark berry lipstick; Option 2 — Crimson off-the-shoulder knit dress with gold chain belt and black leather boots; Option 3 — Tailored burgundy velvet jacket over all-black evening attire.',
      act_summary:
        'You finished off {{The Prom Queen}} at 11:28 PM to protect your {{The Co-Captain_sibling}} {{The Co-Captain}} and destroy the rival who slept with your partner {{The Teammate}}. Stay ice-cold and pin the murder on {{The Teammate}} or {{The Brother}}.',
      act_bullets: [
        '[Round 1 • Alibi]: Insist you were upstairs taking a hot shower from 11:05 PM to 11:30 PM and heard nothing on the balcony.',
        '[Round 2 • Deflection]: When the affair between {{The Teammate}} and {{The Prom Queen}} surfaces, act heartbroken and accuse {{The Teammate}} of silencing {{The Prom Queen}}.',
        '[Round 3 • Defense]: Claim the crimson velvet fibers and berry lipstick on the balcony came from earlier in the evening before 10:30 PM.',
        'Coordinate subtly with your {{The Co-Captain_sibling}} {{The Co-Captain}} so your 11:25 PM timeline never cracks.',
      ],
      traits: ['Fierce', 'Calculated', 'Protective', 'Vengeful'],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=The%20Girlfriend',
    },
    motive: {
      motive_type: 'revenge',
      strength: 'critical',
      notes:
        'Enraged after discovering {{The Prom Queen}} was sleeping with {{The Girlfriend_his}} partner {{The Teammate}} AND blackmailing {{The Girlfriend_his}} {{The Co-Captain_sibling}} {{The Co-Captain}}; finished {{The Prom Queen}} off with the cast-iron poker at 11:28 PM and pushed {{The Prom Queen_him}} off the balcony.',
    },
  },
  {
    key: 'co_captain',
    roleTitle: 'The Co-Captain',
    name: 'The Co-Captain|The Co-Captain|Accomplice',
    gender: 'male',
    is_victim: false,
    plot_role: 'assistant',
    archetype: 'sidekick',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Electric Cyan',
      bio: '{{The Co-Captain}} is varsity co-captain alongside {{The Teammate}}, {{The Girlfriend}}\'s {{The Co-Captain_sibling}}, and {{The Bestie}}\'s ex. Blinded by {{The Co-Captain_his}} obsessive crush on {{The Prom Queen}}, {{The Co-Captain}} let {{The Prom Queen}} lure {{The Co-Captain_him}} into the upstairs bedroom at 9:15 PM—where {{The Prom Queen}} stole the illegal varsity sports-betting ledger from {{The Co-Captain_his}} letterman jacket. Cornered by a midnight upload threat, {{The Co-Captain}} fought {{The Prom Queen}} on the second-story balcony at 11:10 PM and struck the first non-fatal blow with the cast-iron poker at 11:18 PM before {{The Girlfriend}} took over at 11:25 PM.',
      outfit_advice:
        'Varsity athlete cabin style: Option 1 — Blue and cyan wool varsity letterman bomber jacket over a fitted black compression shirt with a silver whistle chain; Option 2 — Athletic quarter-zip pullover with tailored dark denim and high-top sneakers; Option 3 — Varsity cardigan with rolled sleeves and athletic wristwatch.',
      act_summary:
        'You struck the first blow at 11:18 PM in a blind panic, and your {{The Girlfriend_sibling}} {{The Girlfriend}} finished the job at 11:28 PM while you ran downstairs to stage a living-room drink alibi. Hide the scratch marks on your neck and back up {{The Girlfriend}}.',
      act_bullets: [
        '[Round 1 • Alibi]: Claim you left {{The Prom Queen}}\'s room at 9:30 PM and spent the rest of the night drinking downstairs by the living-room TV.',
        '[Round 2 • Deflection]: When the stolen betting ledger drops, point out that your co-captain {{The Teammate}} and {{The Brother}} stood to lose $42,000 if it leaked.',
        '[Round 3 • Defense]: Insist you were already downstairs pouring drinks at 11:25 PM before the fatal 11:28 PM balcony drop occurred.',
        'Keep your collar pulled up to hide the fresh scratch marks from the 11:12 PM balcony struggle.',
      ],
      traits: ['Athletic', 'Impulsive', 'Desperate', 'Loyal'],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=The%20Co-Captain',
    },
    motive: {
      motive_type: 'fear',
      strength: 'critical',
      notes:
        'Desperate to stop {{The Prom Queen}} from leaking the stolen varsity point-shaving ledger and bedroom voice memo at midnight; struck the first non-fatal blow with the cast-iron poker at 11:18 PM and summoned {{The Girlfriend}}.',
    },
  },
  {
    key: 'teammate',
    roleTitle: 'The Teammate',
    name: 'The Teammate|The Teammate|Suspect',
    gender: 'male',
    is_victim: false,
    plot_role: 'innocent',
    archetype: 'witness',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Cobalt Blue',
      bio: '{{The Teammate}} is {{The Co-Captain}}\'s varsity co-captain, {{The Brother}}\'s best mate, and {{The Girlfriend}}\'s partner—who has been having a reckless secret affair with {{The Prom Queen}} behind {{The Girlfriend}}\'s back. Worse still, {{The Teammate}} co-ran the $42,000 varsity point-shaving scheme AND skimmed $18,000 from work alongside {{The Bestie}}. When {{The Prom Queen}} threatened to expose all three secrets at midnight, {{The Teammate}} had every reason to want {{The Prom Queen_him}} silenced.',
      outfit_advice:
        'Effortless mountain cabin heartthrob: Option 1 — Cobalt blue flannel overshirt worn open over a fitted black tee with a gold watch and varsity ring; Option 2 — Heavy cable-knit ski sweater with dark chinos and leather boots; Option 3 — Tailored denim jacket with fleece collar and silver chain.',
      act_summary:
        'You are innocent of the murder, but you look guilty on three fronts: cheating on {{The Girlfriend}} with {{The Prom Queen}}, the varsity betting ledger, and skimming $18,000 at work with {{The Bestie}}.',
      act_bullets: [
        '[Round 1 • Alibi]: Deny any romantic involvement with {{The Prom Queen}} until the burner texts force your hand.',
        '[Round 2 • Alibi Lock]: Admit you argued with {{The Bestie}} in the basement laundry room between 11:10 PM and 11:25 PM over the missing $18,000 work audit.',
        '[Round 3 • Sleuthing]: Point out that you were in the basement at 11:18 PM and 11:28 PM while {{The Co-Captain}} and {{The Girlfriend}} were upstairs near the balcony.',
        'Watch {{The Girlfriend}}\'s reaction closely when the 11:28 PM Apple Watch and smart-home logs are revealed.',
      ],
      traits: ['Charming', 'Double-Dealing', 'Defensive', 'Charming'],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=The%20Teammate',
    },
    motive: {
      motive_type: 'fear',
      strength: 'high',
      notes:
        'Terrified that {{The Prom Queen}} was about to expose their secret affair to {{The Girlfriend}}, leak the $42,000 varsity point-shaving ledger, and reveal the $18,000 work embezzlement with {{The Bestie}}.',
    },
  },
  {
    key: 'bestie',
    roleTitle: 'The Bestie',
    name: 'The Bestie|The Bestie|Suspect',
    gender: 'female',
    is_victim: false,
    plot_role: 'innocent',
    archetype: 'witness',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Rose Gold',
      bio: '{{The Bestie}} has been {{The Prom Queen}}\'s right-hand best friend for years—and secretly resents every second of it. {{The Bestie}} is still bitter that {{The Prom Queen}} toyed with {{The Bestie_his}} ex {{The Co-Captain}} tonight, and panicked because {{The Prom Queen}} photographed payroll receipts proving {{The Bestie}} and {{The Teammate}} skimmed $18,000 from the campus hospitality venue where they work together.',
      outfit_advice:
        'Chic rose-gold cabin party look: Option 1 — Metallic rose-gold puffer vest over a black bodycon mini dress with shearling boots; Option 2 — Shimmering champagne knit two-piece set with layered gold necklaces; Option 3 — Faux-shearling aviator jacket over silk camisole and tailored trousers.',
      act_summary:
        'You hated how {{The Prom Queen}} treated your ex {{The Co-Captain}} and held the $18,000 work audit over your head, and you secretly hid {{The Prom Queen_his}} spare sedative pills at 10:45 PM—but you never went on the balcony.',
      act_bullets: [
        '[Round 1 • Deflection]: Highlight how {{The Co-Captain}} was humiliatingly obsessed with {{The Prom Queen}} and came out of the upstairs bedroom furious.',
        '[Round 2 • Alibi]: Confirm you and {{The Teammate}} were downstairs near the basement door arguing about the $18,000 work shortfall between 11:12 PM and 11:24 PM.',
        '[Round 3 • Deduction]: Compare the two distinct timestamps on the Apple Watch (11:18 PM knockout vs. 11:28 PM fatal blow) to expose the sibling conspiracy.',
        'Challenge {{The Girlfriend}}\'s shower alibi when the upstairs balcony Wi-Fi log drops.',
      ],
      traits: ['Sharp-Tongued', 'Observant', 'Jealous', 'Resourceful'],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=The%20Bestie',
    },
    motive: {
      motive_type: 'greed',
      strength: 'high',
      notes:
        'Furious that {{The Prom Queen}} seduced {{The Bestie_his}} ex {{The Co-Captain}} and threatened to turn over photos of the $18,000 payroll skim {{The Bestie}} and {{The Teammate}} pulled at work.',
    },
  },
  {
    key: 'brother',
    roleTitle: 'The Brother',
    name: 'The Brother|The Brother|Suspect',
    gender: 'male',
    is_victim: false,
    plot_role: 'innocent',
    archetype: 'witness',
    is_mandatory: true,
    min_player_count: 6,
    profile_data: {
      age: 'adult',
      color: 'Sapphire Blue',
      bio: '{{The Brother}} is {{The Prom Queen}}\'s twin {{The Brother_sibling}} and {{The Teammate}}\'s best friend. Over the past semester, {{The Brother}} secretly drained $25,000 from {{The Brother_his}} and {{The Prom Queen}}\'s shared family cabin trust fund to cover underground gambling losses recorded in {{The Co-Captain}}\'s varsity betting ledger. At 10:40 PM in the kitchen, {{The Prom Queen}} threatened to email their parents the bank statements at midnight and have {{The Brother}} cut off.',
      outfit_advice:
        'Rowdy fraternity ski-cabin streetwear: Option 1 — Sapphire blue vintage varsity fleece jacket with a backwards cap and heavy silver chain; Option 2 — Oversized graphic hoodie under a rugged canvas work jacket with cargo trousers; Option 3 — Retro colour-block ski jacket with dark jeans and timber boots.',
      act_summary:
        'You had a loud 10:40 PM kitchen fight with your {{The Prom Queen_sibling}} {{The Prom Queen}} over the $25,000 trust-fund withdrawal and your size-10 boot print is near the patio, but you were passed out in the garage hot-tub room by 11:15 PM.',
      act_bullets: [
        '[Round 1 • Defense]: Admit you argued with {{The Prom Queen}} about the $25,000 trust-fund transfer at 10:40 PM, but swear you would never hurt your own {{The Prom Queen_sibling}}.',
        '[Round 2 • Misdirection]: Point out that {{The Co-Captain}} wears the exact same size-10 snow boot found on the upstairs balcony.',
        '[Round 3 • Sleuthing]: Focus the table on the cast-iron poker fibers—you wear a sapphire fleece, whereas {{The Girlfriend}} wears crimson crushed velvet.',
        'Demand to know why {{The Co-Captain}} texted {{The Girlfriend}} to come up to the balcony at 11:19 PM.',
      ],
      traits: ['Reckless', 'Defensive', 'Loud', 'Street-Smart'],
      avatar_url: 'https://api.dicebear.com/8.x/avataaars/svg?seed=The%20Brother',
    },
    motive: {
      motive_type: 'greed',
      strength: 'high',
      notes:
        'Secretly drained $25,000 from the shared family trust fund to pay off bets in {{The Co-Captain}}\'s ledger; fought explosively with {{The Prom Queen}} at 10:40 PM when {{The Prom Queen_he}} threatened to tell their parents at midnight.',
    },
  },
];

export const UNIBREAK_CABIN_RELATIONSHIPS: Array<{
  charAKey: UnibreakCharacterSpec['key'];
  charBKey: UnibreakCharacterSpec['key'];
  dynamics: string[];
  notes: string;
}> = [
  {
    charAKey: 'prom_queen',
    charBKey: 'brother',
    dynamics: ['Siblings', 'Trust-Fund Feud'],
    notes: '{{The Prom Queen}} discovered {{The Brother}} drained $25,000 from their shared family trust fund and threatened to expose {{The Brother_him}} at midnight.',
  },
  {
    charAKey: 'prom_queen',
    charBKey: 'bestie',
    dynamics: ['Best Friends', 'Toxic Leverage'],
    notes: '{{The Bestie}} is {{The Prom Queen}}\'s closest friend, but {{The Prom Queen}} toyed with {{The Bestie}}\'s ex {{The Co-Captain}} and holds proof of {{The Bestie}}\'s $18,000 work skim.',
  },
  {
    charAKey: 'prom_queen',
    charBKey: 'teammate',
    dynamics: ['Secret Romance'],
    notes: '{{The Prom Queen}} and {{The Teammate}} have been hooking up in secret behind {{The Girlfriend}}\'s back.',
  },
  {
    charAKey: 'prom_queen',
    charBKey: 'girlfriend',
    dynamics: ['Sworn Enemies'],
    notes: '{{The Prom Queen}} and {{The Girlfriend}} despise each other, culminating in {{The Prom Queen}} taunting {{The Girlfriend}} at 10:15 PM about sleeping with {{The Teammate}}.',
  },
  {
    charAKey: 'prom_queen',
    charBKey: 'co_captain',
    dynamics: ['Obsessive Crush', 'Blackmail'],
    notes: '{{The Prom Queen}} exploited {{The Co-Captain}}\'s crush on {{The Prom Queen_him}} to lure {{The Co-Captain_him}} upstairs at 9:15 PM and steal the varsity betting ledger.',
  },
  {
    charAKey: 'girlfriend',
    charBKey: 'co_captain',
    dynamics: ['Siblings', 'Blood Pact'],
    notes: '{{The Girlfriend}} and {{The Co-Captain}} are protective siblings who covered for each other on the upstairs balcony between 11:18 PM and 11:28 PM.',
  },
  {
    charAKey: 'girlfriend',
    charBKey: 'teammate',
    dynamics: ['Dating', 'Betrayal'],
    notes: '{{The Girlfriend}} is dating {{The Teammate}} and was humiliated at 10:15 PM when {{The Prom Queen}} revealed {{The Teammate}}\'s cheating.',
  },
  {
    charAKey: 'girlfriend',
    charBKey: 'bestie',
    dynamics: ['Friends'],
    notes: '{{The Girlfriend}} and {{The Bestie}} bonded over their shared resentment of {{The Prom Queen}}\'s mind games.',
  },
  {
    charAKey: 'girlfriend',
    charBKey: 'brother',
    dynamics: ['Friends'],
    notes: '{{The Girlfriend}} witnessed {{The Brother}}\'s explosive 10:40 PM kitchen argument with {{The Prom Queen}}.',
  },
  {
    charAKey: 'co_captain',
    charBKey: 'teammate',
    dynamics: ['Team Co-Captains', 'Betting Ring'],
    notes: '{{The Co-Captain}} and {{The Teammate}} co-captain the varsity team and secretly ran the $42,000 point-shaving ledger stolen by {{The Prom Queen}}.',
  },
  {
    charAKey: 'co_captain',
    charBKey: 'bestie',
    dynamics: ['Exes'],
    notes: '{{The Co-Captain}} and {{The Bestie}} are messy exes; {{The Bestie}} was furious seeing {{The Co-Captain}} sneak into {{The Prom Queen}}\'s bedroom at 9:15 PM.',
  },
  {
    charAKey: 'co_captain',
    charBKey: 'brother',
    dynamics: ['Friends', 'Gambling Creditor'],
    notes: '{{The Brother}} owes $25,000 in {{The Co-Captain}}\'s varsity betting ledger, and both wear the exact same size-10 snow boots.',
  },
  {
    charAKey: 'teammate',
    charBKey: 'bestie',
    dynamics: ['Work Together', 'Embezzlement'],
    notes: '{{The Teammate}} and {{The Bestie}} work together at the campus venue and secretly skimmed $18,000 from the payroll register.',
  },
  {
    charAKey: 'teammate',
    charBKey: 'brother',
    dynamics: ['Best Friends'],
    notes: '{{The Teammate}} and {{The Brother}} are best friends, though {{The Teammate}} hid {{The Teammate_his}} secret hookups with {{The Brother}}\'s {{The Prom Queen_sibling}} {{The Prom Queen}}.',
  },
  {
    charAKey: 'bestie',
    charBKey: 'brother',
    dynamics: ['Friends'],
    notes: '{{The Bestie}} and {{The Brother}} both stood to lose thousands if {{The Prom Queen}}\'s midnight blackmail upload went through.',
  },
];

export const UNIBREAK_CABIN_BEATS = [
  {
    beat_number: 1,
    sort_order: 1,
    event_title: 'The Bedroom Setup & Stolen Ledger (9:15 PM)',
    description:
      '{{The Prom Queen}} uses {{The Co-Captain}}\'s crush on {{The Prom Queen_him}} to lure {{The Co-Captain_him}} into the upstairs cabin bedroom, recording an incriminating late-night confession and stealing the $42,000 varsity sports-betting ledger from {{The Co-Captain_his}} jacket.',
    beat_type: 'discovery' as const,
    timeline_phase: 'pre_crime' as const,
    involvedKeys: ['prom_queen', 'co_captain', 'teammate', 'brother'] as UnibreakCharacterSpec['key'][],
  },
  {
    beat_number: 2,
    sort_order: 2,
    event_title: 'The Humiliation & Midnight Ultimatum (10:15 PM)',
    description:
      'When {{The Co-Captain}} and {{The Co-Captain_his}} {{The Girlfriend_sibling}} {{The Girlfriend}} confront {{The Prom Queen}} to get the ledger back, {{The Prom Queen}} laughs in {{The Co-Captain}}\'s face, reveals {{The Prom Queen_he}} has been secretly sleeping with {{The Girlfriend}}\'s partner {{The Teammate}}, and threatens to drop the bedroom recording and betting ledger to the entire university at midnight.',
    beat_type: 'confrontation' as const,
    timeline_phase: 'pre_crime' as const,
    involvedKeys: ['prom_queen', 'co_captain', 'girlfriend', 'teammate'] as UnibreakCharacterSpec['key'][],
  },
  {
    beat_number: 3,
    sort_order: 3,
    event_title: 'The Upstairs Balcony Confrontation (11:10 PM)',
    description:
      'Desperate to stop the midnight upload, {{The Co-Captain}} corners {{The Prom Queen}} out on the isolated second-story cabin balcony to wrestle {{The Prom Queen_his}} phone away, sparking a fierce physical struggle when {{The Prom Queen}} scratches {{The Co-Captain_his}} neck and queues the files to send.',
    beat_type: 'confrontation' as const,
    timeline_phase: 'pre_crime' as const,
    involvedKeys: ['co_captain', 'prom_queen'] as UnibreakCharacterSpec['key'][],
  },
  {
    beat_number: 4,
    sort_order: 4,
    event_title: 'The First Strike With the Fireplace Poker (11:18 PM)',
    description:
      'In a blind panic, {{The Co-Captain}} grabs the heavy cast-iron fireplace poker beside the balcony chiminea and strikes {{The Prom Queen}} across the temple, knocking {{The Prom Queen_him}} unconscious onto the timber deck while {{The Prom Queen_his}} phone locks.',
    beat_type: 'twist' as const,
    timeline_phase: 'crime' as const,
    involvedKeys: ['co_captain', 'prom_queen', 'girlfriend'] as UnibreakCharacterSpec['key'][],
  },
  {
    beat_number: 5,
    sort_order: 5,
    event_title: 'The Fatal Blow & Balcony Drop (11:28 PM)',
    description:
      '{{The Girlfriend}} steps onto the balcony at 11:25 PM and finds a shaken {{The Co-Captain}} frozen as {{The Prom Queen}} begins groaning; {{The Girlfriend}} sends {{The Co-Captain}} inside for a living-room alibi, delivers the fatal strike with the cast-iron poker at 11:28 PM, smashes the phone, and pushes {{The Prom Queen}} over the second-story railing onto the stone patio below.',
    beat_type: 'conclusion' as const,
    timeline_phase: 'crime' as const,
    involvedKeys: ['girlfriend', 'co_captain', 'prom_queen'] as UnibreakCharacterSpec['key'][],
  },
];

export const UNIBREAK_CABIN_SUBPLOTS = [
  {
    title: 'The $18,000 Workplace Payroll Skim',
    theme: 'Financial Embezzlement & Cover-Up',
    description:
      '{{The Bestie}} and {{The Teammate}} secretly skimmed $18,000 from the campus hospitality venue where they work together; {{The Prom Queen}} found the altered deposit slips and threatened to expose them both at midnight.',
    primaryKey: 'bestie' as UnibreakCharacterSpec['key'],
    secondaryKey: 'teammate' as UnibreakCharacterSpec['key'],
  },
  {
    title: 'The $25,000 Family Trust-Fund Drain',
    theme: 'Sibling Inheritance & Gambling Debt',
    description:
      '{{The Brother}} secretly forged bank transfers to drain $25,000 from his and {{The Prom Queen}}\'s family trust fund to pay off underground gambling debts recorded in {{The Co-Captain}}\'s ledger.',
    primaryKey: 'brother' as UnibreakCharacterSpec['key'],
    secondaryKey: 'prom_queen' as UnibreakCharacterSpec['key'],
  },
  {
    title: 'The Secret Cabin Affair & Betrayal',
    theme: 'Romantic Betrayal & Jealousy',
    description:
      '{{The Teammate}} was secretly sleeping with {{The Prom Queen}} behind {{The Girlfriend}}\'s back while {{The Bestie}} seethed over {{The Prom Queen}} seducing her ex {{The Co-Captain}}.',
    primaryKey: 'teammate' as UnibreakCharacterSpec['key'],
    secondaryKey: 'girlfriend' as UnibreakCharacterSpec['key'],
  },
];

export const UNIBREAK_CABIN_CLUES = [
  // ROUND 1 (5 Clues: 3 Core Beat 1–2 + 2 Red Herrings)
  {
    beatNumber: 1,
    round_number: 1,
    format: 'audio',
    title: 'Upstairs Bedroom Voice Memo Recording (9:18 PM)',
    clue_type: 'testimony' as const,
    implication_type: 'circumstantial' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      'Recording Duration: 21.5 Seconds\n{{The Prom Queen}}: "[laughs] {{The Co-Captain}} is such a gullible fucking puppy. Pour me another tequila shot while I try on your varsity jacket, babe."\n{{The Co-Captain}}: "[whispers] Wait, don\'t dig in the inside pocket, {{The Prom Queen}}, put that black notebook back!"\n{{The Prom Queen}}: "[sarcastic] Relax, your secret betting ledger is safe with me... for now."',
    internal_notes:
      '[FORMAT:audio] Proves Beat #1: {{The Prom Queen}} lured {{The Co-Captain}} upstairs at 9:15 PM and stole the varsity betting ledger from {{The Co-Captain_his}} jacket. Casts early suspicion on {{The Co-Captain}} and jealous ex {{The Bestie}}.',
    generation_prompt: '',
  },
  {
    beatNumber: 1,
    round_number: 1,
    format: 'handwritten_note',
    title: 'Torn Page From the Varsity Betting Ledger ($42,000)',
    clue_type: 'background' as const,
    implication_type: 'circumstantial' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      'A crumpled notebook page found tucked inside {{The Prom Queen}}\'s clutch: lists illegal point-shaving payouts totaling $42,000 signed with the initials of co-captains {{The Co-Captain}} and {{The Teammate}}, plus an unpaid $25,000 tab owed by {{The Brother}}.',
    internal_notes:
      '[FORMAT:handwritten_note] Proves Beat #1: Confirms the varsity betting ledger {{The Prom Queen}} stole at 9:20 PM while implicating {{The Teammate}} and {{The Brother}} in massive debts.',
    generation_prompt: '',
  },
  {
    beatNumber: 2,
    round_number: 1,
    format: 'chat',
    title: '10:18 PM Group-Chat Ultimatum From {{The Prom Queen}}',
    clue_type: 'testimony' as const,
    implication_type: 'circumstantial' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      '[10:18 PM] {{The Prom Queen}}: Since {{The Co-Captain}} and {{The Girlfriend}} want to act tough in the hallway, ask {{The Teammate}} whose bed {{The Teammate_he}} was in last weekend 💋\n[10:19 PM] {{The Prom Queen}}: Midnight drop to the whole campus: the varsity point-shaving ledger, the $18k venue skim, AND the trust-fund receipts. Sweet dreams bitches.\n[Status: SEEN BY ALL 6 GUESTS]',
    internal_notes:
      '[FORMAT:chat] Proves Beat #2: Confirms {{The Prom Queen}}\'s 10:15 PM humiliation of {{The Co-Captain}} and {{The Girlfriend}}, exposes {{The Teammate}}\'s affair, and gives all 5 suspects a midnight deadline.',
    generation_prompt: '',
  },
  {
    beatNumber: null,
    round_number: 1,
    format: 'document',
    title: 'Overdrawn $25,000 Family Trust-Fund Transfer Notice (10:40 PM)',
    clue_type: 'secret' as const,
    implication_type: 'red_herring' as const,
    evidence_status: 'fake' as const,
    is_essential: false,
    description:
      'SUBJECT: URGENT TRUST ACCOUNT ALERT\nDATE: 10:40 PM\nSTATUS: FLAGGED WITHDRAWAL\nBank statement printed from {{The Prom Queen}}\'s laptop showing three wire transfers totaling $25,000 authorized by {{The Brother}} to an offshore sportsbook account, with a handwritten sticky note from {{The Prom Queen}}: "Mom & Dad get this at 12:00 AM."',
    internal_notes:
      '[FORMAT:document] Red Herring #1: Explains {{The Brother}}\'s explosive 10:40 PM kitchen fight with {{The Prom Queen}}, deflecting Round 1 suspicion onto {{The Brother}}.',
    generation_prompt: '',
  },
  {
    beatNumber: null,
    round_number: 1,
    format: 'receipt',
    title: 'Altered Campus Venue Payroll Audit Slip ($18,000 Shortfall)',
    clue_type: 'secret' as const,
    implication_type: 'red_herring' as const,
    evidence_status: 'fake' as const,
    is_essential: false,
    description:
      'VENUE: CAMPUS UNION BAR & LOUNGE\nAUDIT DISCREPANCY: -$18,000.00\nSHIFT MANAGERS ON RECORD: {{The Bestie}} & {{The Teammate}}\nNOTES: Photographed on {{The Prom Queen}}\'s table at 10:35 PM with red ink circling the voided cash drops.',
    internal_notes:
      '[FORMAT:receipt] Red Herring #2: Exposes the $18,000 workplace embezzlement between {{The Bestie}} and {{The Teammate}}, giving both a strong financial motive in Round 1.',
    generation_prompt: '',
  },

  // ROUND 2 (6 Clues: 4 Core Beat 2–4 + 2 Red Herrings)
  {
    beatNumber: 2,
    round_number: 2,
    format: 'chat',
    title: '10:24 PM Deleted Sibling Pact Texts Between {{The Girlfriend}} & {{The Co-Captain}}',
    clue_type: 'testimony' as const,
    implication_type: 'circumstantial' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      '[10:24 PM] {{The Girlfriend}}: That manipulative bitch {{The Prom Queen}} is sleeping with {{The Teammate}} AND holding your varsity ledger over our heads.\n[10:25 PM] {{The Co-Captain}}: If {{The Prom Queen_he}} uploads that folder at midnight my whole life is over.\n[10:26 PM] {{The Girlfriend}}: Corner {{The Prom Queen_him}} when {{The Prom Queen_he}} goes upstairs and get that fucking phone off {{The Prom Queen_him}}. I\'ve got your back.',
    internal_notes:
      '[FORMAT:chat] Proves Beat #2: Establishes the sibling pact between {{The Girlfriend}} and {{The Co-Captain}} to get {{The Prom Queen}}\'s phone before midnight.',
    generation_prompt: '',
  },
  {
    beatNumber: 3,
    round_number: 2,
    format: 'cctv',
    title: 'Second-Story Balcony Struggle Captured on Driveway CCTV (11:11 PM)',
    clue_type: 'physical' as const,
    implication_type: 'circumstantial' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      'Header: SECURITY CAM STILL • NORTH BALCONY\nTimestamp: 11:11:24 PM\nVisual: Grainy infrared frame looking up at the second-story balcony shows a figure in a varsity letterman sleeve pinning {{The Prom Queen}} against the railing while wrestling for a glowing smartphone as patio chairs overturn.',
    internal_notes:
      '[FORMAT:cctv] Proves Beat #3: Visual CCTV proof of the 11:10–11:14 PM balcony struggle over the phone. Because {{The Co-Captain}}, {{The Teammate}}, and {{The Brother}} all wear varsity jackets, suspects debate which varsity player is in the frame.',
    generation_prompt:
      'High-angle infrared night-vision CCTV surveillance camera still looking up at a snow-covered second-story timber cabin balcony during a storm. Two silhouetted figures are locked in a tense struggle beside an overturned wrought-iron patio chair and a glowing outdoor chiminea, with a bright smartphone light between their hands. High-contrast monochrome green-tinted surveillance aesthetic with subtle scanlines, zero text overlays.',
  },
  {
    beatNumber: 3,
    round_number: 2,
    format: 'audio',
    title: 'Muffled Balcony Shouting Captured on Patio Audio Mic (11:13 PM)',
    clue_type: 'testimony' as const,
    implication_type: 'circumstantial' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      'Recording Duration: 18.5 Seconds\n{{The Co-Captain}}: "[angry] Give me the fucking phone right now, {{The Prom Queen}}!"\n{{The Prom Queen}}: "[angry] Get your hands off me or I hit send to the whole fucking campus!"\n{{The Co-Captain}}: "[whispers] Stop scratching my neck, unlock it!"',
    internal_notes:
      '[FORMAT:audio] Proves Beat #3: Audio proof that {{The Prom Queen}} scratched {{The Co-Captain}}\'s neck while fighting over the phone on the balcony at 11:13 PM.',
    generation_prompt: '',
  },
  {
    beatNumber: 4,
    round_number: 2,
    format: 'document',
    title: 'Apple Watch Heart-Rate & Fall-Detection Telemetry (11:18 PM vs. 11:28 PM)',
    clue_type: 'background' as const,
    implication_type: 'circumstantial' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      'SUBJECT: APPLE WATCH BIOMETRIC TELEMETRY\nDATE: 11:18:12 PM – 11:28:44 PM\nSTATUS: FORENSIC EXHIBIT\nHealth telemetry recovered from {{The Prom Queen}}\'s Apple Watch records an impact hard-fall alert onto the second-story balcony deck at 11:18:12 PM, followed by 10 full minutes of a weak resting pulse (58 BPM) before a second sudden impact and cardiac arrest at 11:28:44 PM.',
    internal_notes:
      '[FORMAT:document] Proves Beat #4: Crucial forensic proof that the 11:18 PM strike only knocked {{The Prom Queen}} unconscious on the deck—{{The Prom Queen_he}} was still alive for 10 minutes until the fatal 11:28 PM strike!',
    generation_prompt: '',
  },
  {
    beatNumber: null,
    round_number: 2,
    format: 'chat',
    title: '11:08 PM Basement Confrontation Texts Between {{The Bestie}} & {{The Teammate}}',
    clue_type: 'secret' as const,
    implication_type: 'red_herring' as const,
    evidence_status: 'fake' as const,
    is_essential: false,
    description:
      '[11:08 PM] {{The Bestie}}: Get down to the basement laundry room right now. {{The Prom Queen}} has photos of the $18k venue register on {{The Prom Queen_his}} phone.\n[11:09 PM] {{The Teammate}}: Stay calm, I\'m coming downstairs now. We have to make sure {{The Prom Queen_he}} never leaves this cabin with that phone.\n[Status: READ 11:10 PM]',
    internal_notes:
      '[FORMAT:chat] Red Herring #3: Sounds threatening toward {{The Prom Queen}}, but simultaneously places {{The Bestie}} and {{The Teammate}} downstairs in the basement between 11:10 PM and 11:24 PM.',
    generation_prompt: '',
  },
  {
    beatNumber: null,
    round_number: 2,
    format: 'physical_prop',
    title: 'Shattered Tequila Decanter & Bloodied Bar Towel in the Kitchen (10:45 PM)',
    clue_type: 'physical' as const,
    implication_type: 'red_herring' as const,
    evidence_status: 'fake' as const,
    is_essential: false,
    description:
      'Found in the downstairs kitchen trash: a shattered crystal tequila decanter wrapped in a bar towel stained with a few drops of blood and a torn sapphire-blue fleece thread from {{The Brother}}\'s cuff.',
    internal_notes:
      '[FORMAT:physical_prop] Red Herring #4: From {{The Brother}} cutting {{The Brother_his}} knuckle slamming a glass during the 10:40 PM kitchen argument—before retreating to the garage hot-tub room by 11:15 PM.',
    generation_prompt:
      'Close-up 50mm f/1.8 forensic crime-scene photograph of broken crystal decanter glass wrapped in a white linen bar towel on a dark granite cabin kitchen counter, with a small crimson bloodstain and a torn sapphire-blue fleece thread beside a spilled lime wedge. Moody amber tungsten kitchen shadows, 35mm film grain, zero text.',
  },

  // ROUND 3 (5 Clues: 3 Core Beat 4–5 Smoking Guns + 2 Final Alibi/Decoy Clues)
  {
    beatNumber: 4,
    round_number: 3,
    format: 'chat',
    title: 'Panicked 11:19 PM Text From {{The Co-Captain}} to {{The Girlfriend}}',
    clue_type: 'testimony' as const,
    implication_type: 'direct' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      '[11:19 PM] {{The Co-Captain}}: Get up to the balcony right fucking now. I swung the poker to get the phone and {{The Prom Queen}} went down hard.\n[11:19 PM] {{The Co-Captain}}: There\'s blood on the deck, I don\'t know what the fuck to do.\n[11:20 PM] {{The Girlfriend}}: Stay right there. Don\'t touch anything until I get up there.',
    internal_notes:
      '[FORMAT:chat] Proves Beat #4: Direct confession that {{The Co-Captain}} struck the first blow with the poker at 11:18 PM and summoned {{The Girlfriend}} to the balcony.',
    generation_prompt: '',
  },
  {
    beatNumber: 5,
    round_number: 3,
    format: 'physical_prop',
    title: 'Cast-Iron Chiminea Poker With Crimson Velvet Fibers & Two Sets of Prints',
    clue_type: 'physical' as const,
    implication_type: 'direct' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      'The heavy cast-iron fireplace poker from the upstairs balcony chiminea: forensic dusting reveals {{The Co-Captain}}\'s palm prints mid-shaft, overlaid at the top handle by vivid crimson crushed-velvet microfibers from {{The Girlfriend}}\'s tracksuit sleeve and {{The Prom Queen}}\'s blood.',
    internal_notes:
      '[FORMAT:physical_prop] Proves Beat #4 & Beat #5: Physical murder weapon linking {{The Co-Captain}}\'s first strike at 11:18 PM and {{The Girlfriend}} gripping the top handle for the fatal 11:28 PM strike.',
    generation_prompt:
      'Close-up 50mm f/1.8 forensic crime-scene photograph of a heavy black cast-iron fireplace poker lying diagonally across snow-dusted timber balcony floorboards beside a glowing outdoor iron chiminea. Clinging to the ornate top handle are vivid crimson crushed-velvet fibers and dark wood ash illuminated by an angled forensic UV and flashlight beam. Moody night noir atmosphere, 35mm film grain, zero text.',
  },
  {
    beatNumber: 5,
    round_number: 3,
    format: 'search_log',
    title: '11:25–11:29 PM Smart-Home Balcony Door & Wi-Fi Repeater Audit Log',
    clue_type: 'background' as const,
    implication_type: 'direct' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      'Cabin smart-home audit log: at 11:25:10 PM the balcony sliding door opened as {{The Co-Captain}} went downstairs to be seen pouring drinks in the living room, while {{The Girlfriend}}\'s phone remained connected to the upstairs balcony Wi-Fi node through 11:28:50 PM—the exact second the patio motion floodlight triggered from {{The Prom Queen}} falling.',
    internal_notes:
      '[FORMAT:search_log] Proves Beat #5: Shatters {{The Girlfriend}}\'s shower alibi and proves {{The Girlfriend}} sent {{The Co-Captain}} downstairs at 11:25 PM while staying on the balcony alone to deliver the fatal 11:28 PM blow and push {{The Prom Queen}}.',
    generation_prompt: '',
  },
  {
    beatNumber: 5,
    round_number: 3,
    format: 'audio',
    title: '11:31 PM Upstairs Hallway Whispered Alibi Pact',
    clue_type: 'testimony' as const,
    implication_type: 'direct' as const,
    evidence_status: 'real' as const,
    is_essential: true,
    description:
      'Recording Duration: 19.0 Seconds\n{{The Girlfriend}}: "[whispers] Keep your voice down. {{The Prom Queen_he}} started waking up on the deck so I finished it with the poker at 11:28 and sent {{The Prom Queen_him}} over the rail."\n{{The Co-Captain}}: "[whispers] Holy fuck... did anyone see you?!"\n{{The Girlfriend}}: "[angry] No. Stick to the fucking story: you were downstairs by 11:25 and I was in the shower."',
    internal_notes:
      '[FORMAT:audio] Proves Beat #5: Irrefutable Round 3 smoking gun unmasking {{The Girlfriend}} as the Killer and {{The Co-Captain}} as the Accomplice.',
    generation_prompt: '',
  },
  {
    beatNumber: null,
    round_number: 3,
    format: 'search_log',
    title: 'Basement Smart-Thermostat & Garage Hot-Tub Motion Sensor Log (11:10–11:30 PM)',
    clue_type: 'secret' as const,
    implication_type: 'red_herring' as const,
    evidence_status: 'fake' as const,
    is_essential: false,
    description:
      'Cabin downstairs sensor log: confirms continuous motion and voice activity in the basement laundry room ({{The Teammate}} & {{The Bestie}}) from 11:10 PM to 11:26 PM, and continuous occupancy in the detached garage hot-tub room ({{The Brother}}) from 11:14 PM to 11:32 PM.',
    internal_notes:
      '[FORMAT:search_log] Round 3 Alibi Clearance: Clears {{The Teammate}}, {{The Bestie}}, and {{The Brother}} during the 11:18 PM and 11:28 PM upstairs balcony strikes, leaving only {{The Girlfriend}} and {{The Co-Captain}}.',
    generation_prompt: '',
  },
];
