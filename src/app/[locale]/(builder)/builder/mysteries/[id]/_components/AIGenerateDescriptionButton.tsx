'use client';

import React, { useState } from 'react';
import { generateDescriptionAction } from '../../actions';

export function AIGenerateDescriptionButton({ mysteryId }: { mysteryId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateDescriptionAction(mysteryId);
    } catch (error) {
      console.error(error);
      alert('Failed to generate description: ' + error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating}
      className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-brand-pink hover:text-brand-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className={isGenerating ? 'animate-spin' : ''}>✨</span>
      {isGenerating ? 'Drafting Synopsis...' : 'Auto-fill Description'}
    </button>
  );
}
