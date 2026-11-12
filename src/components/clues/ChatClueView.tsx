'use client';

import React from 'react';
import { parseChatClue, stripCustomerFacingTitle } from '@/utils/clue-format';

export interface ClueViewProps {
  clue: {
    id?: string;
    mystery_id?: string | null;
    title?: string | null;
    description?: string | null;
    static_image_url?: string | null;
    audio_url?: string | null;
    voice_region?: string | null;
    round_number?: number | null;
    clue_type?: string | null;
    format?: string | null;
    internal_notes?: string | null;
  };
  hydratedTitle?: string;
  hydratedDescription?: string;
  characters?: any[];
  compact?: boolean;
  showImage?: boolean;
}

export function ChatClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || '';
  const title = stripCustomerFacingTitle(rawTitle);
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseChatClue(title, rawText);
  const displayHeaderTitle = parsed.headerTitle || title || '🔒 Unknown Number';

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-[#0b101b] border border-slate-800/90 text-slate-100 shadow-xl font-sans">
      {/* Optional Atmospheric Scene Header Photo */}
      {showImage && clue.static_image_url && (
        <div className={`relative w-full ${compact ? 'h-32' : 'h-44'} overflow-hidden border-b border-slate-800/80`}>
          <img
            src={clue.static_image_url}
            alt={displayHeaderTitle}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b101b] via-[#0b101b]/30 to-transparent" />
          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              💬 Messages
            </span>
          </div>
        </div>
      )}

      {/* Messenger Top Bar */}
      <div className="bg-slate-900/95 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex -space-x-1.5 shrink-0">
            {(parsed.participants.length > 0 ? parsed.participants.slice(0, 2) : ['?']).map((p, i) => {
              const cleaned = p.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
              const emojiMatch = p.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
              const initials =
                p === '?'
                  ? '?'
                  : cleaned || (emojiMatch ? emojiMatch[0] : '?');
              return (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border border-slate-900 shadow-sm ${
                    i === 0
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {initials}
                </div>
              );
            })}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white leading-tight line-clamp-2">
              {displayHeaderTitle}
            </div>
            <div className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 truncate mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
              <span className="truncate">{parsed.threadTitle}</span>
            </div>
          </div>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 shrink-0">
          SMS
        </span>
      </div>

      {/* Message Bubbles Container */}
      <div className="p-3.5 space-y-2.5">
        {parsed.bubbles.map((bubble) => {
          if (bubble.isRedacted) {
            return (
              <div
                key={bubble.id}
                className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/90 text-[10px] font-mono text-slate-400 flex items-center justify-between gap-2 select-none"
              >
                <span className="uppercase tracking-wider text-[9px] text-slate-500 shrink-0">
                  Earlier Messages
                </span>
                <span className="tracking-widest text-slate-600 truncate">
                  ██████████████
                </span>
              </div>
            );
          }

          const showSenderLabel = !/^(sender|unknown|me|you|self|outgoing)$/i.test(
            bubble.sender.trim()
          );

          return (
            <div
              key={bubble.id}
              className={`flex items-end gap-2 ${
                bubble.isPrimary ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Sender Initial Avatar Pill */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 shadow-md ${
                  bubble.isPrimary
                    ? 'bg-emerald-600 text-white border border-emerald-400/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
                title={showSenderLabel ? bubble.sender : 'Message'}
              >
                {bubble.initials}
              </div>

              {/* Bubble + Metadata */}
              <div
                className={`flex flex-col max-w-[85%] min-w-0 ${
                  bubble.isPrimary ? 'items-end' : 'items-start'
                }`}
              >
                {showSenderLabel && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 px-1">
                    {bubble.sender}
                  </span>
                )}
                <div
                  className={`px-3 py-2 text-xs leading-relaxed font-medium shadow-md break-words ${
                    bubble.isPrimary
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-2xl rounded-br-xs'
                      : 'bg-slate-800/95 text-slate-100 border border-slate-700/70 rounded-2xl rounded-bl-xs'
                  }`}
                >
                  {bubble.message}
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1 text-[9px] font-mono text-slate-500">
                  {bubble.timestamp && (
                    <>
                      <span>{bubble.timestamp}</span>
                      <span>•</span>
                    </>
                  )}
                  <span className={bubble.isPrimary ? 'text-emerald-400/80' : 'text-slate-500'}>
                    {bubble.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
