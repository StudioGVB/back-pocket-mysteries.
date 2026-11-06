'use client';

import React from 'react';
import { parseSocialClue, stripCustomerFacingTitle } from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function SocialClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || 'Social Media Post';
  const title = stripCustomerFacingTitle(rawTitle) || 'Social Media Post';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseSocialClue(title, rawText);

  return (
    <div className="w-full space-y-3">
      {showImage && clue.static_image_url && (
        <div
          className={`relative w-full ${
            compact ? 'h-32' : 'h-44'
          } rounded-2xl overflow-hidden border border-pink-500/20 bg-slate-950`}
        >
          <img
            src={clue.static_image_url}
            alt={title}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d14] via-transparent to-transparent" />
          <div className="absolute top-2.5 left-3 px-2.5 py-0.5 rounded-full bg-black/75 border border-pink-500/30 text-[9px] font-black uppercase tracking-widest text-pink-300 backdrop-blur-md">
            📱 {parsed.isDraft ? 'Unposted Social Draft' : 'Social Profile Capture'}
          </div>
        </div>
      )}

      {/* Instagram / TikTok Dark-Mode App Container */}
      <div className="w-full rounded-2xl overflow-hidden bg-[#0b0d14] border border-slate-800/90 shadow-2xl font-sans text-slate-100">
        {/* Top App Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-[#131124] to-slate-900 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shrink-0">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[10px] font-black text-white">
                {parsed.handle.replace(/^@/, '').slice(0, 2).toUpperCase() || 'IG'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white truncate">
                {parsed.isDraft ? title : parsed.handle}
              </div>
              <div className="text-[10px] font-medium text-pink-400 truncate">
                {parsed.isDraft
                  ? `Saved Draft${parsed.draftTime ? ` • ${parsed.draftTime}` : ''}`
                  : 'Public Fanpage Account'}
              </div>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
              parsed.isDraft
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-pink-500/15 text-pink-300 border border-pink-500/30'
            }`}
          >
            {parsed.isDraft ? 'DRAFT' : 'FOLLOWING'}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Profile Stats Bar (Posts / Followers / Following) */}
          {parsed.stats && parsed.stats.length > 0 && (
            <div className="grid grid-cols-3 gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
              {parsed.stats.map((st, idx) => {
                const parts = st.split(/\s+/);
                const num = parts[0] || '';
                const label = parts.slice(1).join(' ') || '';
                return (
                  <div key={idx} className="flex flex-col">
                    <span className="text-xs font-black text-white">{num}</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Profile Bio */}
          {parsed.bio && (
            <div className="px-3 py-2 rounded-xl bg-slate-900/50 border border-slate-800/70 text-xs text-slate-200 leading-relaxed break-words">
              {parsed.bio}
            </div>
          )}

          {/* Main Draft Caption */}
          {parsed.mainCaption && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-[#131626] border border-slate-800 text-xs font-medium text-white leading-relaxed whitespace-pre-line break-words shadow-inner">
              {parsed.mainCaption}
            </div>
          )}

          {/* Hashtag Pills */}
          {parsed.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsed.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/25 text-[10px] font-bold text-pink-300"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}

          {/* Location & Audio Metadata Pills */}
          {(parsed.location || parsed.audioSelected) && (
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-[11px]">
              {parsed.location && (
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-rose-400 shrink-0">📍</span>
                  <span className="truncate">{parsed.location}</span>
                </div>
              )}
              {parsed.audioSelected && (
                <div className="flex items-center gap-2 text-cyan-300 font-medium">
                  <span className="shrink-0">🎵</span>
                  <span className="truncate">Audio: {parsed.audioSelected}</span>
                </div>
              )}
            </div>
          )}

          {/* Post Grid Captions (2-column feed cards) */}
          {parsed.captions.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Recent Post Grid Captions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {parsed.captions.map((cap, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-200 leading-snug break-words flex flex-col justify-between gap-1.5"
                  >
                    <span>{cap}</span>
                    <span className="text-[9px] font-mono text-pink-400/80">
                      ♥ {(idx + 2) * 142} likes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
