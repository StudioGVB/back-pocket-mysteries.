'use client';

import React, { useState, useRef } from 'react';
import { Database } from '@/types/database';
import { addClueAction } from '../actions';
import { ClueCard } from './ClueCard';

type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface ClueGridProps {
  mysteryId: string;
  clues: Clue[];
  beats: Beat[];
  characters: Character[];
}

export function ClueGrid({ mysteryId, clues, beats, characters }: ClueGridProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isAdding, setIsAdding] = useState(false);

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
      {clues.length > 0 ? (
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
          
          {/* Placeholder Slot */}
          <div className="border-2 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center opacity-40 h-[300px]">
            <div className="w-10 h-10 bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-xl">🔍</div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose">
              Unfound Evidence <br /> Slot Available
            </p>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-100 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center opacity-50 bg-white/50">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-sm">🔦</div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">The Scene is Clean</h3>
          <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
            Every crime scene leaves a trace. Start by adding your first piece of evidence above.
          </p>
        </div>
      )}
    </div>
  );
}
