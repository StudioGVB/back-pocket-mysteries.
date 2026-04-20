'use client';

import React, { useState } from 'react';
import { Database, MotiveType, MotiveStrength } from '@/types/database';
import { addMotiveAction, removeMotiveAction } from '../actions';

type Character = Database['public']['Tables']['characters']['Row'];
type Motive = Database['public']['Tables']['motives']['Row'];

interface MotiveManagerProps {
  mysteryId: string;
  characterId: string;
  existingMotives: Motive[];
  allCharacters: Character[];
}

export function MotiveManager({ mysteryId, characterId, existingMotives, allCharacters }: MotiveManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const motiveTypes: MotiveType[] = ['revenge', 'greed', 'love', 'fear', 'justice', 'power'];
  const strengths: MotiveStrength[] = ['low', 'moderate', 'high', 'critical'];

  const otherCharacters = allCharacters.filter(c => c.id !== characterId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Motives against Others</h3>
        {!isAdding && (
          <button 
            type="button" 
            onClick={() => setIsAdding(true)}
            className="text-[10px] font-black text-brand-pink hover:text-brand-blue transition-colors"
          >
            + Add Motive
          </button>
        )}
      </div>

      {isAdding && (
        <form 
          action={async (formData) => {
            setIsPending(true);
            try {
              await addMotiveAction(mysteryId, characterId, formData);
              setIsAdding(false);
            } finally {
              setIsPending(false);
            }
          }}
          className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[8px] font-black uppercase text-slate-400 mb-2">Target Character</label>
              <select name="linked_character_id" required className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-xs appearance-none">
                <option value="">Select Target...</option>
                {otherCharacters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[8px] font-black uppercase text-slate-400 mb-2">Motive Type</label>
              <select name="motive_type" required className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-xs appearance-none">
                {motiveTypes.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-[8px] font-black uppercase text-slate-400 mb-2">Notes / Context</label>
            <textarea 
              name="notes" 
              placeholder="Why does this character feel this way?" 
              className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl font-bold text-xs resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3">
             <button 
               type="button" 
               onClick={() => setIsAdding(false)}
               className="flex-grow py-3 bg-white text-slate-400 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all border border-slate-100"
             >
               Cancel
             </button>
             <button 
               disabled={isPending}
               className="flex-grow py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-brand-pink transition-all shadow-lg"
             >
               {isPending ? 'Saving...' : 'Add Motive'}
             </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {existingMotives.length > 0 ? (
          existingMotives.map((motive) => {
            const target = allCharacters.find(c => c.id === motive.linked_character_id);
            return (
              <div key={motive.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl group shadow-sm hover:border-brand-pink/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-sm">🗯️</div>
                  <div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-slate-900 capitalize">{motive.motive_type}</span>
                       <span className="text-[8px] font-black uppercase text-slate-300">against</span>
                       <span className="text-xs font-black text-brand-pink">{target?.name || 'Unknown'}</span>
                    </div>
                    {motive.notes && <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{motive.notes}</p>}
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={async () => {
                    if (confirm('Delete this motive?')) {
                      await removeMotiveAction(mysteryId, motive.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-slate-300 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            );
          })
        ) : !isAdding && (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-100 opacity-50">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active motives defined</p>
          </div>
        )}
      </div>
    </div>
  );
}
