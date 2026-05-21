import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';

// Define the theme detailed mapping
interface ThemeDetails {
  title: string;
  desc: string;
  difficulty: string;
  category: string;
  tone: string;
  bestFor: string;
  players: string;
  story: string;
  accent: string;
  glow: string;
  gradient: string;
  roster: { name: string; role: string; desc: string }[];
  clues: string[];
  occasionsList: string[];
}

const themeDataMap: Record<string, Omit<ThemeDetails, 'title' | 'desc' | 'difficulty' | 'category' | 'tone' | 'bestFor'>> = {
  'love-on-the-rocks': {
    players: '6-12',
    story: 'At the luxury Whispering Pines wellness chalet during a hen weekend, maid of honour Chloe is found lifeless at the bottom of the bubbling hot tub. What was supposed to be a celebratory weekend of bonding turns into a chaotic nightmare of accusations, spicy secrets, and toxic pasts. The wedding is in less than 24 hours—and the killer is among the guests.',
    accent: 'border-brand-pink text-brand-pink bg-brand-pink/10',
    glow: 'shadow-brand-pink/20 border-brand-pink/30 hover:border-brand-pink',
    gradient: 'from-pink-950/70 via-slate-950 to-brand-dark',
    roster: [
      { name: 'Tiffany (The Bride)', role: 'Emotional & Panicked', desc: 'The bride-to-be whose perfect wedding is falling apart. She was recently arguing with Chloe about an undisclosed pre-nuptial contract.' },
      { name: 'Chloe (The Maid of Honour)', role: 'The Victim', desc: 'Found poisoned in the chalet hot tub. She knew everyone\'s deepest secrets—and was not afraid to use them.' },
      { name: 'Max (The Best Man)', role: 'Quiet & Brooding', desc: 'A childhood friend of the groom who has been secretly in love with Tiffany for years. Chloe knew his secret.' },
      { name: 'Julian (The Ex)', role: 'Unpredictable & Charming', desc: 'Tiffany\'s charismatic ex-boyfriend who crashed the chalet uninvited just hours before Chloe\'s death.' },
      { name: 'Sarah (The Jealous Sister)', role: 'Sharp & Ambitious', desc: 'Tiffany\'s younger sister who has lived in her shadow. She was heard fighting bitterly with Chloe over bridesmaids duties.' },
      { name: 'Gavin (The Wedding Planner)', role: 'Observant & High-strung', desc: 'The frantic event planner who holds the keys to every room and has overheard far too many hushed conversations.' }
    ],
    clues: [
      'A crumpled pre-nuptial agreement with Chloe\'s handwriting in the margins.',
      'An empty bottle of high-end sedative found behind the bar.',
      'A series of heated, anonymous text messages on the victim\'s phone.',
      'Chalet security camera logs showing someone escaping through the rear deck.'
    ],
    occasionsList: ['Hen Parties / Bachelorettes', 'Adult Birthday Parties', 'Couples Dinner Nights', 'High-Drama Socials']
  },
  'the-inheritance': {
    players: '6-10',
    story: 'Within the grand wood-paneled walls of Sterling Manor, wealthy patriarch Alistair Sterling has suddenly passed away. The family gathers in the study for the reading of his multi-million dollar will, only to discover Alistair didn\'t die of natural causes, the massive family safe has been cleared out, and the will itself has vanished. The storm has locked everyone inside—and someone is playing for keeps.',
    accent: 'border-amber-500 text-amber-500 bg-amber-500/10',
    glow: 'shadow-amber-500/20 border-amber-500/30 hover:border-amber-500',
    gradient: 'from-amber-950/50 via-slate-950 to-brand-dark',
    roster: [
      { name: 'Winston (The Butler)', role: 'Impeccable & Reserved', desc: 'The long-serving house steward who oversaw Alistair\'s final hours. He knows every hidden doorway and family affair.' },
      { name: 'Arthur (The Estranged Son)', role: 'Rebellious & Cash-strapped', desc: 'Alistair\'s disowned son who returned from abroad under a mountain of debt. He claims he was asleep in his room.' },
      { name: 'Victoria (The Socialite Daughter)', role: 'Demanding & High-maintenance', desc: 'The fashion-forward daughter who stood to inherit the estate. She is desperate to keep the old family secrets buried.' },
      { name: 'Evelyn (The Young Widow)', role: 'Grieving & Mysterious', desc: 'Alistair\'s young and beautiful wife of only three months. Her past is entirely undocumented.' },
      { name: 'Marcus (The Family Attorney)', role: 'Calculating & Professional', desc: 'The lawyer who drafted the missing will. He seems unusually eager to declare Alistair\'s death an accident.' },
      { name: 'Clara (The Uninvited Guest)', role: 'Observant & Unfazed', desc: 'A young woman who arrived at the manor claiming to be Alistair\'s secret heir, carrying a blood-stained letter.' }
    ],
    clues: [
      'A charred fragment of the original will recovered from the study fireplace.',
      'A lockbox safe combination key found hidden inside a hollowed-out book.',
      'An empty, unlabeled prescription bottle of heart medication.',
      'A blueprint of Sterling Manor outlining a series of forgotten servants passages.'
    ],
    occasionsList: ['Classic Dinner Parties', 'Family Reunions', 'Holiday Gatherings', 'Introductory Mystery Nights']
  },
  'the-gala-heist': {
    players: '8-14',
    story: 'At the Metropolitan Museum\'s annual high-society charity gala, the lights suddenly flicker and die. When emergency power restores sixty seconds later, the museum\'s crown jewel—the priceless Star of Egypt diamond—is gone, and the head curator, Dr. Sterling, is found strangled in the high-security vault. With the exits locked by security protocols, the high-society suspects must find both a murderer and a masterpiece.',
    accent: 'border-emerald-500 text-emerald-500 bg-emerald-500/10',
    glow: 'shadow-emerald-500/20 border-emerald-500/30 hover:border-emerald-500',
    gradient: 'from-emerald-950/50 via-slate-950 to-brand-dark',
    roster: [
      { name: 'Vince (The Security Chief)', role: 'Stressed & Defensive', desc: 'The retired detective running the gala security. He claims the vault\'s advanced laser systems were bypassed from the inside.' },
      { name: 'Penelope (The Rival Collector)', role: 'Arrogant & Passionate', desc: 'A billionaire heiress who bid against Dr. Sterling for the Star of Egypt. She was spotted near the vault entrance.' },
      { name: 'The Shadow (The Elite Thief)', role: 'Charming & Elusive', desc: 'An unidentified master thief rumored to be disguised as one of the gala\'s wealthy corporate benefactors.' },
      { name: 'Raymond (The Diamond Cutter)', role: 'Meticulous & Cold', desc: 'The expert who appraised the diamond. He has deep knowledge of the museum\'s architectural vulnerabilities.' },
      { name: 'Dr. Sterling (The Curator)', role: 'The Victim', desc: 'Strangled with a velvet cord inside the vault. He was recently heard arguing with someone about a forgery.' },
      { name: 'Diana (The Gala Hostess)', role: 'Flamboyant & Demanding', desc: 'The prominent socialite hosting the gala, who insists on keeping the media out of the building at all costs.' }
    ],
    clues: [
      'A high-tech decryption device still attached to the vault laser controls.',
      'A strand of rare silk fibers caught in the door of the vault.',
      'A broken gold pocket watch showing the exact minute the lights went out.',
      'A ledger showing private cash transfers between Dr. Sterling and an offshore account.'
    ],
    occasionsList: ['Corporate Team Building', 'Black-Tie Dinner Parties', 'Large Friend Groups', 'Murder Mystery Enthusiasts']
  },
  'dead-space': {
    players: '10-16',
    story: 'On the isolated orbital research outpost Apex-9, a violent solar storm cuts all contact with Earth. Hours later, the lead astrobiologist, Dr. Webb, is found dead inside the main airlock, suffocated as the pressure seal was manually triggered. As the solar storm damages life support, the paranoid crew must find the saboteur among them before the station runs completely out of oxygen.',
    accent: 'border-indigo-500 text-indigo-500 bg-indigo-500/10',
    glow: 'shadow-indigo-500/20 border-indigo-500/30 hover:border-indigo-500',
    gradient: 'from-indigo-950/50 via-slate-950 to-brand-dark',
    roster: [
      { name: 'Dr. Vance (The Station Commander)', role: 'Authoritative & Paranoid', desc: 'The stern military commander of Apex-9. He was recently caught deleting log files from the central server.' },
      { name: 'Nova (The AI Specialist)', role: 'Detached & Analytical', desc: 'The engineer responsible for station automation. She asserts the mainframe could only be overridden by someone with master access.' },
      { name: 'Jax (The Chief Engineer)', role: 'Hot-headed & Practical', desc: 'The technician who maintains the life support machinery. He had a bitter public argument with Dr. Webb over fuel distribution.' },
      { name: 'Dr. Helen (The Astrobiologist)', role: 'Quiet & Intense', desc: 'Dr. Webb\'s research partner, who claims they had recently made a highly classified, organic discovery.' },
      { name: 'Leo (The Shuttle Pilot)', role: 'Nervous & Eager', desc: 'The pilot who has been preparing the escape pod for launch, despite direct orders from the commander.' },
      { name: 'Dr. Webb (The Astrobiologist)', role: 'The Victim', desc: 'Suffocated in the main airlock. His research files on a mysterious extraterrestrial fossil have been wiped.' }
    ],
    clues: [
      'An automated station log showing the airlock was overridden by Dr. Vance\'s clearance code.',
      'A corrupted backup drive containing fragmentary DNA sequencing files.',
      'A blood-stained utility visor found hidden in the hydroponics bay.',
      'A encrypted emergency transmission packet directed to a rival corporation.'
    ],
    occasionsList: ['Tech & Engineering Gatherings', 'Sci-Fi Fan Parties', 'Large Gamers Gatherings', 'Cooperative Mystery Nights']
  },
  'speakeasy-scandal': {
    players: '8-14',
    story: 'Welcome to Chicago, 1926. Behind the heavy steel door of "The Velvet Lounge" speakeasy, jazz is playing, bootleg gin is flowing, and a wealthy gangster is found shot through the chest in the back poker room. The local police chief is on his way, but in a room filled with mob bosses, jazz singers, bootleggers, and federal agents, the truth is the most dangerous contraband in the house.',
    accent: 'border-orange-500 text-orange-500 bg-orange-500/10',
    glow: 'shadow-orange-500/20 border-orange-500/30 hover:border-orange-500',
    gradient: 'from-orange-950/50 via-slate-950 to-brand-dark',
    roster: [
      { name: 'Tommy (The Club Owner)', role: 'Slick & Desperate', desc: 'The debt-ridden lounge proprietor. He is struggling to pay protection money and was heard arguing with the victim.' },
      { name: 'Lola (The Jazz Singer)', role: 'Glamorous & Emotional', desc: 'The beautiful headlining star of The Velvet Lounge. She was secretly romantically involved with the victim.' },
      { name: 'Don Vito (The Mob Boss)', role: 'Ruthless & Powerful', desc: 'The local organized crime patriarch. He insists the murderer must be dealt with by the family, not the police.' },
      { name: 'Agent Cooper (The Undercover Cop)', role: 'Charming & Guarded', desc: 'A federal agent posing as the lounge pianist, working to expose Tommy\'s bootleg gin operation.' },
      { name: 'Leo (The Bootlegger)', role: 'The Victim', desc: 'A wealthy gin runner shot through the heart. He carried a briefcase containing $20,000 in cash.' },
      { name: 'Mickey (The Barman)', role: 'Gruff & Loyal', desc: 'The bartender who hears and sees everything. He knows exactly who went into the back poker room and when.' }
    ],
    clues: [
      'A gold-plated pocket pistol with one spent shell casing found in the dressing room.',
      'A ledger showing private loan details between Tommy and Don Vito.',
      'A lipstick-stained cigarette stub recovered from the scene of the murder.',
      'A crumpled blackmail note demanding a 50% cut of the gin revenue.'
    ],
    occasionsList: ['1920s Costume Parties', 'Birthday Celebrations', 'Theme Dinners', 'Atmospheric Roleplaying Groups']
  },
  'off-the-grid': {
    players: '6-12',
    story: 'At the hyper-exclusive Serenity Oasis wellness retreat in the Oregon wilderness, guests have surrendered their phones and luxury comforts for a weekend of healing. But peace is permanently shattered when the charismatic lead guru, Master Bodhi, is found suffocated inside the steam room, which was locked from the outside. With a raging forest fire closing off the mountain roads, the guests are trapped with a killer.',
    accent: 'border-teal-500 text-teal-500 bg-teal-500/10',
    glow: 'shadow-teal-500/20 border-teal-500/30 hover:border-teal-500',
    gradient: 'from-teal-950/50 via-slate-950 to-brand-dark',
    roster: [
      { name: 'Master Bodhi (The Guru)', role: 'The Victim', desc: 'The famous spiritual leader whose multi-million dollar retreat empire hid a dark history of financial fraud.' },
      { name: 'Sage (The Devoted Assistant)', role: 'Quiet & Exhausted', desc: 'Bodhi\'s second-in-command who managed the retreat\'s daily operations and stood to inherit the business.' },
      { name: 'Robert (The Burned-out Exec)', role: 'Aggressive & Stressed', desc: 'A high-powered Wall Street executive who paid $50,000 to cure his anger issues, only to discover Bodhi was a con man.' },
      { name: 'Zoe (The Travel Influencer)', role: 'Observant & Extroverted', desc: 'A social media star who secretly kept her smartphone to record a documentary on Bodhi\'s cult-like practices.' },
      { name: 'Dr. Green (The Retreat Herbalist)', role: 'Eccentric & Mystical', desc: 'The practitioner who prepared the calming evening tea—which was found to contain highly toxic herbs.' },
      { name: 'Dave (The Mountain Ranger)', role: 'Practical & Alert', desc: 'The local guide who warns the retreat is trapped by a forest fire, and discovered the sauna key in the ashes.' }
    ],
    clues: [
      'A jammed sauna digital control panel that was modified to reach extreme temperatures.',
      'A specialized tea canister containing traces of toxic mountain hemlock.',
      'A hidden audio recorder with a transcript of a heated blackmail argument.',
      'A Master Keycard that unlocks every guest room and administrative cabin.'
    ],
    occasionsList: ['Cabin & Weekend Trips', 'Casual Game Gatherings', 'Outdoor / Nature Clubs', 'Modern Satire Socials']
  }
};

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await props.params;
  const dict = await getDictionary(locale as Locale);
  
  // Find matching localized title if possible
  let themeTitle = "Theme Details";
  if (slug === 'love-on-the-rocks') themeTitle = dict.themes.list.loveOnTheRocks.title;
  else if (slug === 'the-inheritance') themeTitle = dict.themes.list.inheritance.title;
  else if (slug === 'the-gala-heist') themeTitle = dict.themes.list.galaHeist.title;
  else if (slug === 'dead-space') themeTitle = dict.themes.list.deadSpace.title;
  else if (slug === 'speakeasy-scandal') themeTitle = dict.themes.list.speakeasy.title;
  else if (slug === 'off-the-grid') themeTitle = dict.themes.list.offTheGrid.title;

  return {
    title: `${themeTitle} | Back Pocket Mysteries`,
    description: `Host a custom murder mystery party with the "${themeTitle}" theme. Personalise characters with your actual guest list.`,
    alternates: {
      canonical: `https://mysteries.backpocketgames.com/${locale}/themes/${slug}`,
      languages: {
        en: `https://mysteries.backpocketgames.com/en/themes/${slug}`,
        fr: `https://mysteries.backpocketgames.com/fr/themes/${slug}`,
      }
    }
  };
}

export default async function ThemeDetailPage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await props.params;
  const dict = await getDictionary(locale as Locale);

  // Fallback map if details aren't found
  const staticData = themeDataMap[slug];
  if (!staticData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
        <div className="text-center p-8">
          <h1 className="text-4xl font-black mb-4 uppercase">Theme Not Found</h1>
          <p className="mb-8 font-bold text-gray-400">Sorry, the requested theme does not exist.</p>
          <Link href={`/${locale}/themes`} className="px-8 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-pink transition-colors">
            Back to Themes
          </Link>
        </div>
      </div>
    );
  }

  // Get dynamic localized data
  let title = '';
  let desc = '';
  let difficulty = '';
  let category = '';
  let tone = '';
  let bestFor = '';

  if (slug === 'love-on-the-rocks') {
    title = dict.themes.list.loveOnTheRocks.title;
    desc = dict.themes.list.loveOnTheRocks.desc;
    difficulty = dict.themes.list.loveOnTheRocks.difficulty;
    category = dict.themes.list.loveOnTheRocks.category;
    tone = dict.themes.list.loveOnTheRocks.tone;
    bestFor = dict.themes.list.loveOnTheRocks.bestFor;
  } else if (slug === 'the-inheritance') {
    title = dict.themes.list.inheritance.title;
    desc = dict.themes.list.inheritance.desc;
    difficulty = dict.themes.list.inheritance.difficulty;
    category = dict.themes.list.inheritance.category;
    tone = dict.themes.list.inheritance.tone;
    bestFor = dict.themes.list.inheritance.bestFor;
  } else if (slug === 'the-gala-heist') {
    title = dict.themes.list.galaHeist.title;
    desc = dict.themes.list.galaHeist.desc;
    difficulty = dict.themes.list.galaHeist.difficulty;
    category = dict.themes.list.galaHeist.category;
    tone = dict.themes.list.galaHeist.tone;
    bestFor = dict.themes.list.galaHeist.bestFor;
  } else if (slug === 'dead-space') {
    title = dict.themes.list.deadSpace.title;
    desc = dict.themes.list.deadSpace.desc;
    difficulty = dict.themes.list.deadSpace.difficulty;
    category = dict.themes.list.deadSpace.category;
    tone = dict.themes.list.deadSpace.tone;
    bestFor = dict.themes.list.deadSpace.bestFor;
  } else if (slug === 'speakeasy-scandal') {
    title = dict.themes.list.speakeasy.title;
    desc = dict.themes.list.speakeasy.desc;
    difficulty = dict.themes.list.speakeasy.difficulty;
    category = dict.themes.list.speakeasy.category;
    tone = dict.themes.list.speakeasy.tone;
    bestFor = dict.themes.list.speakeasy.bestFor;
  } else if (slug === 'off-the-grid') {
    title = dict.themes.list.offTheGrid.title;
    desc = dict.themes.list.offTheGrid.desc;
    difficulty = dict.themes.list.offTheGrid.difficulty;
    category = dict.themes.list.offTheGrid.category;
    tone = dict.themes.list.offTheGrid.tone;
    bestFor = dict.themes.list.offTheGrid.bestFor;
  }

  const theme: ThemeDetails = {
    title,
    desc,
    difficulty,
    category,
    tone,
    bestFor,
    ...staticData
  };

  return (
    <div className="bg-brand-dark min-h-screen text-white overflow-hidden relative pb-32">
      {/* Dynamic Colored Spotlight Glow */}
      <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none -z-10 overflow-hidden">
        <div className={`absolute -top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b ${theme.gradient} opacity-50 blur-[130px] rounded-full`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.03)_1px,transparent_0)] [background-size:24px_24px] opacity-40"></div>
      </div>

      <div className="container mx-auto px-6 pt-12 lg:pt-20">
        {/* Navigation Breadcrumb */}
        <div className="mb-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
          <Link href={`/${locale}/themes`} className="hover:text-brand-pink transition-colors">
            {dict.common.themes}
          </Link>
          <span>/</span>
          <span className="text-white">{theme.title}</span>
        </div>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-12 gap-16 items-center mb-24">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap gap-3 mb-6">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${theme.accent}`}>
                {theme.category}
              </span>
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-sm text-gray-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
                {theme.difficulty} Difficulty
              </span>
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-sm text-gray-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
                {theme.tone} Tone
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-8 uppercase tracking-tighter leading-[0.95]">
              {theme.title}
            </h1>
            
            <p className="text-lg lg:text-xl text-gray-400 mb-10 leading-relaxed font-semibold border-l-4 border-brand-pink pl-6">
              {theme.desc}
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <Link 
                href={`/${locale}/create?theme=${encodeURIComponent(theme.title)}&complexity=premium`}
                className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95 text-center"
              >
                Start Customising Now
              </Link>
              <Link 
                href={`/${locale}/pricing`}
                className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-dark transition-all border border-white/10 hover:translate-y-[-4px] active:scale-95 text-center"
              >
                View Pricing
              </Link>
            </div>
          </div>

          {/* Theme Graphic Container */}
          <div className="lg:col-span-5 relative w-full aspect-square max-w-md mx-auto">
            <div className={`absolute -inset-4 bg-brand-pink/10 rounded-[40px] -skew-y-3 blur-md ${theme.glow}`}></div>
            <div className="relative w-full h-full bg-brand-dark rounded-[30px] border-4 border-white/10 overflow-hidden flex flex-col justify-between p-10 shadow-2xl">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                  <svg className="w-6 h-6 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">CASE FILE #{Math.floor(Math.random() * 9000) + 1000}</span>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-brand-pink">READY TO PERSONALISE</p>
                <h3 className="text-3xl font-black uppercase tracking-tight leading-[1.1]">{theme.title}</h3>
                <p className="text-sm text-gray-400 font-medium">A premium, fully interactive digital mystery kit generated around your actual guest list.</p>
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-between items-center text-xs font-black uppercase tracking-widest text-white/60">
                <span>{theme.players} PLAYERS</span>
                <span>~2.5 HOURS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Grid: Case & Characters */}
        <div className="grid lg:grid-cols-12 gap-16 mb-24">
          {/* Case File Detail */}
          <div className="lg:col-span-6 space-y-12">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-xs font-black uppercase tracking-widest text-brand-pink">01 / OVERVIEW</span>
                <span className="h-[2px] bg-white/10 flex-grow"></span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black mb-6 uppercase tracking-tight">The Case File</h2>
              <p className="text-gray-400 text-base leading-relaxed font-medium">
                {theme.story}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-black mb-6 uppercase text-white tracking-wide">Target Occasions</h3>
              <div className="flex flex-wrap gap-3">
                {theme.occasionsList.map((occ, idx) => (
                  <span key={idx} className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-gray-300">
                    {occ}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black mb-6 uppercase text-white tracking-wide">Example Clues & Evidence</h3>
              <ul className="space-y-4">
                {theme.clues.map((clue, idx) => (
                  <li key={idx} className="flex gap-4 items-start p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-brand-pink text-sm leading-none mt-0.5 font-black">✦</span>
                    <span className="text-sm font-semibold text-gray-300">{clue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Roster / Cast List */}
          <div className="lg:col-span-6">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink">02 / CAST LIST</span>
              <span className="h-[2px] bg-white/10 flex-grow"></span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black mb-6 uppercase tracking-tight">Character Roster</h2>
            <p className="text-gray-400 mb-8 font-medium">Below is a sample of characters featured in this mystery. When you create your kit, these roles will adapt and personalize automatically to match your real-world guests&apos; traits and names!</p>
            
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
              {theme.roster.map((char, idx) => (
                <div key={idx} className="p-6 bg-slate-900/60 backdrop-blur-sm rounded-[24px] border border-white/5 hover:border-brand-pink/30 transition-all duration-300">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h4 className="text-lg font-black text-white uppercase">{char.name}</h4>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-brand-pink">
                      {char.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-bold leading-relaxed">{char.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA Block */}
        <div className="mt-20">
          <div className="bg-gradient-to-r from-brand-pink/10 to-transparent p-12 lg:p-20 rounded-[3rem] border-2 border-brand-pink/30 text-center relative overflow-hidden group shadow-2xl">
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-6 uppercase tracking-tight leading-none">
                Ready to Host <br />
                <span className="text-brand-pink italic">This Theme?</span>
              </h2>
              <p className="text-gray-400 text-base lg:text-lg mb-10 max-w-xl mx-auto font-semibold">
                Set up your guest list, customize character attributes, insert inside jokes, and download your full printable mystery in under 20 minutes.
              </p>
              
              <Link 
                href={`/${locale}/create?theme=${encodeURIComponent(theme.title)}&complexity=premium`}
                className="inline-flex items-center gap-4 px-12 py-6 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95"
              >
                Start Customising with this Theme
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
