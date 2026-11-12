'use client';

import React, { useState } from 'react';
import { MoodboardPhoto, isRealityReunionMystery } from '@/utils/moodboard';

interface MysteryMoodboardProps {
  photos: MoodboardPhoto[];
  mysteryTitle: string;
  theme?: string | null;
  compact?: boolean;
}

export function MysteryMoodboard({
  photos,
  mysteryTitle,
  theme,
  compact = false,
}: MysteryMoodboardProps) {
  const [layoutMode, setLayoutMode] = useState<'bento' | 'polaroid'>('bento');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const isRealityGlam = isRealityReunionMystery(theme, mysteryTitle);
  const activePhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  const rotations = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-1', 'rotate-1'];

  return (
    <div
      className={`rounded-[2.5rem] border p-8 sm:p-10 shadow-sm overflow-hidden ${
        isRealityGlam
          ? 'bg-gradient-to-br from-white via-pink-50/35 to-fuchsia-50/30 border-pink-100'
          : 'bg-white border-slate-100'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: '#fe04c6' }}
            >
              {isRealityGlam ? '💋 XOXO • Villa Meets Penthouse' : '✦ The Vibe & Aesthetic'}
            </span>
            {theme && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  isRealityGlam
                    ? 'bg-pink-100/80 text-brand-pink border border-pink-200/60'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {theme}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {isRealityGlam ? 'The Vibe Check & Mood Board' : 'Visual Mood Board'}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {isRealityGlam ? (
              <>
                Think <strong>Gossip Girl</strong> meets <strong>Love Island</strong> - rooftop infinity pools, rosé champagne towers, 35mm paparazzi flash, and group-chat receipts.
              </>
            ) : (
              <>
                Step inside the world of <strong>{mysteryTitle}</strong> - setting inspiration, dress code energy, and party atmosphere.
              </>
            )}
          </p>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setLayoutMode('bento')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              layoutMode === 'bento'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {isRealityGlam ? '✨ VIP Feed' : 'Editorial Grid'}
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('polaroid')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              layoutMode === 'polaroid'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {isRealityGlam ? '📸 Burn Book Polaroids' : 'Polaroid Board'}
          </button>
        </div>
      </div>

      {/* Mood Board Collage */}
      {layoutMode === 'bento' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 auto-rows-[220px] sm:auto-rows-[240px]">
          {photos.map((photo, idx) => {
            // Dynamic editorial bento spans based on index and total count
            let spanClass = 'lg:col-span-4';
            if (photos.length === 1) {
              spanClass = 'sm:col-span-2 lg:col-span-12 row-span-2';
            } else if (photos.length === 2) {
              spanClass = 'lg:col-span-6 row-span-2';
            } else if (photos.length === 3) {
              spanClass = idx === 0 ? 'sm:col-span-2 lg:col-span-7 row-span-2' : 'lg:col-span-5';
            } else if (photos.length === 4) {
              spanClass =
                idx === 0
                  ? 'sm:col-span-2 lg:col-span-7 row-span-2'
                  : idx === 1
                  ? 'lg:col-span-5'
                  : idx === 2
                  ? 'lg:col-span-5'
                  : 'sm:col-span-2 lg:col-span-12';
            } else if (photos.length === 5) {
              spanClass =
                idx === 0
                  ? 'sm:col-span-2 lg:col-span-7 row-span-2'
                  : idx === 1 || idx === 2
                  ? 'lg:col-span-5'
                  : 'lg:col-span-6';
            } else {
              // 6 or more photos: classic magazine bento layout
              const pattern = idx % 6;
              if (pattern === 0) spanClass = 'sm:col-span-2 lg:col-span-7 row-span-2';
              else if (pattern === 1) spanClass = 'lg:col-span-5';
              else if (pattern === 2) spanClass = 'lg:col-span-5';
              else if (pattern === 3) spanClass = 'lg:col-span-4';
              else if (pattern === 4) spanClass = 'lg:col-span-4';
              else spanClass = 'lg:col-span-4';
            }

            return (
              <button
                key={photo.id || idx}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className={`group relative rounded-3xl overflow-hidden bg-slate-900 text-left focus:outline-none shadow-sm hover:shadow-xl transition-all duration-500 ${spanClass}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || photo.tag || `${mysteryTitle} mood photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{
                    background: isRealityGlam
                      ? 'linear-gradient(to top, rgba(24,8,28,0.82) 0%, rgba(254,4,198,0.08) 45%, transparent 100%)'
                      : 'linear-gradient(to top, rgba(15,12,18,0.82) 0%, rgba(15,12,18,0.15) 50%, transparent 100%)',
                  }}
                />
                {photo.tag && (
                  <span
                    className="absolute top-4 left-4 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md shadow-md"
                    style={
                      isRealityGlam
                        ? {
                            background: 'linear-gradient(135deg, rgba(254,4,198,0.88) 0%, rgba(192,38,211,0.88) 100%)',
                            border: '1px solid rgba(255,255,255,0.35)',
                          }
                        : {
                            background: 'rgba(17,17,17,0.65)',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }
                    }
                  >
                    {photo.tag}
                  </span>
                )}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                  {photo.caption ? (
                    <p className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-sm">
                      {photo.caption}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Polaroid Pinboard Mode */
        <div
          className="p-6 sm:p-10 rounded-[2rem] border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          style={{
            background:
              'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.07) 1px, transparent 0) 0 0 / 20px 20px, #faf8f5',
          }}
        >
          {photos.map((photo, idx) => {
            const rot = rotations[idx % rotations.length];
            return (
              <button
                key={photo.id || idx}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className={`group bg-white p-3.5 pb-5 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform ${rot} hover:rotate-0 hover:-translate-y-1 text-left relative border border-slate-100`}
              >
                {/* Decorative pin */}
                <div
                  className="w-3.5 h-3.5 rounded-full mx-auto -mt-1.5 mb-2.5 shadow-inner border border-white"
                  style={{ background: '#fe04c6' }}
                />
                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 mb-3 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || photo.tag || `${mysteryTitle} polaroid ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {photo.tag && (
                  <span
                    className="inline-block text-[9px] font-black uppercase tracking-widest mb-1"
                    style={{ color: '#fe04c6' }}
                  >
                    {photo.tag}
                  </span>
                )}
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  {photo.caption || `${mysteryTitle} - Scene #${idx + 1}`}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.url}
                alt={activePhoto.caption || activePhoto.tag || mysteryTitle}
                className="max-h-[75vh] w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/15 transition-colors"
              >
                ✕
              </button>
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/15 transition-colors"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/15 transition-colors"
                  >
                    →
                  </button>
                </>
              )}
            </div>
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 text-white">
              <div>
                {activePhoto.tag && (
                  <span
                    className="inline-block text-[10px] font-black uppercase tracking-widest mb-1"
                    style={{ color: '#fe04c6' }}
                  >
                    {activePhoto.tag}
                  </span>
                )}
                <p className="text-sm font-bold text-slate-200">
                  {activePhoto.caption || `${mysteryTitle} - Mood Board Photo ${lightboxIndex + 1} of ${photos.length}`}
                </p>
              </div>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                {lightboxIndex + 1} / {photos.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
