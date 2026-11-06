import React from 'react';
import Link from 'next/link';
import { getPublishedMysteryByIdOrSlug, replacePlaceholderNamesWithRoles } from '@/services/mysteries';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import { Locale } from '@/lib/i18n-config';
import { getTierForPlayerCount } from '@/utils/localization';
import { MysteryMoodboard } from '@/components/mysteries/MysteryMoodboard';
import {
  getEffectiveCoverUrl,
  getEffectiveMoodboardPhotos,
  isRealityReunionMystery,
} from '@/utils/moodboard';
import { getCleanCharacterPresentation } from '@/utils/character-display';

import {
  LOVE_ON_THE_ROCKS_MYSTERY,
  getCanonicalActiveMysteryBySlugOrId,
} from '@/data/active-mysteries';

function unwrapTokens(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\{\{([A-Za-z0-9\s'._-]+)\}\}/g, '$1');
}

function getTierForComplexity(complexity: string | null | undefined): 'basic' | 'premium' | 'grand' {
  if (complexity === 'easy') return 'basic';
  if (complexity === 'hard') return 'grand';
  return 'premium';
}

function formatGenderBadge(gender: string | null | undefined): { label: string; colorClass: string } {
  const g = (gender || 'adaptable').toLowerCase();
  if (g === 'male' || g === 'masculine') {
    return { label: 'Masculine Role', colorClass: 'bg-sky-50 text-sky-600 border-sky-100' };
  }
  if (g === 'female' || g === 'feminine') {
    return { label: 'Feminine Role', colorClass: 'bg-pink-50 text-brand-pink border-pink-100' };
  }
  return { label: 'Adaptable (Any Gender)', colorClass: 'bg-purple-50 text-purple-600 border-purple-100' };
}

export default async function ServiceMysteryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const dbMystery = await getPublishedMysteryByIdOrSlug(slug);
  const mystery: any = dbMystery && dbMystery.status === 'published' ? dbMystery : null;

  if (!mystery) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mx-auto mb-6">
          🕵️‍♀️
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">Mystery Not Found</h1>
        <p className="text-slate-500 font-medium mb-8">
          This story isn&apos;t available right now or may have been moved back to draft.
        </p>
        <Link
          href={`/${locale}/mysteries`}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90"
          style={{ background: '#fe04c6' }}
        >
          ← Back to Browse Mysteries
        </Link>
      </div>
    );
  }

  const characters: any[] =
    Array.isArray(mystery.characters) && mystery.characters.length > 0
      ? mystery.characters
      : LOVE_ON_THE_ROCKS_MYSTERY.characters;

  const isRealityGlam = isRealityReunionMystery(mystery.theme, mystery.title);

  const playersLabel =
    mystery.min_players === mystery.max_players
      ? `${mystery.min_players} Players`
      : `${mystery.min_players || 4}–${mystery.max_players || 12} Players`;

  const complexityLabel = (mystery.complexity || 'medium').toUpperCase();
  const spiceLabel = isRealityGlam
    ? 'SPICY 🔥'
    : (mystery.spice_level || 'Mild').toUpperCase();
  const occasions: string[] =
    mystery.occasions ||
    (isRealityGlam
      ? [
          '💖 Bachelorette & Hen Nights',
          '🍸 20s & 30s Birthday Parties',
          "💅 Girls' Night & Cocktail Parties",
          '🏝️ Love Island & Reality TV Fans',
          '🥂 Messy Friend Groups',
        ]
      : [
          'Dinner Parties',
          'Birthday Celebrations',
          'Friends Game Nights',
          'Themed Socials',
        ]);

  const coverUrl = getEffectiveCoverUrl(
    mystery.image_url,
    mystery.theme,
    mystery.title
  );
  const moodboardPhotos = getEffectiveMoodboardPhotos(
    mystery.image_url,
    mystery.theme,
    mystery.title
  );

  return (
    <div className="space-y-10 pb-12">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href={`/${locale}/mysteries`}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-pink transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to All Mysteries
        </Link>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Cover Visual */}
          <div className="lg:col-span-7 relative min-h-[320px] sm:min-h-[420px] bg-slate-900 overflow-hidden">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt={mystery.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-black uppercase tracking-widest text-sm">
                Mystery Artwork
              </div>
            )}
            <div
              className="absolute inset-0"
              style={{
                background: isRealityGlam
                  ? 'linear-gradient(to top, rgba(24,8,28,0.82) 0%, rgba(254,4,198,0.12) 45%, transparent 100%)'
                  : 'linear-gradient(to top, rgba(15,12,18,0.85) 0%, rgba(15,12,18,0.2) 55%, transparent 100%)',
              }}
            />
            <div className="absolute top-6 left-6 flex flex-wrap gap-2">
              <span
                className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest text-white shadow-lg"
                style={{ background: '#fe04c6' }}
              >
                {isRealityGlam ? '💋 Reality TV Reunion • XOXO' : mystery.theme || 'Mystery Kit'}
              </span>
              <span className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-black/60 text-white backdrop-blur-md">
                {playersLabel}
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-2">
                <span>★ ★ ★ ★ ★</span>
                <span className="text-white/90">
                  {isRealityGlam
                    ? "Spotted: #1 Pick for Girls' Night & Birthdays"
                    : 'Host Favorite Theme'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none">
                {mystery.title}
              </h1>
            </div>
          </div>

          {/* Right Purchase / Build Summary */}
          <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Full Custom Mystery Kit
                  </p>
                  <PriceDisplay
                    tier={getTierForPlayerCount(mystery.max_players || characters.length)}
                    locale={locale as Locale}
                    mysteryId={mystery.id}
                    mysterySlug={slug}
                    mysteryTitle={mystery.title}
                    className="text-3xl font-black text-slate-900"
                  />
                </div>
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  Ready in ~20 Mins
                </span>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Players</p>
                  <p className="text-sm font-black text-slate-900">{playersLabel}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Difficulty</p>
                  <p className="text-sm font-black text-slate-900">{complexityLabel}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vibe / Spice</p>
                  <p className="text-sm font-black text-slate-900">{spiceLabel}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Game Time</p>
                  <p className="text-sm font-black text-slate-900">
                    {mystery.complexity === 'easy'
                      ? '1–2 Hours'
                      : mystery.complexity === 'hard'
                      ? '3–4 Hours'
                      : '2–3 Hours'}
                  </p>
                </div>
              </div>

              {/* Personalization Highlight */}
              <div
                className="p-4 rounded-2xl mb-6 border"
                style={{ background: 'rgba(254,4,198,0.04)', borderColor: 'rgba(254,4,198,0.15)' }}
              >
                <p className="text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5">
                  <span style={{ color: '#fe04c6' }}>✦</span>{' '}
                  {isRealityGlam
                    ? 'Your Group Chat, Main-Character Edition'
                    : 'Built Around Your Guest Roster'}
                </p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {isRealityGlam
                    ? 'Cast your actual friends as the bombshells, exes, and producers — their names, initials, pronouns, and real-life quirks drop straight into the leaked DMs, burn-book notes, and backstage voice memos.'
                    : 'Cast your saved friends into these roles — their names, avatars, and personal quirks are woven straight into the clues, text threads, and character booklets.'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <Link
                href={`/${locale}/mysteries/${slug}/cast`}
                className="block w-full py-4 rounded-2xl font-black text-sm text-white text-center transition-all hover:opacity-95 shadow-lg active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                  boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                }}
              >
                Select Guests &amp; Lock In Cast →
              </Link>
              <Link
                href={`/${locale}/pricing`}
                className="block w-full py-2.5 rounded-2xl font-bold text-xs text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-center transition-colors"
              >
                Or unlock all mysteries with Unlimited Monthly Pass (
                <PriceDisplay tier="subscribe" locale={locale as Locale} className="font-black" />
                /mo)
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Visual Mood Board */}
      <MysteryMoodboard
        photos={moodboardPhotos}
        mysteryTitle={mystery.title}
        theme={mystery.theme}
      />

      {/* Story Blurb + Perfect For */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#fe04c6' }}>
            {isRealityGlam ? '📱 "I\'ve Got A Text!" • The Official Tea' : 'The Official Blurb'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-5">
            {isRealityGlam ? 'Spotted at the Reunion...' : 'The Story & Setting'}
          </h2>
          <div className="space-y-4 text-slate-600 font-medium leading-relaxed text-base">
            {(mystery.description || '')
              .split('\n')
              .filter(Boolean)
              .map((paragraph: string, idx: number) => (
                <p key={idx}>{replacePlaceholderNamesWithRoles(paragraph, characters)}</p>
              ))}
          </div>

          {/* How Your Guests Fit In */}
          <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50">
              <p className="text-xs font-black text-slate-900 mb-1">
                {isRealityGlam ? '1. Couple Up Your Cast' : '1. Pick Your Cast'}
              </p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {isRealityGlam
                  ? 'Assign your friends to the 9 iconic reality-TV roles below — from The Star to The Bitter Ex and The Superfan.'
                  : 'Assign your saved guests to the character archetypes below, or let us auto-cast them based on their vibe.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50">
              <p className="text-xs font-black text-slate-900 mb-1">
                {isRealityGlam ? '2. Drop The Receipts' : '2. Weave In Quirks'}
              </p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {isRealityGlam
                  ? 'Their real names, initials, pronouns, and quirks appear inside leaked group chats, Fininsta posts, and voice memos.'
                  : 'Their real-life obsessions and quirks appear inside text message clues, receipts, and alibis.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50">
              <p className="text-xs font-black text-slate-900 mb-1">
                {isRealityGlam ? '3. Main-Character Reveal' : '3. Host Plays Too'}
              </p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {isRealityGlam
                  ? 'The killer is sealed until Round 4, so the host can sip martinis, stir the pot, and play completely spoiler-free.'
                  : 'The killer is sealed until the final reveal round, so you can play alongside your guests spoiler-free.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Best For + What's Included */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
              Perfect For
            </p>
            <div className="flex flex-wrap gap-2">
              {occasions.map((occ) => (
                <span
                  key={occ}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700"
                >
                  {occ.match(/^[\p{Emoji}]/u) ? occ : `✨ ${occ}`}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
              What&apos;s Included in the Kit
            </p>
            <ul className="space-y-3 text-xs font-bold text-slate-700">
              {(isRealityGlam
                ? [
                    '9 Custom Bombshell & VIP Character Booklets',
                    'Leaked Group-Chat Threads, DMs & Fininsta Posts',
                    'Backstage Voice Memos, Paparazzi Stills & Call Sheets',
                    'It-Girl Dress Code & Signature Cocktail Guide',
                    'Spoiler-Free Host Mode (Play & Sip Alongside Your Guests)',
                    'Final Rose / Accusation Voting Cards & Killer Reveal',
                  ]
                : [
                    'Personalized Character Booklets & Backstories',
                    'iMessage / Chat Thread Clues & Thermal Receipts',
                    'Forensic Reports, Crime Scene Photos & CCTV Clues',
                    'Round-by-Round Spoiler-Free Host Guide',
                    'Custom Guest Invitations & Costume Guides',
                    'Final Accusation Voting Cards & Killer Reveal',
                  ]
              ).map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shrink-0 mt-0.5"
                    style={{ background: '#fe04c6' }}
                  >
                    ✓
                  </span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Character Types / Cast Roster Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#fe04c6' }}>
              {isRealityGlam
                ? `💋 Meet The Bombshells & Villains (${characters.length} Roles)`
                : `Meet The Cast (${characters.length} Roles)`}
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {isRealityGlam ? 'The Reunion Cast & Dress Code' : 'Character Types & Archetypes'}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Each archetype below is assigned to a guest from your roster and customized with their name, avatar, and quirks.
            </p>
          </div>
          <span className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black text-slate-600 shrink-0">
            🔒 100% Spoiler-Free Preview
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((char: any) => {
            const pres = getCleanCharacterPresentation(char, characters, { mode: 'generic' });
            const genderBadge = formatGenderBadge(char.gender);

            return (
              <div
                key={char.id}
                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                  pres.isVictim
                    ? 'bg-pink-50/35 border-pink-200/80'
                    : 'bg-slate-50/60 border-slate-100 hover:bg-white'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        pres.isVictim
                          ? 'bg-brand-pink text-white'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      {pres.isVictim ? '💀 The Story Catalyst' : '🕵️ Playable Suspect'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${genderBadge.colorClass}`}
                    >
                      {genderBadge.label}
                    </span>
                  </div>

                  {/* Role Title */}
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {pres.roleTitle}
                    </h3>
                  </div>

                  {/* Clean Character Blurb */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-100 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                      📖 The Character Blurb
                    </p>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {pres.shortBlurb}
                    </p>

                    {pres.actBullets.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          🎭 How to Play Them
                        </p>
                        <ul className="space-y-1">
                          {pres.actBullets.slice(0, 2).map((bullet, idx) => (
                            <li
                              key={idx}
                              className="text-[11px] text-slate-600 font-medium flex items-start gap-1.5 leading-snug"
                            >
                              <span className="text-brand-pink font-black">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clean Wardrobe / Costume Box */}
                <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      👗 What to Wear (Outfit Vibe)
                    </p>
                  </div>

                  {pres.outfitVariants ? (
                    <div className="space-y-2 text-xs text-slate-600 font-medium leading-snug">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink mr-1.5">
                          ♀ Feminine:
                        </span>
                        <span>{pres.outfitVariants.feminine}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 mr-1.5">
                          ♂ Masculine:
                        </span>
                        <span>{pres.outfitVariants.masculine}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {pres.outfitAdvice}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Reviews (Coming Soon) Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#fe04c6' }}>
                Community Feedback
              </p>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200">
                Coming Soon
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Host Reviews &amp; Party Photos
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Verified host ratings, party recaps, and group photos for <strong>{mystery.title}</strong> will appear here soon.
            </p>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 shrink-0">
            <span className="text-amber-400 text-lg">★★★★★</span>
            <div>
              <p className="text-xs font-black text-slate-900">Verified Host Reviews</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Launching Soon</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-75">
          {[
            {
              quote:
                'Having our friends’ actual quirks show up inside the text message clues had the entire room crying laughing within ten minutes.',
              host: 'Early Playtest Host',
              tag: 'Group of 10 Players',
            },
            {
              quote:
                'The character archetypes were so easy to cast from my saved guest list, and I finally got to play without knowing who the killer was!',
              host: 'Beta Mystery Host',
              tag: 'Birthday Dinner Party',
            },
            {
              quote:
                'Everyone committed 110% to the wardrobe suggestions. Best party night we have hosted all year.',
              host: 'Early Playtest Host',
              tag: 'Weekend Getaway',
            },
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="text-amber-400 text-xs mb-3">★★★★★</div>
                <p className="text-xs text-slate-600 font-medium italic leading-relaxed mb-4">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                <span className="text-xs font-black text-slate-800">{item.host}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
