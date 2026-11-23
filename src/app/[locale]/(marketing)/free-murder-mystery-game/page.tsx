import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import FreeMysteryLeadForm from '@/components/marketing/FreeMysteryLeadForm';
import { ACTIVE_MYSTERIES } from '@/data/active-mysteries';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;
  const title =
    'First 50 Founding Host Giveaway — Free Custom Murder Mystery Game | Back Pocket Mysteries';
  const description =
    'How the Back Pocket Mysteries First 50 Launch Giveaway works: be one of the first 50 hosts on our VIP list to claim a 100% FREE custom murder mystery party pack (worth up to £45 / $55) built around your friends.';

  return {
    title,
    description,
    keywords: [
      'free murder mystery game',
      'first 50 launch giveaway',
      'free printable murder mystery game',
      'free murder mystery party kit',
      'free murder mystery game for adults',
      'custom murder mystery game free',
      'printable murder mystery dinner party game',
      'murder mystery party giveaway',
    ],
    alternates: {
      canonical: `https://backpocketmysteries.com/en/free-murder-mystery-game`,
    },
    openGraph: {
      title,
      description,
      url: `https://backpocketmysteries.com/en/free-murder-mystery-game`,
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

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    badge: 'Takes 10 Seconds',
    title: 'Lock In Your VIP Spot (#1–#50)',
    description:
      'Enter your first name and email address in the VIP claim form. Our system assigns your deterministic timestamped rank (#1 through #50) on the spot and sends an instant confirmation email showing your exact VIP Spot number.',
  },
  {
    step: '02',
    badge: 'Launch Day Inbox Delivery',
    title: 'Receive Your 100%-Off Voucher Code',
    description:
      'The moment we open our doors for launch, everyone in Spots #1 to #50 receives a unique single-use 100%-off Founding Host promo code by email—no credit card, subscription, or hidden checkout fee required.',
  },
  {
    step: '03',
    badge: 'Redeem Whenever You Host',
    title: 'Pick Any Theme & Personalise Your Cast',
    description:
      'You do not need your party date or guest list ready today. When you are ready to host, choose any Mystery Base Pack, enter 4 to 16 guests with their personalities or inside jokes, and apply your 100%-off code at checkout.',
  },
  {
    step: '04',
    badge: 'Spoiler-Free for the Host',
    title: 'Host Live on Phones or Print at Home',
    description:
      'In ~30 minutes your custom game pack is ready with personalised suspect dossiers, visual & audio clues, printable PDFs, and a live mobile Playroom (6-digit PIN + QR code) so even you can play without knowing the killer.',
  },
];

const PRIZE_INCLUSIONS = [
  {
    icon: '🎟️',
    title: 'Any Group Tier (4 to 16 Players)',
    valueTag: 'Up to £45 / $55 Value',
    description:
      'Your Founding Host code unlocks any tier—Basic (4–6 players), Premium (4–10 players), or Grand (4–16 players)—at 100% off.',
  },
  {
    icon: '🕵️‍♀️',
    title: 'Customised Suspect Dossiers',
    valueTag: 'Human Plot + AI Tailored',
    description:
      'Human-authored mystery plots with watertight clue logic, tailored by AI around your friends’ names, traits, relationships, and inside jokes.',
  },
  {
    icon: '📸',
    title: 'Forensic Visual & Audio Clues',
    valueTag: 'Multimedia Evidence Deck',
    description:
      'Crime scene photos, CCTV surveillance stills, autopsy reports, intercepted chats, and voice-acted Inspector audio briefings for every round.',
  },
  {
    icon: '📱',
    title: 'Live Interactive Mobile Playroom',
    valueTag: '6-Digit PIN & QR Join',
    description:
      'Guests scan a QR code to claim their dossier, track relationships, tag clues (Key, Alibi, Decoy) in their Detective Notebook, and vote on the killer.',
  },
  {
    icon: '🥂',
    title: '100% Spoiler-Free Host Mode',
    valueTag: 'Host Plays as a Suspect',
    description:
      'Guided round-by-round host announcements and an automated final reveal mean the host never sees the killer ahead of time.',
  },
  {
    icon: '🖨️',
    title: 'Print-Ready PDF Party Kit',
    valueTag: 'Home or Office Printer Friendly',
    description:
      'Prefer paper? Download formatted suspect booklets, printable evidence cards, and character invitation links ready in 5 minutes.',
  },
];

export default async function FreeMurderMysteryGamePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the First 50 Founding Host Launch Giveaway?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'To celebrate the launch of Back Pocket Mysteries, the first 50 people who join our pre-launch VIP email list receive a 100%-off promo code on launch day good for one complete custom murder mystery party pack (worth up to £45 / $55 USD for up to 16 players).',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I know if I made the First 50?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The moment you submit your name and email, the confirmation card on screen and your instant welcome email display your exact timestamped VIP Spot number (e.g., Spot #49 of 50). If you already signed up, entering the same email again will display your existing spot number without creating a duplicate.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to know my party date or guest list right now?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No! Claiming your spot today simply locks in your 100%-off Founding Host voucher code. Once we email your code on launch day, you can redeem it whenever you are ready to host and enter your guests’ names and inside jokes at that time.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is included in the free murder mystery party kit?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your free custom murder mystery pack includes personalised character booklets tailored to your guests, printable and digital crime scene clues, AI-generated suspect portraits, voice-acted audio evidence briefings, and our interactive mobile Playroom so even the host can play spoiler-free.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many players does the free code cover?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your First 50 Founding Host voucher works on any group size tier from 4 to 16 players—including Basic (4–6 players), Premium (4–10 players), and Grand (4–16 players).',
        },
      },
      {
        '@type': 'Question',
        name: 'What happens if I sign up after the first 50 spots are taken?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Anyone who joins at Spot #51 or later is automatically added to our VIP Launch Waitlist and receives our largest early-bird launch discount code plus priority access on launch day.',
        },
      },
    ],
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero + Lead Capture Section */}
      <section
        id="claim-spot"
        className="relative py-14 lg:py-24 overflow-hidden bg-gradient-to-b from-slate-50 to-white border-b border-gray-100"
      >
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full border border-brand-pink/20">
                🎁 Founding Host Launch Giveaway • First 50 Sign-Ups Only
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tighter text-brand-dark uppercase leading-[0.98]">
                First 50 Hosts Get a{' '}
                <span className="text-brand-pink italic">Free</span> Custom Murder Mystery Pack
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 font-medium leading-relaxed max-w-2xl">
                Every mystery at <strong className="text-brand-dark">Back Pocket Mysteries</strong> is architected by a human author for watertight clue logic—then custom-built around your actual friends by our AI engine. To celebrate our upcoming launch, our{' '}
                <strong className="text-brand-pink">first 50 email sign-ups</strong> get a complete custom game pack (up to £45 / $55 value for 4–16 players) <strong className="text-brand-dark">100% free</strong>.
              </p>

              {/* Quick Value Pills */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <span className="px-3.5 py-1.5 rounded-full bg-brand-dark text-white text-[11px] font-black uppercase tracking-wider">
                  ✓ 100% Free Game Pack Voucher
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-brand-dark text-[11px] font-black uppercase tracking-wider">
                  ✓ Valid for 4–16 Players (Up to Grand Tier)
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-brand-dark text-[11px] font-black uppercase tracking-wider">
                  ✓ No Credit Card Required
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <span className="w-8 h-8 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center font-black text-sm shrink-0">
                    1
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark">
                      Human-Written Plot + AI Personalised
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      Human authors architect the plot, twists, and clue logic; AI weaves your guests&apos; names, traits, and inside jokes into the dossiers and evidence.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <span className="w-8 h-8 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center font-black text-sm shrink-0">
                    2
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark">
                      Spoiler-Free for the Host
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      Play as a full suspect at your own dinner party without ever spoiling who the killer is.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <span className="w-8 h-8 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center font-black text-sm shrink-0">
                    3
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark">
                      Live Mobile Playroom + Printable PDFs
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      Join via a 6-digit Game PIN or QR code on guest phones, or print the formatted suspect booklets and evidence cards at home.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <span className="w-8 h-8 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center font-black text-sm shrink-0">
                    4
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark">
                      Lock In Now, Host Whenever You Want
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      Reserve your spot in 10 seconds today—you don&apos;t need your guest list or party date ready until you redeem your launch code.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive Lead Form Column */}
            <div className="lg:col-span-5">
              <FreeMysteryLeadForm locale={locale} />
            </div>
          </div>
        </div>
      </section>

      {/* How the First 50 Giveaway Works (4-Step Breakdown) */}
      <section className="py-20 bg-brand-dark text-white">
        <div className="container mx-auto px-6 max-w-6xl space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-pink">
              Simple, Transparent &amp; Instant
            </p>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              How the First 50 Launch Giveaway Works
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              No raffles, no social media tagging hoops, and no credit card required. If you are one of the first 50 people to register your email, your free custom mystery pack is guaranteed.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-[2rem] bg-white/5 border border-white/10 p-7 flex flex-col justify-between space-y-5 relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xl font-black text-brand-pink leading-none">
                      {item.step}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[9px] font-black uppercase tracking-widest">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Inside Your Free Murder Mystery Kit */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl space-y-12">
          <div className="text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-pink">
              Full Commercial Game Pack • Zero Restrictions
            </p>
            <h2 className="text-3xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight">
              What Your Free Founding Host Code Unlocks
            </h2>
            <p className="text-gray-500 font-medium max-w-2xl mx-auto">
              Unlike free sample scripts that cut out half the suspects, our First 50 VIP Founding Hosts receive a full-tier custom mystery game pack (worth up to £45 / $55 USD).
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRIZE_INCLUSIONS.map((item) => (
              <div
                key={item.title}
                className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-3xl">{item.icon}</span>
                    <span className="px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                      {item.valueTag}
                    </span>
                  </div>
                  <h3 className="text-lg font-black uppercase text-brand-dark">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spots #1-50 vs Spots #51+ Comparison Section */}
      <section className="py-16 bg-slate-50 border-t border-gray-100">
        <div className="container mx-auto px-6 max-w-5xl space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-pink">
              VIP Spot Breakdown
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight">
              Spots #1–50 vs. Waitlist Spots #51+
            </h2>
            <p className="text-sm text-gray-500 font-medium max-w-2xl mx-auto">
              Every sign-up is ranked chronologically by timestamp. Here is what you unlock depending on your spot number:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Spots #1 - #50 */}
            <div className="rounded-[2.5rem] bg-brand-dark text-white p-8 sm:p-10 border-2 border-brand-pink shadow-xl space-y-6 relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                🏆 Spots #1 – #50 • Founding VIP Hosts
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                  100% Free Custom Mystery Pack
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  Automatically awarded to the first 50 email sign-ups before launch.
                </p>
              </div>
              <ul className="space-y-3 text-sm font-medium text-slate-200">
                <li className="flex items-start gap-2.5">
                  <span className="text-brand-pink font-black">✓</span>
                  <span>
                    <strong className="text-white">100%-Off Promo Code</strong> emailed on launch day (up to £45 / $55 value)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-brand-pink font-black">✓</span>
                  <span>
                    Valid on <strong className="text-white">any group size tier</strong> from 4 to 16 players (Basic, Premium, or Grand)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-brand-pink font-black">✓</span>
                  <span>
                    Valid on <strong className="text-white">any launch Mystery Base Pack</strong> + full AI cast personalisation
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-brand-pink font-black">✓</span>
                  <span>
                    Instant email confirmation showing your locked-in <strong className="text-white">Spot # of 50</strong>
                  </span>
                </li>
              </ul>
              <div className="pt-2">
                <a
                  href="#claim-spot"
                  className="inline-block w-full text-center py-4 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-full text-xs font-black uppercase tracking-widest transition-all"
                >
                  Claim One of the First 50 Spots ↑
                </a>
              </div>
            </div>

            {/* Spots #51+ */}
            <div className="rounded-[2.5rem] bg-white text-brand-dark p-8 sm:p-10 border border-gray-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-brand-dark text-[10px] font-black uppercase tracking-widest">
                  ✨ Spots #51+ • VIP Launch Waitlist
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                    Early-Bird Launch Discount &amp; Perks
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    Missed the first 50? You still get VIP Founding Waitlist treatment on launch day.
                  </p>
                </div>
                <ul className="space-y-3 text-sm font-medium text-gray-600">
                  <li className="flex items-start gap-2.5">
                    <span className="text-brand-pink font-black">✓</span>
                    <span>
                      Our <strong className="text-brand-dark">biggest early-bird launch discount code</strong> sent straight to your inbox
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-brand-pink font-black">✓</span>
                    <span>
                      <strong className="text-brand-dark">Priority early access</strong> before public advertising opens
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-brand-pink font-black">✓</span>
                    <span>
                      First look at new Mystery Base Packs, dinner party menus &amp; hosting guides
                    </span>
                  </li>
                </ul>
              </div>
              <p className="text-xs text-gray-400 font-semibold">
                Tip: The live counter at the top of this page shows in real time how many of the first 50 spots are still open right now.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Themes Preview Section */}
      <section className="py-20 bg-brand-gray border-y border-gray-100">
        <div className="container mx-auto px-6 max-w-6xl space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-pink mb-2">
                Choose Any Setting
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight">
                Themes Eligible for Your Free Mystery Code
              </h2>
            </div>
            <Link
              href={`/${locale}/themes`}
              className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
            >
              View All Themes →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {ACTIVE_MYSTERIES.map((m) => (
              <div
                key={m.slug}
                className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                    {m.theme} • {m.min_players}–{m.max_players} Players
                  </span>
                  <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
                    {m.title}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    {m.description}
                  </p>
                </div>
                <div>
                  <Link
                    href={`/${locale}/themes/${m.slug}`}
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-dark hover:text-brand-pink transition-colors"
                  >
                    Explore Theme Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-4xl space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight">
              First 50 Giveaway — Frequently Asked Questions
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              Everything you need to know about claiming and redeeming your free custom murder mystery pack.
            </p>
          </div>

          <div className="space-y-4">
            {faqSchema.mainEntity.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-2"
              >
                <h3 className="text-base sm:text-lg font-black text-brand-dark">
                  {faq.name}
                </h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                  {faq.acceptedAnswer.text}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <a
              href="#claim-spot"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-pink hover:bg-brand-dark text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-pink/20 transition-all"
            >
              Claim Your Free VIP Spot Now ↑
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
