'use client';

import React, { useState } from 'react';
import { generateDescriptionAction } from '../../actions';

export function AIGenerateDescriptionButton({
  mysteryId,
  title,
  theme,
  spiceLevel,
  onGenerated,
  onError,
}: {
  mysteryId: string;
  title?: string;
  theme?: string;
  spiceLevel?: string;
  onGenerated?: (newDescription: string) => void;
  onError?: (errorMessage: string | null) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    onError?.(null);
    try {
      const res = await generateDescriptionAction(mysteryId, {
        title,
        theme,
        spiceLevel,
      });
      if (!res?.success || res.error) {
        onError?.(res?.error || 'Could not generate description.');
      } else if (res.description) {
        onGenerated?.(res.description);
      }
    } catch (error: any) {
      console.error(error);
      onError?.(error?.message || 'Failed to generate description.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating}
      className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-brand-pink hover:text-brand-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <span className={isGenerating ? 'animate-spin' : ''}>✨</span>
      {isGenerating ? 'Drafting Scene & Vibe...' : 'Auto-fill Description'}
    </button>
  );
}
