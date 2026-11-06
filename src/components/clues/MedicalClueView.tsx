'use client';

import React from 'react';
import { parseMedicalClue, stripCustomerFacingTitle } from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function MedicalClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || 'Prescription Record';
  const title = stripCustomerFacingTitle(rawTitle) || 'Prescription Record';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseMedicalClue(title, rawText);

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
            💊 Medical / Rx Exhibit
          </div>
        </div>
      )}

      {/* Pharmacy Prescription Bottle Label */}
      <div className="w-full rounded-xl overflow-hidden bg-white text-stone-900 border-2 border-amber-600/60 shadow-xl font-sans">
        {/* Top Clinical Pharmacy Header */}
        <div className="bg-amber-500 text-stone-950 px-4 py-2.5 flex items-center justify-between gap-2 border-b border-amber-600/40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl font-serif font-black leading-none">℞</span>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest leading-tight">
                PHARMACY DISPENSARY RECORD
              </div>
              <div className="text-[9px] font-mono font-bold opacity-80">
                REF #{parsed.refCode}
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-stone-950 text-amber-300 text-[9px] font-mono font-black uppercase tracking-wider shrink-0">
            CONTROLLED
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Medication Name Callout */}
          <div className="bg-stone-100 border border-stone-300 rounded-lg p-3">
            <div className="text-[9px] font-black uppercase tracking-widest text-stone-500">
              MEDICATION DISPENSED
            </div>
            <div className="text-sm font-black text-stone-950 mt-0.5 break-words">
              {parsed.medication}
            </div>
          </div>

          {/* Patient & Issue Date Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg p-2.5">
            <div>
              <span className="block text-[9px] font-black uppercase text-stone-400">
                PRESCRIBED TO
              </span>
              <span className="font-bold text-stone-900 break-words">
                {parsed.prescribedTo}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase text-stone-400">
                ISSUE DATE
              </span>
              <span className="font-bold text-stone-900 break-words">
                {parsed.issueDate}
              </span>
            </div>
          </div>

          {/* High-Contrast Red Pharmacy Auxiliary Warning Sticker */}
          {parsed.warning && (
            <div className="rounded-lg bg-red-600 text-white px-3.5 py-2.5 shadow-sm flex items-start gap-2.5">
              <span className="text-sm shrink-0 mt-0.5">⚠️</span>
              <div className="text-[11px] font-black uppercase tracking-wide leading-snug break-words">
                WARNING: {parsed.warning}
              </div>
            </div>
          )}

          {parsed.notes && (
            <div className="text-xs text-stone-700 font-mono whitespace-pre-line break-words pt-1">
              {parsed.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
