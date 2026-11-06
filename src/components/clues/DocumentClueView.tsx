'use client';

import React from 'react';
import { parseDocumentClue, stripCustomerFacingTitle } from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function DocumentClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || 'Evidence Document';
  const title = stripCustomerFacingTitle(rawTitle) || 'Evidence Document';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseDocumentClue(title, rawText);

  const bodyLines = parsed.body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const isSearchLog =
    parsed.department.includes('FORENSICS') ||
    /search history|recent tabs/i.test(rawText);
  const isChecklist =
    /to do:/i.test(rawText) || /\[strikethrough\]/i.test(rawText);

  let inHandwrittenSection = false;

  return (
    <div className="w-full space-y-3">
      {/* Optional Atmospheric Crime Scene Photo */}
      {showImage && clue.static_image_url && (
        <div className={`relative w-full ${compact ? 'h-32' : 'h-44'} rounded-2xl overflow-hidden border border-white/10 bg-slate-950`}>
          <img
            src={clue.static_image_url}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2.5 left-3 px-2.5 py-0.5 rounded-full bg-black/65 border border-white/10 text-[9px] font-black uppercase tracking-widest text-amber-200 backdrop-blur-md">
            📑 Case File Exhibit
          </div>
        </div>
      )}

      {/* Forensic Case-File Container */}
      <div className="relative w-full rounded-xl overflow-hidden bg-[#f8f5ec] text-stone-900 border-2 border-stone-300 shadow-xl p-4 font-mono">
        {/* Rotated (-12deg) Semi-Transparent Red Watermark Stamp */}
        <div className="pointer-events-none select-none absolute top-5 right-3 -rotate-12 border-[2px] border-red-700/25 text-red-700/25 px-2.5 py-0.5 rounded-sm font-black text-xs tracking-[0.2em] uppercase z-10">
          {parsed.stamp}
        </div>

        {/* Formal Department / Case Reference Header */}
        <div className="border-b-2 border-stone-800 pb-2.5 mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-500">
              {parsed.department}
            </div>
            <div className="text-xs font-black uppercase tracking-tight text-stone-950 mt-0.5 font-serif leading-snug break-words">
              {parsed.subject}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block bg-stone-900 text-amber-50 text-[9px] font-black px-2 py-0.5 rounded-xs tracking-widest">
              {parsed.caseRef}
            </span>
          </div>
        </div>

        {/* Structured Metadata Grid (only shown when explicit metadata fields exist) */}
        {(parsed.hasExplicitDate || parsed.sections.length > 0) && (
          <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-stone-200/60 border border-stone-300 rounded-md p-2.5 mb-3">
            {parsed.hasExplicitDate && (
              <div className="col-span-2">
                <span className="font-black text-stone-500 mr-1.5">DATE / TIME:</span>
                <span className="font-bold text-stone-900">{parsed.date}</span>
              </div>
            )}
            {parsed.sections.map((sec, idx) => (
              <div
                key={idx}
                className={`col-span-2 ${
                  idx > 0 || parsed.hasExplicitDate ? 'border-t border-stone-300/80 pt-1' : ''
                } break-words`}
              >
                <span className="font-black text-stone-500 mr-1.5">{sec.label}:</span>
                <span className="font-semibold text-stone-900">{sec.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* Structured Findings / Document Body */}
        <div className="space-y-1.5">
          {bodyLines.map((line, idx) => {
            // Check for section subheaders like "Recent Tabs / Search History:", "To do:", "Handwritten Note at Bottom:", "Post Grid Captions:"
            if (/^[A-Za-z0-9\s\/\-()]{3,42}:$/.test(line)) {
              if (/handwritten/i.test(line)) {
                inHandwrittenSection = true;
              }
              return (
                <div
                  key={idx}
                  className="text-[10px] font-black uppercase tracking-wider text-stone-600 pt-1.5 border-t border-stone-300/70 first:border-t-0 first:pt-0 font-mono"
                >
                  {line}
                </div>
              );
            }

            // Check for WARNING: banner (e.g. Prescription label warning)
            if (/^WARNING\s*:/i.test(line)) {
              return (
                <div
                  key={idx}
                  className="mt-2 px-2.5 py-1.5 rounded bg-red-900/10 border border-red-700/40 text-[11px] font-bold text-red-900 leading-snug font-mono"
                >
                  ⚠️ {line}
                </div>
              );
            }

            // Check for ERROR: banner (e.g. Server audit log error)
            if (/^ERROR\s*:/i.test(line)) {
              return (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded bg-red-950/15 border border-red-800/40 text-[10px] font-black uppercase tracking-wider text-red-800 font-mono"
                >
                  ⛔ {line}
                </div>
              );
            }

            // Check for bullet items (• or - at start)
            if (/^[•\-*]\s+/.test(line)) {
              const rawBullet = line.replace(/^[•\-*]\s+/, '').trim();
              const isStruck = /\[strikethrough\]/i.test(rawBullet);
              const cleanBullet = rawBullet.replace(/\s*\[strikethrough\]\s*/gi, '').trim();

              if (isSearchLog) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1 rounded bg-white/80 border border-stone-300/90 text-[11px] font-mono text-stone-900 shadow-2xs"
                  >
                    <span className="text-[10px] text-stone-400 shrink-0">🔍</span>
                    <span className="break-words">{cleanBullet}</span>
                  </div>
                );
              }

              if (isChecklist) {
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs font-serif leading-snug py-0.5"
                  >
                    <span className="font-mono text-xs shrink-0 mt-0.5">
                      {isStruck ? '☑' : '☐'}
                    </span>
                    <span
                      className={`break-words ${
                        isStruck
                          ? 'line-through text-stone-500 decoration-stone-600/80'
                          : 'font-semibold text-stone-950'
                      }`}
                    >
                      {cleanBullet}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs font-serif leading-snug text-stone-900 pl-1"
                >
                  <span className="text-stone-500 font-bold shrink-0">•</span>
                  <span className="break-words">{cleanBullet}</span>
                </div>
              );
            }

            // Handwritten note callout styling
            if (inHandwrittenSection) {
              return (
                <div
                  key={idx}
                  className="px-3 py-2 rounded bg-amber-100/70 border-l-2 border-amber-700/60 text-xs italic font-serif text-stone-900 leading-relaxed break-words"
                >
                  {line}
                </div>
              );
            }

            // Regular line (also handle inline [strikethrough] if present)
            const hasStrike = /\[strikethrough\]/i.test(line);
            const cleanLine = line.replace(/\s*\[strikethrough\]\s*/gi, '').trim();

            return (
              <div
                key={idx}
                className={`text-xs leading-relaxed text-stone-900 font-serif break-words ${
                  hasStrike ? 'line-through text-stone-500' : ''
                }`}
              >
                {cleanLine}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
