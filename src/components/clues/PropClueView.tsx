'use client';

import React, { useState } from 'react';
import { extractPrimaryClueTimestamp } from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function PropClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const title = hydratedTitle || clue.title || 'Physical Evidence';
  const description = (hydratedDescription ?? clue.description ?? '').trim();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const detectedTimestamp = extractPrimaryClueTimestamp(
    title,
    description,
    clue.internal_notes
  );

  return (
    <>
      <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/90 shadow-xl text-slate-100">
        {/* Crime Scene Physical Evidence Photo (Click to Zoom) */}
        {showImage && (
          <div
            onClick={(e) => {
              if (clue.static_image_url) {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }
            }}
            className={`relative w-full ${
              compact ? 'aspect-[4/3]' : 'aspect-square'
            } bg-slate-900 overflow-hidden ${
              clue.static_image_url ? 'cursor-zoom-in group' : ''
            }`}
          >
            {clue.static_image_url ? (
              <img
                src={clue.static_image_url}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center gap-2 select-none">
                <span className="text-3xl opacity-60">🔍</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Physical Evidence Prop
                </span>
              </div>
            )}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/75 border border-white/15 text-[9px] font-black uppercase tracking-widest text-amber-300 backdrop-blur-md shadow-md">
              🔍 Physical Evidence
            </div>

            {detectedTimestamp && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/80 border border-amber-400/40 text-[9px] font-mono font-black uppercase tracking-wider text-amber-300 backdrop-blur-md shadow-md">
                🕒 {detectedTimestamp}
              </div>
            )}

            {clue.static_image_url && (
              <div className="absolute bottom-2.5 right-3 px-2.5 py-1 rounded-full bg-black/75 border border-white/20 text-[9px] font-black uppercase tracking-wider text-white/90 backdrop-blur-md opacity-90 group-hover:opacity-100 group-hover:bg-brand-pink group-hover:border-brand-pink transition-all">
                🔍 Tap to Zoom
              </div>
            )}
          </div>
        )}

        {/* Evidence Tag & Optional Micro-Label */}
        <div className="px-4 py-3 space-y-1.5 bg-slate-950 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400/90">
              EXHIBIT • {title}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {!showImage && detectedTimestamp && (
                <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/35 text-[9px] font-mono font-black uppercase tracking-wider text-amber-300">
                  🕒 {detectedTimestamp}
                </span>
              )}
              {clue.round_number && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
                  ROUND 0{clue.round_number}
                </span>
              )}
            </div>
          </div>
          {description && (
            <p className="text-xs font-medium text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800/70 pt-1.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Full-Screen Forensic Photo Zoom Lightbox Modal */}
      {isLightboxOpen && clue.static_image_url && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsLightboxOpen(false);
          }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl text-slate-100"
          >
            <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">
                    🔍 FORENSIC PHOTO EXHIBIT
                  </span>
                  {detectedTimestamp && (
                    <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/35 text-[10px] font-mono font-black text-amber-300">
                      🕒 {detectedTimestamp}
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                  {title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center text-sm font-black transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="bg-black flex items-center justify-center max-h-[68vh] overflow-hidden">
              <img
                src={clue.static_image_url}
                alt={title}
                className="w-full max-h-[68vh] object-contain"
              />
            </div>

            {description && (
              <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
                {description}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

