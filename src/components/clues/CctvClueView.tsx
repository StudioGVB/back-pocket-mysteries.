'use client';

import React, { useState } from 'react';
import { parseCctvClue } from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

function resolveCctvImageUrl(clue: {
  static_image_url?: string | null;
  title?: string | null;
  description?: string | null;
}): string | null {
  if (clue.static_image_url) return clue.static_image_url;
  const combined = `${clue.title || ''} ${clue.description || ''}`.toLowerCase();
  if (combined.includes('4875') || combined.includes('behind closed doors')) {
    return '/clues/doa/cctv-r1-embrace.jpg';
  }
  if (combined.includes('5:38') || combined.includes('hooded figure')) {
    return '/clues/doa/cctv-r2-hooded-table.jpg';
  }
  if (combined.includes('5:52') || combined.includes('face-to-face confrontation')) {
    return '/clues/doa/cctv-r3-confrontation.jpg';
  }
  return null;
}

export function CctvClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const title = hydratedTitle || clue.title || 'Security Camera Feed';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const cctv = parseCctvClue(clue, rawText);
  const imageUrl = resolveCctvImageUrl(clue);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  return (
    <>
      <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl text-slate-100">
        {/* Security Camera Monitor Frame (Click to Zoom) */}
        {showImage && (
          <div
            onClick={(e) => {
              if (imageUrl) {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }
            }}
            className={`relative w-full ${
              compact ? 'aspect-[4/3]' : 'aspect-square'
            } bg-black overflow-hidden select-none ${
              imageUrl ? 'cursor-zoom-in group' : ''
            }`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover filter contrast-110 saturate-85 group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center gap-2">
                <span className="text-3xl animate-pulse">📹</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  SURVEILLANCE FEED ARCHIVE
                </span>
              </div>
            )}

            {/* CSS Scanline Overlay Pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0px, rgba(0, 0, 0, 0.35) 1px, transparent 1px, transparent 3px)',
              }}
            />

            {/* CRT Vignette */}
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_28px_rgba(0,0,0,0.55)]" />

            {/* HUD Overlay */}
            <div className="pointer-events-none absolute inset-0 p-3.5 flex flex-col justify-between font-mono text-[10px]">
              {/* Top Row: Flashing Red ● REC (Top-Left) + Dynamic Camera ID (Top-Right) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-black/70 border border-red-500/30 px-2.5 py-1 rounded text-red-500 font-black uppercase tracking-widest backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block -ml-3.5" />
                  <span>● REC</span>
                </div>

                <div className="bg-black/70 border border-white/15 px-2.5 py-1 rounded text-slate-200 font-bold uppercase tracking-wider backdrop-blur-xs truncate max-w-[65%]">
                  {cctv.camera}
                </div>
              </div>

              {/* Bottom Row: Digital Green Monospace Timestamp (Bottom-Left) + Tap to Zoom (Bottom-Right) */}
              <div className="flex items-end justify-between gap-2">
                <div className="bg-black/80 border border-emerald-500/40 px-2.5 py-1 rounded text-emerald-400 font-bold tracking-wider shadow-sm">
                  🕒 {cctv.timestamp}
                </div>
                <div className="bg-black/75 border border-white/15 px-2.5 py-1 rounded text-[9px] text-white/90 font-black uppercase tracking-wider group-hover:bg-brand-pink group-hover:border-brand-pink transition-all">
                  {imageUrl ? '🔍 Tap to Zoom' : '1080P • 30FPS'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Surveillance Log Description (only shown when text notes exist) */}
        {cctv.cleanDescription && (
          <div className="px-4 py-3 bg-slate-950 border-t border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-emerald-400/90">
              <span>📹 SECURITY FEED</span>
              <span>{cctv.camera}</span>
            </div>
            <p className="text-xs font-medium text-slate-200 leading-relaxed whitespace-pre-line">
              {cctv.cleanDescription}
            </p>
          </div>
        )}
      </div>

      {/* Full-Screen CCTV Surveillance Zoom Lightbox Modal */}
      {isLightboxOpen && imageUrl && (
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
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="text-red-400 font-black uppercase tracking-widest">
                    ● REC • {cctv.camera}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold">
                    🕒 {cctv.timestamp}
                  </span>
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

            <div className="relative bg-black flex items-center justify-center max-h-[68vh] overflow-hidden">
              <img
                src={imageUrl}
                alt={title}
                className="w-full max-h-[68vh] object-contain filter contrast-110 saturate-85"
              />
            </div>

            {cctv.cleanDescription && (
              <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
                {cctv.cleanDescription}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

