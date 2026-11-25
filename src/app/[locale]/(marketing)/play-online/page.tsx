import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getPublicMarketingMysteries } from '@/services/mysteries';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import FreeMysteryLeadForm from '@/components/marketing/FreeMysteryLeadForm';
import { i18n, type Locale } from '@/lib/i18n-config';

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = 'https://backpocketmysteries.com/en/play-online';
  const title =
    'Play Murder Mystery Online With Friends (Zoom, FaceTime & Virtual) | Back Pocket Mysteries';
  const description =
    'Play a custom 100% digital murder mystery game online with friends anywhere in the world. Connect over Zoom, FaceTime, Discord, or Google Meet while your live clues, audio voicemails, and voting sync in real time on every browser.';

  return {
    title,
    description,
    keywords: [
      'play murder mystery online with friends',
      'online murder mystery game',
      'zoom murder mystery party game',
      'virtual murder mystery game for friends',
      'long distance friend group games online',
      'facetime murder mystery party',
      'discord murder mystery game',
      'browser based murder mystery game no download',
      'hybrid murder mystery party remote guests',
      'remote team building murder mystery online',
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Back Pocket Mysteries',
      type: 'website',
      images: [{ url: '/og-image.png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

const ONLINE_FAQS = [
  {
    question: 'How do we play a Back Pocket Mystery online over Zoom, FaceTime, or Discord?',
    answer:
      'It takes under 60 seconds to set up: everyone hops onto your favorite video call (Zoom, FaceTime, Discord, Google Meet, or Microsoft Teams) to see and talk to each other, while opening your unique 6-digit Back Pocket Mysteries Playroom link on their phone or a second browser tab. When the host taps "Start Round 1," every player across the world immediately receives their synced clues, audio voice memos, and theory voting ballot at the exact same moment.',
  },
  {
    question: 'Do my friends need to download an app or create accounts to play online?',
    answer:
      'No! Back Pocket Mysteries is 100% browser-based. Your guests simply tap the private RSVP link you drop into your WhatsApp, iMessage, Discord, or Slack group chat. It opens instantly in Safari or Chrome on any iPhone, Android, tablet, Mac, or PC—zero app store downloads or logins required for guests.',
  },
  {
    question: 'What is the best device setup for playing a virtual murder mystery?',
    answer:
      'We recommend the "Two-Screen Setup" for the ultimate virtual party: keep Zoom, FaceTime, or Discord open on your laptop, iPad, or TV so you can see everyone’s reactions and costumes full-screen, and hold your smartphone in your hand as your private detective dossier to read your secret alibis, inspect lock-screen text clues, and cast your votes without ever needing to share your screen.',
  },
  {
    question: 'Can we play a "Hybrid" game where most people are in the same room and 1 or 2 friends join on video?',
    answer:
      'Yes! Because the entire game runs inside our live cloud-synced Playroom, remote friends joining via FaceTime or Zoom on an iPad at the end of the dinner table have the exact same real-time clue feed, audio players, character dossiers, and voting screens as the guests sitting on your sofa.',
  },
  {
    question: 'Does the host have to share their screen or email PDFs during the video call?',
    answer:
      'Never. Unlike traditional downloadable PDF murder mystery kits—where the host has to awkwardly email 30 separate PDF attachments mid-call or screen-share clues—our live Playroom pushes Round 1, Round 2, and Round 3 evidence directly to every player’s own screen with one tap. Plus, Spoiler-Free Host Mode hides the killer so the host gets to play and guess too.',
  },
  {
    question: 'How do audio clues and CCTV photos work when playing across different countries?',
    answer:
      'Every visual forensic photo, intercepted lock-screen text thread, and synthesized audio voice memo is hosted directly inside the live digital Playroom. Players in London, New York, Sydney, or Toronto can tap play on any voice memo or zoom into any crime-scene photograph right on their own device whenever they want.',
  },
  {
    question: 'What happens if a friend drops out last minute or joins the video call late?',
    answer:
      'Our system separates core Mandatory Suspects (including the Victim and the Killer) from flexible Optional Suspects and Unlimited Detective Roles. If a friend cannot make the call, your core mystery plot never breaks—and if someone joins the Zoom call late, you can hand them a Live Detective Pass in two seconds so they can view all clues and vote in every round.',
  },
  {
    question: 'Can we customize the characters with our long-distance friend group’s inside jokes?',
    answer:
      'Yes! Before the party, you enter your friends’ real names, traits, and group-chat lore. Our AI casts your actual friends into the story—generating custom AI costume portraits and weaving your inside jokes into character bios, secret party-night roast missions, and intercepted group-chat clues in ~20 minutes.',
  },
];

export default async function PlayOnlineMarketingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const publicMysteries = await getPublicMarketingMysteries();

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://backpocketmysteries.com/en',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Play Murder Mystery Online With Friends',
        item: 'https://backpocketmysteries.com/en/play-online',
      },
    ],
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Host an Online Murder Mystery Party With Friends on Zoom or FaceTime',
    description:
      'Host a 100% digital, custom murder mystery party with friends anywhere in the world over Zoom, FaceTime, Discord, or Google Meet in 4 simple steps.',
    totalTime: 'PT20M',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Cast Your Friends Online',
        text: 'Pick a mystery theme and enter your friends’ real names, personalities, and inside jokes. Our AI builds custom character dossiers and costume portraits in ~20 minutes.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Drop the Magic RSVP Link in Your Group Chat',
        text: 'Share one private invite link on WhatsApp, iMessage, Discord, or Slack so each friend can claim their character bio and secret pre-party alibi before the call.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Start Your Video Call & Enter the 6-Digit Room PIN',
        text: 'Hop on Zoom, FaceTime, Discord, or Google Meet to talk face-to-face while opening the live Playroom on your phone or browser.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Investigate Synced Clues, Vote & Unmask the Killer',
        text: 'As the host unlocks Rounds 1, 2, and 3, every player’s screen updates simultaneously across the world with forensic photos, voice memos, and live theory voting.',
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ONLINE_FAQS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  return (
    <div className="bg-white text-brand-dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* 1. HERO SECTION — Dark Editorial Global Connection Hero */}
      <section className="relative bg-brand-dark text-white pt-14 pb-20 lg:pt-20 lg:pb-28 overflow-hidden border-b-4 border-brand-pink">
        <div className="absolute -top-40 -right-40 w-[560px] h-[560px] bg-brand-pink/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[520px] h-[520px] bg-indigo-500/15 rounded-full blur-[130px] pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-brand-pink text-[11px] font-black uppercase tracking-[0.2em]">
                <span>🌍 100% Digital Playroom</span>
                <span className="text-white/30">•</span>
                <span className="text-emerald-400">Zoom • FaceTime • Discord • Meet</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.98]">
                Play With Friends{' '}
                <span className="text-brand-pink italic">Online</span> From Anywhere In The World.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
                Miles apart doesn&apos;t mean boring catch-up calls. Because Back Pocket Mysteries is{' '}
                <strong className="text-white">100% digital and real-time synced</strong>, your friends can hop on{' '}
                <strong className="text-white">Zoom, FaceTime, Discord, or Google Meet</strong> from any city or time zone while inspecting live forensic photos, playing intercepted voice memos, and voting on the killer right on their phones.
              </p>

              {/* Key Value Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-wider text-brand-pink">
                    Zero Downloads
                  </div>
                  <div className="text-[11px] text-slate-300 font-semibold mt-0.5">
                    Plays in Safari &amp; Chrome via 1 link
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Global Real-Time Sync
                  </div>
                  <div className="text-[11px] text-slate-300 font-semibold mt-0.5">
                    Clues &amp; audio unlock simultaneously
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 col-span-2 sm:col-span-1">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                    No Screen-Sharing
                  </div>
                  <div className="text-[11px] text-slate-300 font-semibold mt-0.5">
                    Everyone holds their own secret dossier
                  </div>
                </div>
              </div>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <Link
                  href={`/${locale}/create`}
                  className="px-8 py-4 rounded-full bg-brand-pink text-white text-xs font-black uppercase tracking-widest hover:bg-white hover:text-brand-dark transition-all shadow-xl shadow-brand-pink/25"
                >
                  Cast Your Friends Online →
                </Link>
                <Link
                  href={`/${locale}/themes`}
                  className="px-7 py-4 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                >
                  Browse Mystery Themes
                </Link>
              </div>

              <p className="text-xs text-slate-400 font-semibold">
                Works for <strong className="text-white">4 to 20+ players</strong> • Full pack from{' '}
                <strong className="text-brand-pink">
                  <PriceDisplay tier="basic" locale={locale as Locale} />
                </strong>{' '}
                (one host purchase covers everyone on the call)
              </p>
            </div>

            {/* Right Interactive Visual Mockup — Laptop Video Call + Synced Phone Playroom */}
            <div className="lg:col-span-6">
              <div className="relative rounded-[32px] bg-slate-900/95 border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4">
                {/* Top Window Bar: Video Call Grid */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-[11px] font-black uppercase tracking-widest text-slate-300">
                      💻 Laptop Screen: Zoom / FaceTime / Discord Call
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    ● 6 Friends Live Across 4 Time Zones
                  </span>
                </div>

                {/* 6-Tile Global Friends Video Call Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      name: 'Sarah (The Wife)',
                      city: '🇬🇧 London • 8:00 PM',
                      quote: '“Check the 11:08 PM hallway camera—I was in the kitchen!”',
                      accent: 'border-brand-pink/50 bg-brand-pink/10',
                    },
                    {
                      name: 'Marcus (The Bestie)',
                      city: '🇺🇸 New York • 3:00 PM',
                      quote: '“Then why was your emerald earring on the study floor?!”',
                      accent: 'border-indigo-400/40 bg-indigo-500/10',
                    },
                    {
                      name: 'Chloe (The Sister)',
                      city: '🇦🇺 Sydney • 7:00 AM',
                      quote: '“Play the voicemail clue again on your phone!”',
                      accent: 'border-emerald-400/40 bg-emerald-500/10',
                    },
                    {
                      name: 'Liam (The Co-Worker)',
                      city: '🇨🇦 Toronto • 3:00 PM',
                      quote: '“Wait—look at the lock-screen text screenshot in Round 2…”',
                      accent: 'border-amber-400/40 bg-amber-500/10',
                    },
                    {
                      name: 'Emma (The Mistress)',
                      city: '🇮🇪 Dublin • 8:00 PM',
                      quote: '“I’m locking in my Round 2 vote right now.”',
                      accent: 'border-fuchsia-400/40 bg-fuchsia-500/10',
                    },
                    {
                      name: 'Luke (The Victim 💀)',
                      city: '🇺🇸 Los Angeles • 12:00 PM',
                      quote: '“One of you poisoned my mulled wine and I’m watching you all lie.”',
                      accent: 'border-rose-400/40 bg-rose-500/10',
                    },
                  ].map((tile) => (
                    <div
                      key={tile.name}
                      className={`rounded-2xl border p-3 flex flex-col justify-between min-h-[104px] ${tile.accent}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black text-white truncate">
                          {tile.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 font-semibold italic leading-snug my-1.5">
                        {tile.quote}
                      </p>
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {tile.city}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Synced Smartphone Playroom Card */}
                <div className="rounded-2xl bg-slate-950 border border-brand-pink/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                        📱 Everyone&apos;s Phone (Synced Live)
                      </span>
                      <span className="text-[11px] font-black text-emerald-400">
                        Room PIN: 482910 • Round 2 Unlocked
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      Private character script + 6 unlocked forensic &amp; audio clues + live theory voting ballot on every player&apos;s screen.
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/mini-mystery`}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-brand-pink text-white text-[11px] font-black uppercase tracking-wider transition-all"
                  >
                    Try 60-Sec Demo ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WORKS WITH EVERY VIDEO PLATFORM BAR */}
      <section className="py-8 bg-slate-950 text-white border-b border-slate-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-black uppercase tracking-widest text-slate-400">
            <span className="text-brand-pink">Pair With Any Video Or Voice App:</span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              📹 Zoom
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              📱 Apple FaceTime
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              🎧 Discord Voice &amp; Video
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              💻 Google Meet
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              🏢 Microsoft Teams
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
              💬 WhatsApp Video
            </span>
          </div>
        </div>
      </section>

      {/* 3. THREE WAYS TO PLAY ONLINE WITH FRIENDS */}
      <section className="py-20 lg:py-24 bg-slate-50 border-b border-slate-200/80">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink mb-2">
              Flexible Multiplayer Formats
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              3 Ways To Host Your Friends Online
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium mt-3">
              Whether your entire friend group is scattered across different countries or just one friend couldn&apos;t make the flight, the live digital Playroom adapts to your night.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink flex items-center justify-center text-2xl">
                  🌍
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                  Mode 1 • Most Popular for Long-Distance Friends
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  100% Virtual Video Call (Zoom, FaceTime or Discord)
                </h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Everyone pours a drink in their own home across any city or time zone. Keep your video call open on your laptop or TV so you can interrogate each other face-to-face, while using your phone as your private detective terminal.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-500">
                ✓ Best for: Long-distance besties, international families, online birthdays &amp; remote teams
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 text-white border border-slate-800 p-7 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center text-2xl">
                  🛋️
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                  Mode 2 • Never Leave a Remote Friend Out
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  Hybrid Party (In-Person Dinner + Remote Friends Called In)
                </h3>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                  Hosting 6 friends in your living room, but 2 friends live abroad or got stuck at home? Prop an iPad or laptop at the dinner table on FaceTime/Zoom—their phones sync with the exact same live Room PIN as everyone in the room.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs font-bold text-emerald-400">
                ✓ Best for: Hen parties, Christmas dinners &amp; birthdays where 1–3 guests live overseas
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center text-2xl">
                  💬
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                  Mode 3 • Multi-Day Group Chat Hype
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  Group-Chat Investigation + Live Finale Call
                </h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Unlock Round 1 in the morning, Round 2 in the afternoon, and let the accusations fly in your WhatsApp or iMessage group chat all day—then hop on a 30-minute video call at night for Round 3, final voting, and the killer reveal.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-500">
                ✓ Best for: Busy friend groups across extreme time-zone differences (UK / US / Australia)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW ONLINE PLAY WORKS — 4 STEP WALKTHROUGH */}
      <section className="py-20 lg:py-24 bg-white border-b border-slate-100">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink mb-2">
              Zero Printing • Zero Screen-Sharing
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              How To Host Over Zoom Or FaceTime In 4 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Cast Your Friends & Inside Jokes',
                desc: 'Choose a mystery theme and enter your friends’ real names, quirks, and group-chat lore. In ~20 minutes, our AI builds custom character portraits and weaves your inside jokes into the script.',
                badge: '~20 Mins Before Party',
              },
              {
                step: '02',
                title: 'Drop 1 Magic Link in the Group Chat',
                desc: 'Paste your private RSVP link into WhatsApp, iMessage, Discord, or Slack. Each friend taps their name from anywhere in the world to unlock their character bio, costume ideas, and secret pre-game alibi.',
                badge: '1-Tap Mobile RSVP',
              },
              {
                step: '03',
                title: 'Start Your Video Call & Enter the PIN',
                desc: 'Hop onto Zoom, FaceTime, Discord, or Google Meet. Everyone opens the live Playroom on their phone with your 6-digit PIN—and Spoiler-Free Host Mode lets the host play and guess alongside everyone else.',
                badge: 'Live Synced Lobby',
              },
              {
                step: '04',
                title: 'Unlock Clues, Play Audio & Vote Live',
                desc: 'With one tap, the host advances through each round (3 rounds on Basic, 4 on Premium, or 5 on Grand). Forensic photos, lock-screen texts, and playable voice memos appear on everyone’s phone simultaneously before the final Kahoot-style killer reveal.',
                badge: '90–120 Mins of Chaos',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-3xl bg-slate-50 border border-slate-200/90 p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-brand-pink">{item.step}</span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. COMPARISON TABLE: OLD PDF KITS ON ZOOM VS. BACK POCKET MYSTERIES LIVE ENGINE */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink mb-2">
              Built For Screens, Not Printers
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Why Old PDF Kits Fail On Zoom (And Why Live Sync Wins)
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium mt-3">
              Traditional murder mystery kits were designed in the 1990s to be printed and stuffed into paper envelopes. Trying to run a 60-page PDF over a video call is a nightmare—here is how our digital engine fixes every pain point.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/15 bg-slate-950/80 shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-black uppercase tracking-wider">
                  <th className="p-4 sm:p-5 text-slate-400">Online Party Feature</th>
                  <th className="p-4 sm:p-5 text-rose-400 bg-rose-500/5">
                    Old Downloadable PDF Kits on Zoom
                  </th>
                  <th className="p-4 sm:p-5 text-emerald-400 bg-emerald-500/10">
                    Back Pocket Mysteries Live Digital Engine
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs sm:text-sm font-medium">
                {[
                  {
                    feature: 'How Guests Get Their Clues',
                    oldWay: 'Host has to email 20+ separate PDF attachments or paste walls of text into Zoom chat',
                    newWay: '1 tap by the host pushes each round of clues (3–5 rounds) straight to every player’s phone screen worldwide',
                  },
                  {
                    feature: 'Spoiler Protection',
                    oldWay: 'Someone inevitably scrolls to page 42 of the PDF and accidentally sees the killer in Round 1',
                    newWay: 'Future rounds are cryptographically locked until the host unlocks them live on the call',
                  },
                  {
                    feature: 'Can the Host Play Without Spoilers?',
                    oldWay: 'No — the host has to read the master solution PDF to know which files to email out',
                    newWay: '100% Spoiler-Free Host Mode — the digital Playroom runs the rounds so the host can play & guess',
                  },
                  {
                    feature: 'Evidence Formats',
                    oldWay: 'Plain black-and-white text paragraphs that feel like homework to read on a call',
                    newWay: 'Interactive lock-screen texts, playable audio voice memos, CCTV stills & forensic reports',
                  },
                  {
                    feature: 'Customised to Your Friend Group',
                    oldWay: 'Generic stock character names you have to memorize off a sticky note',
                    newWay: 'Characters are named after your real friends with custom AI portraits & your group’s inside jokes',
                  },
                  {
                    feature: 'Voting & Final Reveal',
                    oldWay: 'Everyone talks over each other on Zoom with no scoreboard',
                    newWay: 'Live Kahoot-style round-by-round theory ballots, public suspicion board & dramatic final reveal',
                  },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="p-4 sm:p-5 font-black text-white">{row.feature}</td>
                    <td className="p-4 sm:p-5 text-slate-400 bg-rose-500/5">✕ {row.oldWay}</td>
                    <td className="p-4 sm:p-5 text-emerald-300 font-bold bg-emerald-500/10">
                      ✓ {row.newWay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. 4 PRO-TIPS FOR AN UNFORGETTABLE ZOOM / FACETIME MYSTERY NIGHT */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink mb-2">
              Virtual Host Playbook
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
              4 Pro-Tips For An Electric Video-Call Mystery Night
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '💻 + 📱',
                title: 'Use the 2-Screen Setup',
                desc: 'Join Zoom/FaceTime on your laptop or iPad so everyone’s faces stay visible in Gallery View, and open your Back Pocket Mysteries dossier on your phone.',
              },
              {
                icon: '🕶️',
                title: 'Waist-Up Costume Cam',
                desc: 'Playing online makes dressing up effortless: a velvet blazer, faux fur coat, sunglasses, or red lip plus a cocktail glass is all it takes on camera.',
              },
              {
                icon: 'Rename',
                title: 'Rename Your Zoom Tile',
                desc: 'Have everyone rename their video tile to their character title + real name (e.g. "Marcus — The Bestie" or "Sarah — The Wife") so alibis are easy to track.',
              },
              {
                icon: '🔊',
                title: 'Play Voice Memos Aloud',
                desc: 'When an intercepted audio voicemail unlocks in Round 2 or 3, have one player play it out loud over the call—or everyone can tap play on their own phone!',
              },
            ].map((tip) => (
              <div
                key={tip.title}
                className="rounded-3xl bg-slate-50 border border-slate-200 p-6 space-y-3"
              >
                <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-brand-dark text-white text-xs font-black">
                  {tip.icon}
                </div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                  {tip.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {tip.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. LIVE ONLINE MYSTERY THEMES READY TO PLAY */}
      <section className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink mb-2">
                100% Online &amp; Ready in ~20 Minutes
              </div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                Choose Your Online Mystery Theme
              </h2>
            </div>
            <Link
              href={`/${locale}/themes`}
              className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
            >
              View Full Theme Catalog →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {publicMysteries.map((mystery) => (
              <div
                key={mystery.id}
                className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between p-7"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                      {mystery.theme}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      👥 {mystery.playersLabel} • ⏱️ 1.5–3 Hours
                    </span>
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                    {mystery.title}
                  </h3>

                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {mystery.shortDesc}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                      🌍 Zoom / FaceTime Ready
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                      📱 Real-Time Synced Clues
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                      🔊 Audio &amp; Forensic Evidence
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Full Online Party Pack
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      From <PriceDisplay tier="basic" locale={locale as Locale} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/${locale}/themes/${mystery.slug}`}
                      className="px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider hover:border-brand-dark transition-all"
                    >
                      Inspect Plot
                    </Link>
                    <Link
                      href={`/${locale}/create`}
                      className="px-5 py-2.5 rounded-full bg-brand-pink text-white text-xs font-black uppercase tracking-wider hover:bg-brand-dark transition-all shadow-md"
                    >
                      Cast Friends →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION FOR ONLINE & VIRTUAL PLAY */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-12">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink mb-2">
              Online &amp; Long-Distance Hosting FAQs
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
              Frequently Asked Questions About Playing Online
            </h2>
          </div>

          <div className="space-y-4">
            {ONLINE_FAQS.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl bg-slate-50 border border-slate-200/80 p-6"
              >
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FREE MYSTERY GIVEAWAY & FINAL CTA */}
      <section className="py-20 bg-brand-dark text-white">
        <div className="container mx-auto px-6 max-w-4xl text-center space-y-8">
          <div className="space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase tracking-widest">
              🌍 Bring Your Long-Distance Friends Together Tonight
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Turn Your Next Video Call Into A Crime Scene.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium">
              Cast your real friends into a custom 100% digital murder mystery in ~20 minutes—or claim one of the first 50 free 6-player Founding Host spots below.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={`/${locale}/create`}
              className="px-9 py-4 rounded-full bg-brand-pink text-white text-xs font-black uppercase tracking-widest hover:bg-white hover:text-brand-dark transition-all shadow-xl shadow-brand-pink/25"
            >
              Build Your Online Mystery Now →
            </Link>
            <Link
              href={`/${locale}/mini-mystery`}
              className="px-8 py-4 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all"
            >
              Play 60-Second Mini-Mystery
            </Link>
          </div>

          <div className="pt-8 max-w-xl mx-auto text-left">
            <FreeMysteryLeadForm locale={locale} />
          </div>
        </div>
      </section>
    </div>
  );
}
