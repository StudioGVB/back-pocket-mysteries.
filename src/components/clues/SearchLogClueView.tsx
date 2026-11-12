'use client';

import React from 'react';
import { parseSearchLogClue, stripCustomerFacingTitle } from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function SearchLogClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || 'Digital Intercept Log';
  const title = stripCustomerFacingTitle(rawTitle) || 'Digital Intercept Log';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseSearchLogClue(title, rawText);

  return (
    <div className="w-full space-y-3">
      {showImage && clue.static_image_url && (
        <div
          className={`relative w-full ${
            compact ? 'h-32' : 'h-44'
          } rounded-2xl overflow-hidden border border-cyan-500/20 bg-slate-950`}
        >
          <img
            src={clue.static_image_url}
            alt={title}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d17] via-transparent to-transparent" />
          <div className="absolute top-2.5 left-3 px-2.5 py-0.5 rounded-full bg-black/75 border border-cyan-400/30 text-[9px] font-black uppercase tracking-widest text-cyan-300 backdrop-blur-md">
            💻 {parsed.mode === 'audit' ? 'Server Audit Log' : 'Search History Intercept'}
          </div>
        </div>
      )}

      {/* Dark Browser / Cyber Terminal Container */}
      <div className="w-full rounded-xl overflow-hidden bg-[#070b14] border border-cyan-500/25 shadow-2xl font-mono text-slate-100">
        {/* Browser Chrome Header with Traffic Light Dots & URL Bar */}
        <div className="bg-[#0d1424] border-b border-slate-800 px-3.5 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="flex-grow min-w-0 bg-[#060911] border border-slate-800/90 rounded-md px-2.5 py-1 flex items-center gap-2 text-[10px] text-cyan-300/90 truncate">
            <span className="text-emerald-400 shrink-0">🔒</span>
            <span className="truncate">{parsed.deviceOrUrl}</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* System Title Banner */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
                {parsed.systemName}
              </div>
              <div className="text-xs font-bold text-white mt-0.5 break-words">
                {title}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-[9px] font-black uppercase tracking-widest text-cyan-300 shrink-0">
              {parsed.mode === 'audit' ? 'SYS LOG' : 'LIVE DUMP'}
            </span>
          </div>

          {/* Red Alert Banner for Server Errors (e.g. ERROR: FILE UNFOUND) */}
          {parsed.errorBanner && (
            <div className="px-3 py-2 rounded-lg bg-rose-950/50 border border-rose-500/40 flex items-center gap-2 text-xs font-black text-rose-300 tracking-wider uppercase">
              <span>⛔</span>
              <span>ERROR: {parsed.errorBanner}</span>
            </div>
          )}

          {/* Key-Value Metadata Grid */}
          {parsed.metaRows.length > 0 && (
            <div className="bg-[#0c1322] border border-slate-800/90 rounded-lg p-2.5 space-y-1.5 text-[11px]">
              {parsed.metaRows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-baseline justify-between gap-3 border-b border-slate-800/60 last:border-b-0 pb-1 last:pb-0"
                >
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                    {row.label}:
                  </span>
                  <span className="text-right font-semibold text-cyan-100 break-words">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Search Queries / System Events List */}
          {parsed.queries.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                <span>
                  {parsed.mode === 'audit' ? 'Recorded System Events' : 'Recent Tabs / Search History'}
                </span>
                <span>{parsed.queries.length} Entries</span>
              </div>
              <div className="space-y-1.5">
                {parsed.queries.map((q, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                      q.isFlagged
                        ? 'bg-rose-950/30 border-rose-500/40 text-rose-100'
                        : 'bg-[#0d1526] border-slate-800/90 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] shrink-0 opacity-80">
                        {q.isFlagged ? '⚠️' : '🔍'}
                      </span>
                      <span className="break-words leading-snug">{q.text}</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 shrink-0">
                      ↗
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operator / Audit Note */}
          {parsed.note && (
            <div className="p-3 rounded-lg bg-slate-900/90 border-l-2 border-cyan-400 text-xs text-slate-200 leading-relaxed whitespace-pre-line break-words">
              <span className="block text-[9px] font-black uppercase tracking-widest text-cyan-400 mb-1">
                Log Annotation:
              </span>
              {parsed.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
