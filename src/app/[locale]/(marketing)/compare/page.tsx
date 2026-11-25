import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { competitors } from '@/data/competitors';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: `Best Murder Mystery Party Game Alternatives | ${dict.common.siteTitle}`,
    description: `Compare the top murder mystery party games. See how Hunt a Killer, My Mystery Party, and Night of Mystery stack up against Back Pocket Mysteries.`,
    alternates: {
      canonical: `https://backpocketmysteries.com/en/compare`,
    }
  };
}

const FEATURE_COMPARISON_ROWS = [
  {
    feature: 'Typical Cost for the Party',
    sublabel: 'Total price for your group',
    bpm: 'From $19 (~$2.50/guest)',
    pdfKits: '$30–$110+ per kit',
    etsyPdfs: '$10–$28 + printer ink',
    puzzleBoxes: '$30–$40/mo ($180/season)',
    liveActors: '$950–$2,500+ per event',
    bpmStatus: 'win',
  },
  {
    feature: 'Real Friends Cast as the Suspects',
    sublabel: 'Names, traits & inside jokes woven into clues',
    bpm: '100% Personalised to Your Crew',
    pdfKits: 'Fixed pre-written stranger names',
    etsyPdfs: 'Fixed stock template names',
    puzzleBoxes: 'No roleplay characters',
    liveActors: 'Actors perform a fixed script',
    bpmStatus: 'check',
    pdfStatus: 'cross',
    etsyStatus: 'cross',
    boxStatus: 'cross',
    actorStatus: 'cross',
  },
  {
    feature: 'AI Costume Portraits & Crime-Scene Photos',
    sublabel: 'Your actual friends pictured inside the evidence',
    bpm: 'Custom Cast Portraits & CCTV Stills',
    pdfKits: 'Generic clipart or text only',
    etsyPdfs: 'Static Canva illustrations',
    puzzleBoxes: 'Stock actors / paper props',
    liveActors: 'None',
    bpmStatus: 'check',
    pdfStatus: 'cross',
    etsyStatus: 'cross',
    boxStatus: 'cross',
    actorStatus: 'cross',
  },
  {
    feature: '100% Digital Mobile Playroom (Zero Printing)',
    sublabel: 'Kahoot-style 6-digit PIN lobby on players’ phones',
    bpm: '100% Paperless on Phones',
    pdfKits: 'Print 40–80 pages or juggle PDFs',
    etsyPdfs: '2–3 hrs printing & cutting paper slips',
    puzzleBoxes: 'Physical mailed box only',
    liveActors: 'In-person actors only',
    bpmStatus: 'check',
    pdfStatus: 'cross',
    etsyStatus: 'cross',
    boxStatus: 'cross',
    actorStatus: 'partial',
  },
  {
    feature: 'Multi-Speaker Audio Wiretaps & Leaked DMs',
    sublabel: 'Voice recordings, lock-screen texts & forensic logs',
    bpm: 'Audio Wiretaps, Texts & CCTV',
    pdfKits: 'Written paper paragraphs only',
    etsyPdfs: 'Printable paper cards only',
    puzzleBoxes: 'Printed letters & ciphers',
    liveActors: 'Spoken live by hired actors',
    bpmStatus: 'check',
    pdfStatus: 'cross',
    etsyStatus: 'cross',
    boxStatus: 'partial',
    actorStatus: 'partial',
  },
  {
    feature: 'Spoiler-Free Host Mode',
    sublabel: 'Can the host play & guess the killer without spoilers?',
    bpm: 'Yes — Host Plays 100% Unspoiled',
    pdfKits: 'Partial — easy to see spoilers in files',
    etsyPdfs: 'No — host cuts & sorts reveal cards',
    puzzleBoxes: 'Yes (co-op puzzle solving)',
    liveActors: 'Yes (actors run the show)',
    bpmStatus: 'check',
    pdfStatus: 'partial',
    etsyStatus: 'cross',
    boxStatus: 'check',
    actorStatus: 'check',
  },
  {
    feature: 'Auto Gender-Flex Casting',
    sublabel: 'Seamlessly adapts for 6F bachelorettes or uneven groups',
    bpm: 'Auto-Adapts Pronouns, Titles & Outfits',
    pdfKits: 'Rigid M/F character ratios',
    etsyPdfs: 'Hardcoded pronouns in static PDFs',
    puzzleBoxes: 'N/A (no character roles)',
    liveActors: 'N/A (audience watches actors)',
    bpmStatus: 'check',
    pdfStatus: 'cross',
    etsyStatus: 'cross',
    boxStatus: 'cross',
    actorStatus: 'cross',
  },
  {
    feature: '1-Click WhatsApp & SMS Character Invites',
    sublabel: 'Send each guest their private mobile character passport',
    bpm: '1-Click Private Mobile Links',
    pdfKits: 'Manually split & email separate PDFs',
    etsyPdfs: 'Print & hand out paper booklets',
    puzzleBoxes: 'No guest character invites',
    liveActors: 'No individual guest roles',
    bpmStatus: 'check',
    pdfStatus: 'cross',
    etsyStatus: 'cross',
    boxStatus: 'cross',
    actorStatus: 'cross',
  },
  {
    feature: 'Ready to Play Tonight',
    sublabel: 'Time from checkout to starting your party',
    bpm: '~20 Minutes (100% Online)',
    pdfKits: '1–2 hours of printing & sorting',
    etsyPdfs: '2–3 hours of cutting & stuffing envelopes',
    puzzleBoxes: '5–10 days postal shipping',
    liveActors: 'Book 4–8 weeks in advance',
    bpmStatus: 'check',
    pdfStatus: 'partial',
    etsyStatus: 'cross',
    boxStatus: 'cross',
    actorStatus: 'cross',
  },
];

function StatusBadge({
  status,
  text,
  isBpm = false,
}: {
  status?: string;
  text: string;
  isBpm?: boolean;
}) {
  if (isBpm) {
    return (
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-pink text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm">
          ✓
        </span>
        <span className="text-xs sm:text-sm font-black text-white leading-snug">{text}</span>
      </div>
    );
  }

  if (status === 'check') {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0">
          ✓
        </span>
        <span className="text-xs font-bold text-gray-700 leading-snug">{text}</span>
      </div>
    );
  }

  if (status === 'partial') {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">
          ~
        </span>
        <span className="text-xs font-semibold text-gray-600 leading-snug">{text}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-black shrink-0">
        ✕
      </span>
      <span className="text-xs font-medium text-gray-500 leading-snug">{text}</span>
    </div>
  );
}

export default async function CompareHubPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  await getDictionary(locale as Locale);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-brand-dark">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[11px] font-black uppercase tracking-widest mb-6">
              Side-by-Side Feature Breakdown
            </span>
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-6 tracking-tighter uppercase leading-[0.9]">
              Compare <span className="text-brand-pink italic">Alternatives</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-300 font-bold max-w-2xl mx-auto leading-relaxed">
              See how traditional downloadable PDF kits, Etsy printables, subscription boxes, and hired actors stack up against a 100% digital murder mystery built around your real friends.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16 lg:py-24 space-y-24">
        {/* =====================================================================
            SECTION 1: MASTER FEATURE-BY-FEATURE COMPARISON GRID
        ===================================================================== */}
        <div>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-pink mb-2">
              Feature-by-Feature Matrix
            </p>
            <h2 className="text-3xl lg:text-5xl font-black text-brand-dark tracking-tighter uppercase">
              What Each Option Actually Does
            </h2>
            <p className="text-sm lg:text-base text-gray-500 font-bold mt-3">
              Every major murder mystery format compared across the 9 features that make or break party night.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[32px] border border-gray-200 shadow-xl bg-white">
            <table className="w-full min-w-[980px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="p-6 w-[24%] bg-gray-50 align-bottom">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      Party Feature
                    </span>
                    <span className="text-lg font-black text-brand-dark uppercase tracking-tight">
                      What You Get
                    </span>
                  </th>

                  {/* Highlighted BPM Column Header */}
                  <th className="p-6 w-[22%] bg-brand-dark text-white align-bottom relative border-x border-brand-pink/30">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest mb-2">
                      ★ Best For Parties
                    </span>
                    <div className="text-lg font-black uppercase tracking-tight leading-tight">
                      Back Pocket Mysteries
                    </div>
                    <p className="text-[11px] text-gray-300 font-semibold mt-1">
                      100% Digital Custom AI + Live Mobile Playroom
                    </p>
                  </th>

                  <th className="p-5 w-[18%] bg-gray-50 align-bottom border-r border-gray-100">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      Pre-Written PDFs
                    </span>
                    <div className="text-sm font-black text-brand-dark uppercase tracking-tight">
                      Downloadable PDF Kits
                    </div>
                    <p className="text-[11px] text-gray-500 font-semibold mt-1">
                      Night of Mystery, My Mystery Party, Masters of Mystery, Red Herring
                    </p>
                  </th>

                  <th className="p-5 w-[18%] bg-gray-50 align-bottom border-r border-gray-100">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      DIY Printables
                    </span>
                    <div className="text-sm font-black text-brand-dark uppercase tracking-tight">
                      Etsy PDF Templates
                    </div>
                    <p className="text-[11px] text-gray-500 font-semibold mt-1">
                      Static Canva PDFs you print &amp; cut at home
                    </p>
                  </th>

                  <th className="p-5 w-[18%] bg-gray-50 align-bottom">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      Boxes &amp; Live Events
                    </span>
                    <div className="text-sm font-black text-brand-dark uppercase tracking-tight">
                      Hunt a Killer / Dinner Detective
                    </div>
                    <p className="text-[11px] text-gray-500 font-semibold mt-1">
                      Solo puzzle boxes or $1,000+ hired actor shows
                    </p>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {FEATURE_COMPARISON_ROWS.map((row, idx) => (
                  <tr key={row.feature} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                    <td className="p-5 sm:p-6 align-top">
                      <div className="text-sm font-black text-brand-dark leading-snug">
                        {row.feature}
                      </div>
                      <div className="text-xs font-medium text-gray-400 mt-0.5">
                        {row.sublabel}
                      </div>
                    </td>

                    {/* Highlighted BPM Cell */}
                    <td className="p-5 sm:p-6 bg-brand-dark text-white align-top border-x border-brand-pink/20">
                      <StatusBadge isBpm text={row.bpm} />
                    </td>

                    <td className="p-5 align-top border-r border-gray-100">
                      <StatusBadge status={row.pdfStatus || 'partial'} text={row.pdfKits} />
                    </td>

                    <td className="p-5 align-top border-r border-gray-100">
                      <StatusBadge status={row.etsyStatus || 'partial'} text={row.etsyPdfs} />
                    </td>

                    <td className="p-5 align-top">
                      <StatusBadge
                        status={row.boxStatus || 'cross'}
                        text={`${row.puzzleBoxes} / ${row.liveActors}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================================
            SECTION 2: INDIVIDUAL COMPETITOR BREAKDOWN CARDS (WITH FEATURE GRID)
        ===================================================================== */}
        <div>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-pink mb-2">
              Head-to-Head Reviews
            </p>
            <h2 className="text-3xl lg:text-5xl font-black text-brand-dark tracking-tighter uppercase">
              Compare Individual Brands
            </h2>
            <p className="text-sm lg:text-base text-gray-500 font-bold mt-3">
              Click any brand below for a deep-dive comparison of pricing, host prep, and gameplay features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {competitors.map((competitor) => {
              const isActorShow = competitor.slug === 'the-dinner-detective';
              const isPuzzleBox = competitor.slug === 'hunt-a-killer';

              const featureChecks = [
                {
                  label: 'Instant Online Access',
                  supported: competitor.instant,
                },
                {
                  label: 'Party Roleplay Characters',
                  supported: !isPuzzleBox && !isActorShow,
                },
                {
                  label: 'Host Can Play Unspoiled',
                  supported: isPuzzleBox || isActorShow,
                },
                {
                  label: 'Cast Your Real Friends & Inside Jokes',
                  supported: false,
                },
                {
                  label: '100% Digital Mobile Playroom (No Printing)',
                  supported: false,
                },
                {
                  label: 'Audio Wiretaps, CCTV Photos & Leaked DMs',
                  supported: false,
                },
                {
                  label: 'Auto Gender-Flex for All-Female / Uneven Groups',
                  supported: false,
                },
              ];

              return (
                <div
                  key={competitor.slug}
                  className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm flex flex-col h-full hover:border-brand-pink hover:shadow-xl transition-all"
                >
                  <div className="mb-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        Alternative To
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider">
                        {competitor.format}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-2">
                      {competitor.name}
                    </h3>
                    <p className="text-gray-500 font-bold text-sm">{competitor.tagline}</p>
                  </div>

                  {/* Quick Spec Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 mb-5">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Price
                      </p>
                      <p className="text-xs font-black text-brand-dark mt-0.5">
                        {competitor.price}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Group Size
                      </p>
                      <p className="text-xs font-black text-brand-dark mt-0.5">
                        {competitor.groupSize}
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-gray-200/70">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Best For
                      </p>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">
                        {competitor.bestFor}
                      </p>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 mb-8 flex-grow">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Features Included
                    </p>
                    {featureChecks.map((fc) => (
                      <div key={fc.label} className="flex items-center gap-2.5 text-xs">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            fc.supported
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-500'
                          }`}
                        >
                          {fc.supported ? '✓' : '✕'}
                        </span>
                        <span
                          className={
                            fc.supported
                              ? 'font-bold text-brand-dark'
                              : 'font-medium text-gray-400'
                          }
                        >
                          {fc.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/${locale}/compare/${competitor.slug}`}
                    className="w-full text-center px-6 py-4 bg-gray-100 text-brand-dark rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-pink hover:text-white transition-all duration-300"
                  >
                    Read Full Comparison →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Why Choose BPM Section */}
        <div className="bg-brand-pink/5 rounded-3xl p-12 lg:p-20 border border-brand-pink/20 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-6 tracking-tighter uppercase">
            Why Back Pocket Mysteries Wins
          </h2>
          <p className="text-lg text-gray-600 font-bold max-w-2xl mx-auto mb-12">
            Traditional murder mystery kits are static — the same pre-named strangers and generic paper clues for every buyer. Back Pocket Mysteries combines human-written mystery plots (for watertight clue logic) with AI personalisation that weaves your real friends, portraits, and inside jokes into a 100% digital mobile Playroom in ~20 minutes.
          </p>
          <Link
            href={`/${locale}/custom-murder-mystery`}
            className="inline-block px-10 py-5 bg-brand-pink text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-brand-dark transition-all duration-300 shadow-xl shadow-brand-pink/20"
          >
            Create Your Custom Mystery
          </Link>
        </div>
      </div>
    </div>
  );
}
