'use client';

import React, { useState } from 'react';
import { generateMotivesAction } from '../actions';

interface props {
  mysteryId: string;
}

export function AIGenerateMotivesButton({ mysteryId }: props) {
  const [isHovered, setIsHovered] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (overwrite: boolean) => {
    setShowOptions(false);
    setIsGenerating(true);
    try {
      await generateMotivesAction(mysteryId, overwrite);
    } catch (e) {
      console.error('Failed to generate motives', e);
      alert('Generation Failed: ' + e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isGenerating}
        className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 flex items-center gap-2 shadow-sm ${
          isGenerating 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-red-50 text-red-600 hover:bg-[#FF3366] hover:text-white hover:shadow-lg hover:shadow-[#FF3366]/20 border border-red-100 hover:border-transparent'
        }`}
      >
        <span className={`${isGenerating ? 'animate-spin opacity-50' : (isHovered ? 'animate-pulse text-white' : 'text-red-400')}`}>
          🗯️
        </span>
        {isGenerating ? 'Drafting Motives...' : 'Suggest Motives'}
      </button>

      {/* Pop-Up Options Dialog */}
      {showOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">
                🗯️
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Generate Motives</h2>
              <p className="text-slate-500 font-medium text-sm">
                The AI will examine character relationships, plot roles, and the victim to generate compelling stakes.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => handleGenerate(false)}
                className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 rounded-2xl text-left transition-colors flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-slate-300 transition-colors">➕</div>
                <div>
                   <div className="font-bold text-slate-900">Build on Existing</div>
                   <div className="text-xs text-slate-500 font-medium">Keep my current motives and only add new ones.</div>
                </div>
              </button>
              
              <button 
                onClick={() => handleGenerate(true)}
                className="w-full px-6 py-4 bg-red-50 hover:bg-red-100 border-2 border-red-100 rounded-2xl text-left transition-colors flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-600 group-hover:bg-red-300 transition-colors">⚠️</div>
                <div>
                   <div className="font-bold text-red-900">Start Over Fresh</div>
                   <div className="text-xs text-red-600 font-medium">Wipe my manual motives and completely rebuild.</div>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setShowOptions(false)}
              className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
