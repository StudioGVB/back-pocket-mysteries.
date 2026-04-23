'use client';

import React, { useState, useRef } from 'react';
import { Database } from '@/types/database';
import { addClueAction } from '../actions';
import { ClueCard } from './ClueCard';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface ClueGridProps {
  mystery: Mystery;
  mysteryId: string;
  clues: Clue[];
  beats: Beat[];
  characters: Character[];
}

export function ClueGrid({ mystery, mysteryId, clues, beats, characters }: ClueGridProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isAdding, setIsAdding] = useState(false);

  const maxClues = mystery.complexity === 'easy' ? 15 : mystery.complexity === 'medium' ? 25 : mystery.complexity === 'hard' ? 35 : 15;
  const placeholderCount = Math.max(0, maxClues - clues.length);

  return (
    <div className="space-y-10">
      {/* Quick Add Bar */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Discovery Log</h3>
        <form 
          ref={formRef}
          action={async (formData) => {
            setIsAdding(true);
            await addClueAction(mysteryId, formData);
            formRef.current?.reset();
            setIsAdding(false);
          }}
          className="flex flex-col md:flex-row gap-4"
        >
          <div className="flex-grow">
            <input 
              name="title"
              required
              placeholder="Evidence Name (e.g. Bloody Knife, Ransom Note)"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none font-bold transition-all"
            />
          </div>

          <button 
            disabled={isAdding}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-blue transition-all shadow-xl shadow-slate-900/10 active:scale-95 whitespace-nowrap disabled:opacity-50"
          >
            {isAdding ? 'Recording...' : '+ Add Evidence'}
          </button>
        </form>
      </div>

      {/* Clue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clues.map((clue) => (
          <ClueCard 
            key={clue.id} 
            clue={clue} 
            mysteryId={mysteryId} 
            beats={beats}
            characters={characters}
          />
        ))}
        
        {/* Placeholder Slots */}
        {Array.from({ length: placeholderCount }).map((_, index) => (
          <div key={`placeholder-${index}`} className="border-2 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center opacity-40 h-[300px]">
            <div className="w-10 h-10 bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-xl">🔍</div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose">
              Unfound Evidence <br /> Slot {clues.length + index + 1}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
