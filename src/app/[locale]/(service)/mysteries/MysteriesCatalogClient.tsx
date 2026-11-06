'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import { Locale } from '@/lib/i18n-config';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  getEffectiveCoverUrl,
  getEffectiveMoodboardPhotos,
  isRealityReunionMystery,
} from '@/utils/moodboard';

interface PublishedMystery {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  image_url: string | null;
  min_players: number;
  max_players: number;
  complexity: 'easy' | 'medium' | 'hard' | null;
  spice_level?: string | null;
}

export default function MysteriesCatalogClient({
  mysteries,
  locale,
}: {
  mysteries: PublishedMystery[];
  locale: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');

  // Extract unique themes/categories from published mysteries
  const categories = Array.from(
    new Set(mysteries.map((m) => m.theme).filter((t): t is string => Boolean(t)))
  );

  const filteredMysteries =
    selectedCategory === 'All Categories'
      ? mysteries
      : mysteries.filter((m) => m.theme === selectedCategory);

  const getTierForComplexity = (complexity: string | null): 'basic' | 'premium' | 'grand' => {
    if (complexity === 'easy') return 'basic';
    if (complexity === 'hard') return 'grand';
    return 'premium';
  };

  const getGameTimeForComplexity = (complexity: string | null): string => {
    if (complexity === 'easy') return '1–2 Hours';
    if (complexity === 'hard') return '3–4 Hours';
    return '2–3 Hours';
  };

  return (
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">Available Stories</h1>
          <p className="text-slate-500 font-medium text-lg">
            Pick a theme and customize it for your crew — ready in ~30 minutes.
          </p>
        </div>

        <div className="flex gap-4">
          <CustomSelect
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="min-w-[200px] px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:border-slate-300 focus:outline-none transition-all shadow-sm"
          >
            <option value="All Categories">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      {filteredMysteries.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-900 via-brand-dark to-slate-900 text-white border border-brand-pink/30 rounded-[3rem] p-12 sm:p-20 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/35 text-brand-pink text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
            Dropping Shortly
          </div>
          <div className="w-20 h-20 bg-white/10 border border-white/15 rounded-3xl flex items-center justify-center text-3xl mb-6">
            🕵️‍♀️
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mb-3">
            Mysteries Coming Soon!
          </h3>
          <p className="text-slate-300 font-medium max-w-md text-base leading-relaxed mb-8">
            We&apos;re putting the final touches on our murder mystery party packages. <strong className="text-white">Check back shortly</strong> — our first playable stories will appear right here very soon!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/${locale}/account/profile`}
              className="px-8 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark transition-all shadow-xl"
            >
              + Pre-Add Your Guests →
            </Link>
            <Link
              href={`/${locale}/account`}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-full font-black uppercase tracking-widest text-xs transition-all"
            >
              Back to My Account
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredMysteries.map((mystery) => {
            const isRealityGlam = isRealityReunionMystery(mystery.theme, mystery.title);
            const playersLabel =
              mystery.min_players === mystery.max_players
                ? `${mystery.min_players} Players`
                : `${mystery.min_players}–${mystery.max_players} Players`;
            const complexityLabel = (mystery.complexity || 'medium').toUpperCase();
            const spiceLabel = isRealityGlam
              ? 'SPICY 🔥'
              : (mystery.spice_level || 'Mild').toUpperCase();
            const gameTimeLabel = getGameTimeForComplexity(mystery.complexity);

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
              <div
                key={mystery.id}
                className="group bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col"
              >
                <Link
                  href={`/${locale}/mysteries/${mystery.id}`}
                  className="aspect-video bg-slate-100 flex items-center justify-center shadow-inner overflow-hidden relative block"
                >
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt={mystery.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] group-hover:scale-105 transition-transform duration-700">
                      Mystery Cover
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-xl bg-emerald-50/95 backdrop-blur-sm text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                    Ready in ~30 Mins
                  </div>

                  {/* Mini Mood Board Thumbnail Strip */}
                  {moodboardPhotos.length > 0 && (
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center -space-x-2">
                        {moodboardPhotos.slice(0, 3).map((photo) => (
                          <div
                            key={photo.id}
                            className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-md bg-slate-800"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt={photo.caption || 'Mood board'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest border border-white/15">
                        📸 {moodboardPhotos.length} Vibe Photos
                      </span>
                    </div>
                  )}
                </Link>
                <div className="p-8 flex flex-col flex-grow justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-brand-pink/5 text-brand-pink rounded-full text-[10px] font-black uppercase tracking-widest">
                        {mystery.theme || 'Mystery'}
                      </span>
                      <PriceDisplay
                        tier={
                          mystery.max_players <= 6
                            ? 'basic'
                            : mystery.max_players <= 10
                            ? 'premium'
                            : 'grand'
                        }
                        locale={locale as Locale}
                        mysteryId={mystery.id}
                        mysteryTitle={mystery.title}
                        className="text-slate-900 font-black text-xl"
                      />
                    </div>
                    <Link href={`/${locale}/mysteries/${mystery.id}`}>
                      <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-brand-pink transition-colors">
                        {mystery.title}
                      </h3>
                    </Link>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6 line-clamp-3">
                      {mystery.description || 'Pick a theme and start your journey.'}
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* 2x2 Stats Grid (Players, Difficulty, Vibe/Spice, Game Time) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Players
                        </p>
                        <p className="text-xs font-black text-slate-900">{playersLabel}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Difficulty
                        </p>
                        <p className="text-xs font-black text-slate-900">{complexityLabel}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Vibe / Spice
                        </p>
                        <p className="text-xs font-black text-slate-900">{spiceLabel}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Game Time
                        </p>
                        <p className="text-xs font-black text-slate-900">{gameTimeLabel}</p>
                      </div>
                    </div>

                    <Link
                      href={`/${locale}/mysteries/${mystery.id}`}
                      className="block w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-center hover:bg-brand-pink transition-all shadow-lg active:scale-[0.98]"
                    >
                      View Details &amp; Build →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
