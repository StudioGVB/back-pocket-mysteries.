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
        <div className={`relative w-full ${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'} bg-slate-900 overflow-hidden`}>
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
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 border border-white/10 text-[9px] font-black uppercase tracking-widest text-amber-300 backdrop-blur-md">
            🔍 Physical Evidence
          </div>
        </div>
      )}

      {/* Evidence Tag & Notes */}
      <div className="p-4 space-y-2 bg-slate-950">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400/90">
            EXHIBIT TAG • {title}
          </span>
          {clue.round_number && (
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              ROUND 0{clue.round_number}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-slate-200 leading-relaxed whitespace-pre-line">
          {description || 'No physical evidence notes provided.'}
        </p>
      </div>
    </div>
  );
}
