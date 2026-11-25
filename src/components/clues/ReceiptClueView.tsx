'use client';

import React from 'react';
import {
  extractPrimaryClueTimestamp,
  parseReceiptClue,
} from '@/utils/clue-format';
import { ClueViewProps } from './ChatClueView';

export function ReceiptClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
}: ClueViewProps) {
  const title = hydratedTitle || clue.title || 'Transaction Receipt';
  const rawText = hydratedDescription ?? clue.description ?? '';
  const parsed = parseReceiptClue(title, rawText);
  const detectedTimestamp =
    extractPrimaryClueTimestamp(title, rawText, clue.internal_notes) ||
    parsed.timestamp;

  const sawtoothTopStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(circle at 6px 0px, transparent 6px, #fffbeb 6.5px)',
    backgroundSize: '12px 10px',
    backgroundRepeat: 'repeat-x',
  };

  const sawtoothBottomStyle: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(circle at 6px 10px, transparent 6px, #fffbeb 6.5px)',
    backgroundSize: '12px 10px',
    backgroundRepeat: 'repeat-x',
  };

  return (
    <div className="w-full space-y-3">
      {/* Thermal Receipt Paper Container */}
      <div className="relative w-full filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)]">
        {/* Top Jagged Sawtooth Edge */}
        <div className="w-full h-2.5" style={sawtoothTopStyle} />

        {/* Receipt Body */}
        <div className="bg-amber-50 text-stone-900 px-5 py-4 font-mono text-xs selection:bg-amber-200">
          {/* Merchant Header */}
          <div className="text-center space-y-1">
            <div className="text-sm font-black tracking-widest uppercase text-stone-950">
              {parsed.merchant}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-stone-600 uppercase tracking-wider">
              <span>{parsed.receiptNumber}</span>
              {detectedTimestamp && (
                <span className="px-2 py-0.5 rounded bg-amber-300/80 border border-amber-600/40 text-stone-950 font-black">
                  🕒 {detectedTimestamp}
                </span>
              )}
            </div>
          </div>

          <div className="my-2.5 text-[10px] text-stone-400 tracking-tighter overflow-hidden whitespace-nowrap select-none">
            ----------------------------------------------------------------
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-stone-500 pb-1">
            <span className="col-span-2">QTY</span>
            <span className="col-span-7">ITEM</span>
            <span className="col-span-3 text-right">AMT</span>
          </div>

          {/* Line Items */}
          <div className="space-y-1.5 py-1">
            {parsed.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 items-baseline text-xs font-semibold text-stone-900">
                <span className="col-span-2 text-stone-600">{item.qty}x</span>
                <span className="col-span-7 pr-2 break-words">{item.item}</span>
                <span className="col-span-3 text-right font-bold">{item.price}</span>
              </div>
            ))}
          </div>

          <div className="my-2.5 text-[10px] text-stone-400 tracking-tighter overflow-hidden whitespace-nowrap select-none">
            ----------------------------------------------------------------
          </div>

          {/* Totals */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-stone-600">
              <span>SUBTOTAL</span>
              <span>{parsed.subtotal}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>TAX (8.5%)</span>
              <span>{parsed.tax}</span>
            </div>
            <div className="flex justify-between text-xs font-black text-stone-950 pt-1 border-t border-dashed border-stone-300">
              <span>TOTAL PAID</span>
              <span>{parsed.total}</span>
            </div>
          </div>

          {/* Forensic / Clue Observation Notes */}
          {parsed.notes && (
            <>
              <div className="my-2.5 text-[10px] text-stone-400 tracking-tighter overflow-hidden whitespace-nowrap select-none">
                ----------------------------------------------------------------
              </div>
              <div className="bg-amber-100/70 border border-stone-300/80 rounded p-2.5 text-[11px] leading-relaxed text-stone-800 whitespace-pre-line">
                <span className="block text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">
                  EVIDENCE DETAILS:
                </span>
                {parsed.notes}
              </div>
            </>
          )}

          {/* Barcode Footer */}
          <div className="mt-4 pt-2 flex flex-col items-center justify-center opacity-70 select-none">
            <div className="flex items-center justify-center gap-[2px] h-6 w-40">
              {[2, 1, 3, 1, 2, 1, 4, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2].map((w, i) => (
                <div
                  key={i}
                  className="bg-stone-900 h-full"
                  style={{ width: `${w * 2}px` }}
                />
              ))}
            </div>
            <span className="text-[9px] tracking-[0.3em] text-stone-500 mt-1">
              *CUSTOMER COPY*
            </span>
          </div>
        </div>

        {/* Bottom Jagged Sawtooth Edge */}
        <div className="w-full h-2.5" style={sawtoothBottomStyle} />
      </div>
    </div>
  );
}
