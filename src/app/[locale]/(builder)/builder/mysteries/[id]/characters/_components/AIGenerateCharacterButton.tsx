'use client';

import React, { useState } from 'react';
import { generateAICharacterAction } from '../actions';

interface AIGenerateCharacterButtonProps {
  mysteryId: string;
  onGenerated: (character: any) => void;
}

export function AIGenerateCharacterButton({ mysteryId, onGenerated }: AIGenerateCharacterButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateAICharacterAction(mysteryId);
      onGenerated(generated);
    } catch (error: any) {
      alert(`Failed to generate character: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className={`px-6 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${
        isGenerating 
          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
          : 'bg-white text-brand-pink border-brand-pink/20 shadow-sm hover:shadow-md hover:bg-brand-pink/5'
      }`}
    >
      {isGenerating ? (
        <>
          <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-400 animate-spin" />
          <span>Summoning...</span>
        </>
      ) : (
        <>
          <span>✨</span>
          <span>Generate Suspect</span>
        </>
      )}
    </button>
  );
}
