import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import FreeMysteryLeadForm from '@/components/marketing/FreeMysteryLeadForm';
import { ACTIVE_MYSTERIES } from '@/data/active-mysteries';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const title =
    'Free Murder Mystery Game (First 50 VIP Launch Giveaway) | Back Pocket Mysteries';
  const description =
    'Looking for a free printable murder mystery game for adults? Be one of the first 50 hosts on our pre-launch VIP list to claim a 100% FREE custom murder mystery party kit built around your actual friends.';

  return {
    title,
    description,
    keywords: [
      'free murder mystery game',
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
        name: 'How do I get a free custom murder mystery game?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The first 50 people who join the Back Pocket Mysteries pre-launch VIP email list receive a single-use 100%-off promo code on launch day good for a complete custom murder mystery party pack.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is included in the free murder mystery party kit?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your free custom murder mystery pack includes personalised character booklets tailored to your guests and their inside jokes, printable & digital crime scene clues, AI-generated character portraits, audio evidence briefings, and an interactive host mode so even the host can play without knowing the killer.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many players can play the free murder mystery game?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Back Pocket Mysteries supports groups from 4 to 20+ players, dynamically scaling suspects, motives, and subplots to fit your exact guest list.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can the host play without knowing who the murderer is?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Every Back Pocket Mystery is spoiler-free for the host, using guided digital or printable rounds and audio briefings so you can play right alongside your friends.',
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
      <section className="relative py-14 lg:py-24 overflow-hidden bg-gradient-to-b from-slate-50 to-white border-b border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full border border-brand-pink/20">
                🎁 Founding Host Launch Giveaway • First 50 Only
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tighter text-brand-dark uppercase leading-[0.98]">
                Get a <span className="text-brand-pink italic">Free</span> Custom Murder Mystery Game Pack
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 font-medium leading-relaxed max-w-2xl">
                Forget generic, cheesy PDF downloads where nobody fits their character. To celebrate the launch of{' '}
                <strong className="text-brand-dark">Back Pocket Mysteries</strong>, the{' '}
                <strong className="text-brand-pink">first 50 email sign-ups</strong> get a complete, personalised murder mystery dinner party kit—built around your actual friends—100% free.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <span className="w-8 h-8 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center font-black text-sm shrink-0">
                    1
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark">
                      Built Around Your Friends
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      We weave your guests&apos; personalities, traits, and inside jokes directly into the alibis and motives.
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
                      Printable PDF + Interactive TV Mode
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      Includes print-at-home character booklets, crime scene photos, voice-acted audio clues, and live voting.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <span className="w-8 h-8 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center font-black text-sm shrink-0">
                    4
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark">
                      4 to 20+ Players
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      Flexible casting that adapts to last-minute guest changes in seconds.
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

      {/* What's Inside Your Free Murder Mystery Kit (SEO Rich Content) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-5xl space-y-12">
          <div className="text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-pink">
              Everything You Need to Host
            </p>
            <h2 className="text-3xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight">
              What&apos;s Included in Your Free Murder Mystery Kit?
            </h2>
            <p className="text-gray-500 font-medium max-w-2xl mx-auto">
              Unlike free sample scripts that leave out half the clues, our First 50 VIP Founding Hosts receive a full-tier custom mystery game pack (up to £45 / $55 value).
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-3">
              <div className="text-2xl">🕵️‍♀️</div>
              <h3 className="text-lg font-black uppercase text-brand-dark">
                Custom Character Booklets
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Every guest receives a multi-round dossier with their backstory, costume suggestions, secret relationships, round-by-round objectives, and alibis.
              </p>
            </div>

            <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-3">
              <div className="text-2xl">📸</div>
              <h3 className="text-lg font-black uppercase text-brand-dark">
                Visual &amp; Audio Evidence
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Forensic reports, intercepted text messages, crime scene photographs, and voice-acted Inspector audio intros that bring the investigation to life.
              </p>
            </div>

            <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-3">
              <div className="text-2xl">🥂</div>
              <h3 className="text-lg font-black uppercase text-brand-dark">
                Zero-Prep Host Guide
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Send digital character invites with one click, print the evidence cards in 5 minutes, and let our interactive Playroom guide your party through the final reveal.
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
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              Everything you need to know about the First 50 Free Murder Mystery giveaway.
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
        </div>
      </section>
    </div>
  );
}
