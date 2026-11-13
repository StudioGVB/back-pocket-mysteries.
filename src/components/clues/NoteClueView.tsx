'use client';

import React from 'react';
import { parseNoteClue, stripCustomerFacingTitle } from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function NoteClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || 'Personal Note';
  const title = stripCustomerFacingTitle(rawTitle) || 'Personal Note';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseNoteClue(title, rawText);

  const isDigitalNote = parsed.variant === 'checklist' || parsed.variant === 'phone_note';

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
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute top-2.5 left-3 px-2.5 py-0.5 rounded-full bg-black/75 border border-amber-400/30 text-[9px] font-black uppercase tracking-widest text-amber-300 backdrop-blur-md">
            📝 {isDigitalNote ? 'Phone Notes App' : 'Recovered Personal Note'}
          </div>
        </div>
      )}

      {isDigitalNote ? (
        /* Apple Notes Dark/Amber Style Container */
        <div className="w-full rounded-2xl overflow-hidden bg-[#161512] border border-amber-500/25 shadow-xl text-stone-100 font-sans">
          <div className="bg-[#211f1a] border-b border-amber-500/15 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <span>‹</span>
              <span>Notes</span>
            </div>
            <span className="text-[10px] font-mono text-stone-400 truncate">
              {parsed.date || 'Edited Just Now'}
            </span>
            <span className="text-amber-400 text-xs font-bold">•••</span>
          </div>

          <div className="p-4 space-y-3">
            <div className="text-sm font-black text-white tracking-tight">
              {parsed.headerTitle}
            </div>

            {parsed.items.length > 0 && (
              <div className="space-y-2 pt-1">
                {parsed.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs leading-snug"
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 border ${
                        item.checked
                          ? 'bg-amber-400 border-amber-400 text-stone-950 font-black'
                          : 'border-stone-500 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`break-words ${
                        item.checked
                          ? 'line-through text-stone-500 decoration-stone-500'
                          : 'text-stone-100 font-semibold'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {parsed.paragraphs.length > 0 && (
              <div className="space-y-2 text-xs text-stone-200 leading-relaxed whitespace-pre-line break-words">
                {parsed.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            )}

            {parsed.signature && (
              <div className="text-right text-xs font-black text-amber-400 pt-1">
                {parsed.signature}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Textured Lined Journal / Torn Note Container */
        <div
          className="relative w-full rounded-xl overflow-hidden bg-[#fcf8ec] text-stone-900 border border-amber-900/25 shadow-xl p-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(transparent, transparent 25px, rgba(180, 150, 110, 0.22) 26px)',
          }}
        >
          {/* Red Margin Line */}
          <div className="pointer-events-none absolute top-0 bottom-0 left-7 w-[1px] bg-rose-400/40" />

          <div className="pl-5 space-y-2.5 relative z-10">
            <div className="flex items-center justify-between gap-2 border-b border-stone-300/80 pb-1.5">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-stone-500">
                📝 {parsed.headerTitle}
              </span>
              {parsed.date && (
                <span className="text-[10px] font-mono text-stone-500">
                  {parsed.date}
                </span>
              )}
            </div>

            {parsed.recoveredFrom && (
              <div className="px-2.5 py-1 rounded bg-stone-900/5 border border-stone-400/40 text-[10px] font-mono font-bold text-stone-600 not-italic leading-snug">
                📍 RECOVERED: {parsed.recoveredFrom}
              </div>
            )}

            <div className="space-y-2 text-xs font-serif italic text-stone-900 leading-[26px] break-words">
              {parsed.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            {parsed.signature && (
              <div className="text-right text-xs font-serif font-bold italic text-stone-800 pt-1">
                {parsed.signature}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
