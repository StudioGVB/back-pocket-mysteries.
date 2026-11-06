'use client';

import React from 'react';
import { parseCallSheetClue, stripCustomerFacingTitle } from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function CallSheetClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || 'Production Call Sheet';
  const title = stripCustomerFacingTitle(rawTitle) || 'Production Call Sheet';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseCallSheetClue(title, rawText);

  return (
    <div className="w-full space-y-3">
      {showImage && clue.static_image_url && (
        <div
          className={`relative w-full ${
            compact ? 'h-32' : 'h-44'
          } rounded-2xl overflow-hidden border border-amber-500/20 bg-slate-950`}
        >
          <img
            src={clue.static_image_url}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2.5 left-3 px-2.5 py-0.5 rounded-full bg-black/75 border border-amber-400/30 text-[9px] font-black uppercase tracking-widest text-amber-300 backdrop-blur-md">
            📋 Backstage Call Sheet
          </div>
        </div>
      )}

      {/* Wooden/Metal Clipboard Container */}
      <div className="w-full rounded-2xl bg-[#3d2b1f] p-2.5 border border-amber-900/50 shadow-2xl">
        {/* Metallic Clipboard Clip at Top */}
        <div className="mx-auto w-24 h-3.5 -mt-1 mb-2 rounded-t-md bg-gradient-to-b from-stone-300 to-stone-500 border border-stone-600 shadow-md flex items-center justify-center">
          <div className="w-10 h-1 rounded-full bg-stone-700/60" />
        </div>

        {/* Call Sheet Paper */}
        <div className="rounded-lg bg-[#faf7f0] text-stone-900 p-4 font-mono space-y-3 shadow-inner">
          <div className="border-b-2 border-stone-900 pb-2 flex items-start justify-between gap-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-red-700">
                PRODUCTION CREW DIRECTIVE
              </div>
              <div className="text-xs font-black uppercase text-stone-950 mt-0.5 break-words">
                {parsed.headerTitle}
              </div>
            </div>
            <span className="px-2 py-0.5 bg-red-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xs shrink-0">
              CREW ONLY
            </span>
          </div>

          {/* Bullet Directives */}
          {parsed.directives.length > 0 && (
            <div className="space-y-1.5 text-xs">
              {parsed.directives.map((dir, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 py-1 border-b border-stone-200 last:border-b-0"
                >
                  <span className="font-black text-red-700 shrink-0">▪</span>
                  <span className="font-semibold text-stone-900 break-words leading-snug">
                    {dir}
                  </span>
                </div>
              ))}
            </div>
          )}

          {parsed.footerDirective && (
            <div className="text-xs font-black uppercase tracking-wider text-stone-800 pt-1">
              {parsed.footerDirective}
            </div>
          )}

          {/* Pinned Yellow Sticky Note at Bottom */}
          {parsed.stickyNote && (
            <div className="mt-3 -rotate-1 rounded-md bg-[#fef08a] border border-yellow-400/90 p-3.5 shadow-md text-stone-900 font-serif italic">
              <div className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-900/70 not-italic mb-1">
                📌 Handwritten Sticky Note Attached:
              </div>
              <p className="text-xs leading-relaxed break-words">
                &ldquo;{parsed.stickyNote}&rdquo;
              </p>
              {parsed.stickyAuthor && (
                <div className="text-right text-xs font-bold text-stone-900 mt-1">
                  {parsed.stickyAuthor}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
