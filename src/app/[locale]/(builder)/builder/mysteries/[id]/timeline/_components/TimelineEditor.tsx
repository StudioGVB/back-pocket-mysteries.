'use client';

import React, { useState } from 'react';
import { Database, TimelinePhase } from '@/types/database';
import { addBeatAction } from '../actions';
import { TimelineBeatCard } from './TimelineBeatCard';
import { PlotGeneratorModal } from './PlotGeneratorModal';

type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface TimelineEditorProps {
  mystery: any;
  mysteryId: string;
  initialBeats: Beat[];
  allCharacters: Character[];
}

import { useRouter } from 'next/navigation';

export function TimelineEditor({ mystery, mysteryId, initialBeats, allCharacters }: TimelineEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const router = useRouter();

  let targetBeats = 4;
  if (mystery?.complexity === 'medium') targetBeats = 6;
  if (mystery?.complexity === 'hard') targetBeats = 8;

  const phases: TimelinePhase[] = ['pre_crime', 'crime', 'investigation', 'resolution'];

  const getPhaseLabel = (phase: TimelinePhase) => {
    switch (phase) {
      case 'pre_crime': return 'The Setup (Before the Night)';
      case 'crime': return 'The Incident';
      case 'investigation': return 'Active Investigation';
      case 'resolution': return 'The Reveal & Arrest';
      default: return phase;
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Phases */}
      {phases.map((phase) => {
        const phaseBeats = initialBeats.filter(b => b.timeline_phase === phase);
        
        return (
          <div key={phase} className="relative">
            {/* Phase Header */}
            <div className="flex items-center gap-6 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xl shadow-slate-900/10">
                {phase.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
                {getPhaseLabel(phase)}
              </h2>
              <div className="flex-grow h-px bg-slate-100"></div>
            </div>

            {/* Vertical Line */}
            <div className="absolute left-6 top-16 bottom-0 w-px bg-slate-100 -translate-x-1/2"></div>

            <div className="space-y-6 ml-12">
              {phaseBeats.length > 0 ? (
                phaseBeats.map((beat) => (
                  <TimelineBeatCard 
                    key={beat.id} 
                    beat={beat} 
                    mysteryId={mysteryId} 
                    allCharacters={allCharacters}
                  />
                ))
              ) : (
                <div className="p-8 text-center bg-slate-50/50 border border-dashed border-slate-100 rounded-[2rem] opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No events mapped for this phase</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Global Add Button */}
      <div className="flex justify-center pt-10 gap-4">
        {initialBeats.length === 0 && (
          <button 
            onClick={() => setShowGeneratorModal(true)}
            disabled={isAdding}
            className="px-10 py-5 bg-gradient-to-r from-brand-pink to-brand-red text-white rounded-[2rem] font-black flex items-center gap-3 hover:opacity-90 transition-all shadow-2xl shadow-brand-red/20 active:scale-95 disabled:opacity-50"
          >
            ✨ Auto-Generate Plot ({targetBeats} Beats)
          </button>
        )}
        <button 
          onClick={async () => {
            setIsAdding(true);
            await addBeatAction(mysteryId, initialBeats.length);
            setIsAdding(false);
          }}
          disabled={isAdding}
          className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black flex items-center gap-3 hover:bg-brand-pink transition-all shadow-2xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
        >
          {isAdding ? 'Plotting...' : '+ New Story Beat'}
        </button>
      </div>

      {showGeneratorModal && (
        <PlotGeneratorModal
          mysteryId={mysteryId}
          currentCount={initialBeats.length}
          targetBeats={targetBeats}
          allCharacters={allCharacters}
          onClose={() => setShowGeneratorModal(false)}
          onSuccess={() => {
            setShowGeneratorModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
