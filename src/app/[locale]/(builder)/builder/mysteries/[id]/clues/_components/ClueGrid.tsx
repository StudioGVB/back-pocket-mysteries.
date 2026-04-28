'use client';

import React, { useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  subplots?: any[];
}

export function ClueGrid({ mystery, mysteryId, clues, beats, characters, subplots = [] }: ClueGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [isAdding, setIsAdding] = useState(false);

  const placeholders: { type: 'main' | 'subplot'; beatId: string; beatTitle: string }[] = [];

  beats.forEach(beat => {
    const linkedCluesCount = clues.filter(c => c.linked_plot_beat_id === beat.id).length;
    const required = 2;
    for (let i = linkedCluesCount; i < required; i++) {
      placeholders.push({
        type: 'main',
        beatId: beat.id,
        beatTitle: `Beat ${beat.beat_number}: ${beat.event_title}`,
      });
    }
  });

  subplots.forEach(subplot => {
    if (subplot.subplot_beats) {
      subplot.subplot_beats.forEach((sBeat: any) => {
        const linkedCluesCount = clues.filter(c => c.linked_subplot_beat_id === sBeat.id).length;
        const required = 1;
        for (let i = linkedCluesCount; i < required; i++) {
          placeholders.push({
            type: 'subplot',
            beatId: sBeat.id,
            beatTitle: `Beat ${sBeat.beat_number}: ${subplot.title} - ${sBeat.description}`,
          });
        }
      });
    }
  });

  return (
    <div className="space-y-10">
      {/* Quick Add Bar */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Discovery Log</h3>
        <form 
          ref={formRef}
          action={async (formData) => {
            setIsAdding(true);
            const result = await addClueAction(mysteryId, formData);
            formRef.current?.reset();
            setIsAdding(false);
            if (result?.clueId) {
              router.push(`${pathname}?edit=${result.clueId}`);
            }
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

      {/* Required Evidence List */}
      {placeholders.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Missing Required Evidence</h3>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full">{placeholders.length} Remaining</span>
          </div>
          <div className="space-y-3">
            {placeholders.map((ph, index) => (
              <form 
                key={`placeholder-${ph.beatId}-${index}`} 
                action={async (formData) => {
                  try {
                    formData.set('title', 'New Evidence');
                    formData.set('linked_beat', ph.type === 'main' ? `main_${ph.beatId}` : `sub_${ph.beatId}`);
                    const result = await addClueAction(mysteryId, formData);
                    if (result?.clueId) {
                      router.push(`${pathname}?edit=${result.clueId}`);
                    }
                  } catch (err) {
                    console.error('Failed to create clue:', err);
                    alert('Failed to create clue. Check console for details.');
                  }
                }}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${ph.type === 'main' ? 'border-slate-200 hover:border-brand-blue/60 bg-slate-50/50 hover:bg-brand-blue/5' : 'border-brand-pink/20 hover:border-brand-pink/60 bg-brand-pink/5 hover:bg-brand-pink/10'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform shadow-sm ${ph.type === 'main' ? 'bg-white' : 'bg-white/60'}`}>
                    {ph.type === 'main' ? '🔍' : '🎭'}
                  </div>
                  <div className="text-left">
                    <p className={`font-bold text-xs uppercase tracking-widest mb-1 ${ph.type === 'main' ? 'text-slate-500 group-hover:text-brand-blue' : 'text-brand-pink/70 group-hover:text-brand-pink'}`}>
                      {ph.type === 'main' ? 'Real Storyline Requirement' : 'Subplot Requirement'}
                    </p>
                    <p className="text-slate-700 font-medium text-sm">
                      <span className="font-bold text-slate-900">{ph.beatTitle}</span>
                    </p>
                  </div>
                </div>
                <button type="submit" className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0 ${ph.type === 'main' ? 'bg-slate-200 text-slate-600 group-hover:bg-brand-blue group-hover:text-white' : 'bg-brand-pink/20 text-brand-pink group-hover:bg-brand-pink group-hover:text-white'}`}>
                  + Add Clue
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Clue Grid */}
      {clues.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Created Evidence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clues.map((clue) => (
              <ClueCard 
                key={clue.id} 
                clue={clue} 
                mysteryId={mysteryId} 
                beats={beats}
                characters={characters}
                subplots={subplots}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
