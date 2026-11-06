'use client';

import React from 'react';
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

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl text-slate-100">
      {/* Security Camera Monitor Frame */}
      {showImage && (
        <div className={`relative w-full ${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'} bg-black overflow-hidden select-none`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover filter contrast-115 saturate-75"
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
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0px, rgba(0, 0, 0, 0.35) 1px, transparent 1px, transparent 3px)',
            }}
          />

          {/* CRT Vignette */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.75)]" />

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

            {/* Bottom Row: Digital Green Monospace Timestamp (Bottom-Left) */}
            <div className="flex items-end justify-between gap-2">
              <div className="bg-black/75 border border-emerald-500/30 px-2.5 py-1 rounded text-emerald-400 font-bold tracking-wider shadow-sm">
                {cctv.timestamp}
              </div>
              <div className="bg-black/65 px-2 py-0.5 rounded text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                1080P • 30FPS
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surveillance Log Description */}
      <div className="p-4 bg-slate-950 border-t border-slate-800/90 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-emerald-400/90">
          <span>📹 SECURITY LOG ANALYSIS</span>
          <span>{cctv.camera}</span>
        </div>
        <p className="text-xs font-medium text-slate-200 leading-relaxed whitespace-pre-line">
          {cctv.cleanDescription || 'No surveillance notes recorded.'}
        </p>
      </div>
    </div>
  );
}
