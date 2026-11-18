'use client';

import React from 'react';
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

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/90 shadow-xl text-slate-100">
      {/* Crime Scene Physical Evidence Photo */}
      {showImage && (
        <div className={`relative w-full ${compact ? 'aspect-[4/3]' : 'aspect-square'} bg-slate-900 overflow-hidden`}>
          {clue.static_image_url ? (
            <img
              src={clue.static_image_url}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center gap-2 select-none">
              <span className="text-3xl opacity-60">🔍</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Physical Evidence Prop
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 border border-white/15 text-[9px] font-black uppercase tracking-widest text-amber-300 backdrop-blur-md shadow-md">
            🔍 Physical Evidence
          </div>
        </div>
      )}

      {/* Evidence Tag & Optional Micro-Label */}
      <div className="px-4 py-3 space-y-1.5 bg-slate-950 border-t border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400/90">
            EXHIBIT • {title}
          </span>
          {clue.round_number && (
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 shrink-0">
              ROUND 0{clue.round_number}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs font-medium text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800/70 pt-1.5">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
