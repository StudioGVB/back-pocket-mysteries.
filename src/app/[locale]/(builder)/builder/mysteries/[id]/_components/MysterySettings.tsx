"use client";

import React, { useState } from 'react';

type MysterySettingsProps = {
  initialComplexity?: string;
  initialSpiceLevel?: string;
  initialStatus?: string;
  initialMinPlayers?: number;
  initialMaxPlayers?: number;
};

export function MysterySettings({
  initialComplexity = 'medium',
  initialSpiceLevel = 'clean',
  initialStatus = 'draft',
  initialMinPlayers = 4,
  initialMaxPlayers = 12
}: MysterySettingsProps) {
  const getInitialMax = (level: string) => {
    if (level === 'easy') return 10;
    if (level === 'hard') return 16;
    return 12;
  };

  const [complexity, setComplexity] = useState(initialComplexity);
  const [minPlayers, setMinPlayers] = useState(4); // Min is always 4
  const [maxPlayers, setMaxPlayers] = useState(getInitialMax(initialComplexity));

  const handleComplexityChange = (level: string) => {
    setComplexity(level);
    setMinPlayers(4);
    setMaxPlayers(getInitialMax(level));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Difficulty</label>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {['easy', 'medium', 'hard'].map(level => (
              <label key={level} className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="complexity" 
                  value={level} 
                  checked={complexity === level}
                  onChange={() => handleComplexityChange(level)}
                  className="peer hidden" 
                />
                <div className="text-center py-2 text-xs font-bold uppercase tracking-wider text-slate-400 rounded-lg hover:text-slate-600 peer-checked:bg-slate-900 peer-checked:text-white transition-all">
                  {level}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Spice Level</label>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {['clean', 'mild', 'spicy', 'filthy'].map(level => (
              <label key={level} className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="spice_level" 
                  value={level} 
                  defaultChecked={initialSpiceLevel === level || (initialSpiceLevel === 'low' && level === 'clean')} 
                  className="peer hidden" 
                />
                <div className="text-center py-2 text-xs font-bold uppercase tracking-wider text-slate-400 rounded-lg hover:text-brand-pink/50 peer-checked:bg-brand-pink peer-checked:text-white transition-all">
                  {level}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
          <select 
            name="status"
            defaultValue={initialStatus}
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:border-brand-pink outline-none font-bold transition-all appearance-none shadow-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Min Players</label>
          <input 
            name="min_players"
            value={minPlayers}
            readOnly
            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold transition-all shadow-sm text-slate-500 cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Max Players</label>
          <input 
            name="max_players"
            value={maxPlayers}
            readOnly
            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold transition-all shadow-sm text-slate-500 cursor-not-allowed"
          />
        </div>
      </div>
    </>
  );
}
