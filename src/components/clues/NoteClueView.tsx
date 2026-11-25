'use client';

import React from 'react';
import {
  extractPrimaryClueTimestamp,
  parseNoteClue,
  stripCustomerFacingTitle,
} from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function NoteClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || 'Personal Note';
  const title = stripCustomerFacingTitle(rawTitle) || 'Personal Note';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseNoteClue(title, rawText);
  const detectedTimestamp = extractPrimaryClueTimestamp(
    title,
    rawText,
    clue.internal_notes
  );

  const isDigitalNote = parsed.variant === 'checklist' || parsed.variant === 'phone_note';

  return (
    <div className="w-full space-y-3">
      {isDigitalNote ? (
        /* Apple Notes Dark/Amber Style Container */
        <div className="w-full rounded-2xl overflow-hidden bg-[#161512] border border-amber-500/25 shadow-xl text-stone-100 font-sans">
          <div className="bg-[#211f1a] border-b border-amber-500/15 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <span>‹</span>
              <span>Notes</span>
            </div>
            <div className="flex items-center gap-2">
              {detectedTimestamp && (
                <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[10px] font-mono font-black text-amber-300 uppercase">
                  🕒 {detectedTimestamp}
                </span>
              )}
              <span className="text-[10px] font-mono text-stone-400 truncate">
                {parsed.date || 'Edited'}
              </span>
            </div>
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
        /* Textured Lined Journal / Torn Note Container with Masking Tape & Handwritten Ink */
        <div className="relative pt-2">
          {/* Translucent Masking-Tape Strip at Top Center */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -rotate-2 w-28 h-5 bg-amber-200/75 border border-amber-400/40 shadow-xs z-20 rounded-[2px]" />

          <div
            className="relative w-full rounded-xl overflow-hidden bg-[#fcf8ec] text-stone-900 border border-amber-900/30 shadow-xl p-5 pt-6"
            style={{
              backgroundImage:
                'repeating-linear-gradient(transparent, transparent 25px, rgba(180, 150, 110, 0.24) 26px)',
            }}
          >
            {/* Red Vertical Margin Line */}
            <div className="pointer-events-none absolute top-0 bottom-0 left-7 w-[1.5px] bg-rose-400/45" />

            <div className="pl-5 space-y-2.5 relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300/80 pb-1.5">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-stone-600">
                  📝 {parsed.headerTitle}
                </span>
                <div className="flex items-center gap-1.5">
                  {detectedTimestamp && (
                    <span className="px-2 py-0.5 rounded bg-amber-300/80 border border-amber-600/40 text-stone-950 text-[9px] font-mono font-black uppercase tracking-wider">
                      🕒 {detectedTimestamp}
                    </span>
                  )}
                  {parsed.date && parsed.date !== detectedTimestamp && (
                    <span className="text-[10px] font-mono text-stone-500">
                      {parsed.date}
                    </span>
                  )}
                </div>
              </div>

              {parsed.recoveredFrom && (
                <div className="px-2.5 py-1.5 rounded-md bg-amber-900/8 border border-amber-900/20 text-[10px] font-mono font-bold text-stone-700 not-italic leading-snug">
                  📍 RECOVERED: {parsed.recoveredFrom}
                </div>
              )}

              <div className="space-y-2 text-[15px] font-['Caveat','Bradley_Hand','Segoe_Print','Georgia',cursive,serif] italic text-stone-900 leading-[26px] break-words">
                {parsed.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {parsed.signature && (
                <div className="text-right text-sm font-['Caveat','Bradley_Hand','Segoe_Print','Georgia',cursive,serif] font-bold italic text-stone-900 pt-1 underline decoration-stone-400/70 underline-offset-4">
                  {parsed.signature}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

