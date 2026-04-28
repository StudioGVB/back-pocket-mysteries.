'use client';

import React, { useState } from 'react';
import { Database, TimelinePhase } from '@/types/database';
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
import { reorderBeatsAction, insertBeatAtPositionAction, deleteAllBeatsAction, addBeatAction } from '../actions';

export function TimelineEditor({ mystery, mysteryId, initialBeats, allCharacters }: TimelineEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const router = useRouter();

  let targetBeats = 4;
  if (mystery?.complexity === 'medium') targetBeats = 6;
  if (mystery?.complexity === 'hard') targetBeats = 8;

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newBeats = [...initialBeats];
    const temp = newBeats[index].sort_order;
    newBeats[index].sort_order = newBeats[index - 1].sort_order;
    newBeats[index - 1].sort_order = temp;
    await reorderBeatsAction(mysteryId, [
      { id: newBeats[index].id, sort_order: newBeats[index].sort_order },
      { id: newBeats[index - 1].id, sort_order: newBeats[index - 1].sort_order }
    ]);
    router.refresh();
  };

  const handleMoveDown = async (index: number) => {
    if (index === initialBeats.length - 1) return;
    const newBeats = [...initialBeats];
    const temp = newBeats[index].sort_order;
    newBeats[index].sort_order = newBeats[index + 1].sort_order;
    newBeats[index + 1].sort_order = temp;
    await reorderBeatsAction(mysteryId, [
      { id: newBeats[index].id, sort_order: newBeats[index].sort_order },
      { id: newBeats[index + 1].id, sort_order: newBeats[index + 1].sort_order }
    ]);
    router.refresh();
  };

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto">
      {initialBeats.length > 0 ? (
        <div className="relative">
          {/* Central Vertical Line */}
          <div className="absolute left-8 top-8 bottom-8 w-px bg-slate-200"></div>

          <div className="space-y-4 relative z-10">
            {initialBeats.map((beat, index) => (
              <React.Fragment key={beat.id}>
                <div className="pl-16 relative">
                  {/* Timeline Dot */}
                  <div className="absolute left-8 top-8 w-2 h-2 rounded-full bg-slate-400 -translate-x-[4px] -translate-y-1/2 outline outline-4 outline-white"></div>
                  
                  <TimelineBeatCard 
                    beat={beat} 
                    mysteryId={mysteryId} 
                    allCharacters={allCharacters}
                    isFirst={index === 0}
                    isLast={index === initialBeats.length - 1}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                  />
                </div>

                {/* Inline Add Button */}
                {index < initialBeats.length - 1 && (
                  <div className="pl-16 relative flex justify-center py-2 group/add">
                    <button 
                      onClick={async () => {
                        setIsAdding(true);
                        await insertBeatAtPositionAction(mysteryId, beat.sort_order || index + 1, initialBeats.map(b => ({ id: b.id, sort_order: b.sort_order || 0 })));
                        setIsAdding(false);
                      }}
                      disabled={isAdding}
                      className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-brand-red hover:text-white transition-all shadow-sm opacity-0 group-hover/add:opacity-100 focus:opacity-100"
                      title="Insert beat here"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl">
          <p className="text-sm font-bold text-slate-400">No events mapped yet.</p>
        </div>
      )}

      {/* Global Add Button */}
      <div className="flex flex-wrap justify-center pt-10 gap-4">
        <button 
          onClick={() => setShowGeneratorModal(true)}
          disabled={isAdding}
          className={`px-10 py-5 rounded-[2rem] font-black flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${
            initialBeats.length === 0 
              ? 'bg-gradient-to-r from-brand-pink to-brand-red text-white hover:opacity-90 shadow-2xl shadow-brand-red/20' 
              : 'bg-white border-2 border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white shadow-xl shadow-brand-pink/10'
          }`}
        >
          {initialBeats.length === 0 ? `✨ Auto-Generate Plot (${targetBeats} Beats)` : '✨ Re-generate Entire Plot'}
        </button>
        
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

        {initialBeats.length > 0 && (
          <button 
            onClick={async () => {
              if (confirm('Are you sure you want to completely wipe all plot beats? This cannot be undone.')) {
                setIsAdding(true);
                await deleteAllBeatsAction(mysteryId);
                setIsAdding(false);
                router.refresh();
              }
            }}
            disabled={isAdding}
            className="px-6 py-5 bg-red-50 text-red-500 rounded-[2rem] font-black flex items-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/10 active:scale-95 disabled:opacity-50"
          >
            🗑️ Wipe Timeline
          </button>
        )}
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
