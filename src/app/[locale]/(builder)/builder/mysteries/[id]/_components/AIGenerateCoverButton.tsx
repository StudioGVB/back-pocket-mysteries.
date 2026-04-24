'use client';

import React, { useState } from 'react';
import { generateMysteryCoverAction } from '../../actions';
import Image from 'next/image';

export function AIGenerateCoverButton({ mysteryId, currentImageUrl }: { mysteryId: string, currentImageUrl?: string | null }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await generateMysteryCoverAction(mysteryId);
      if (res?.error) {
        setError(res.error);
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-end mb-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Cover Photo</label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="group flex items-center gap-2 px-3 py-1.5 bg-brand-dark hover:bg-brand-pink text-brand-pink hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-3 h-3 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          )}
          {isGenerating ? 'Generating...' : 'Auto Generate Photo'}
        </button>
      </div>

      {error && <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">{error}</div>}

      <div className="w-full aspect-[21/9] bg-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden relative group">
        {currentImageUrl ? (
          <div className="absolute inset-0">
            {/* Using standard img to support base64 natively without next/image remote patterns complexity */}
            <img 
              src={currentImageUrl} 
              alt="Mystery Cover" 
              className="w-full h-full object-cover grayscale-[30%] sepia-[20%] contrast-125 brightness-90 group-hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl"></div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">No Cover Generated</p>
          </div>
        )}
      </div>
    </div>
  );
}
