'use client';

import React, { useState } from 'react';
import { addSubplotAction, removeSubplotAction, updateBeatAction } from '../actions';

interface props {
  mysteryId: string;
  characters: any[];
  subplots: any[];
}

export function SubplotManager({ mysteryId, characters, subplots }: props) {
  const [activeSubplotId, setActiveSubplotId] = useState<string | null>(null);

  // Group subplots by primary character
  const subplotsByCharacter = characters.reduce((acc, char) => {
    acc[char.id] = subplots.find(sp => sp.primary_character_id === char.id) || null;
    return acc;
  }, {} as Record<string, any>);

  const handleCreateSubplot = async (characterId: string) => {
    const formData = new FormData();
    formData.append('title', 'New Subplot');
    formData.append('primary_character_id', characterId);
    await addSubplotAction(mysteryId, formData);
  };

  const handleDeleteSubplot = async (subplotId: string) => {
    if (confirm('Are you sure you want to delete this subplot?')) {
      await removeSubplotAction(mysteryId, subplotId);
    }
  };

  const handleUpdateBeatText = async (beatId: string, description: string) => {
    await updateBeatAction(mysteryId, beatId, { description });
  };

  const nonVictims = characters.filter(c => !c.is_victim);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {nonVictims.map(character => {
          const subplot = subplotsByCharacter[character.id];
          const isExpanded = activeSubplotId === subplot?.id;

          return (
            <div key={character.id} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/20">
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-brand-pink/10 text-brand-pink rounded-2xl flex items-center justify-center text-xl font-bold uppercase shadow-inner">
                    {character.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{character.name.split('|')[0]}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                      {character.name.includes('|') ? character.name.split('|')[1] : (character.archetype || 'Suspect')}
                    </p>
                  </div>
                </div>

                {!subplot && (
                  <button 
                    onClick={() => handleCreateSubplot(character.id)}
                    className="px-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    + Assign Arc
                  </button>
                )}
              </div>

              {subplot ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-1">Subplot Theme</div>
                      <div className="text-lg font-black text-slate-900">{subplot.title}</div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setActiveSubplotId(isExpanded ? null : subplot.id)}
                         className="px-4 py-2 border-2 border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                       >
                         {isExpanded ? 'Hide Beats' : 'Edit Beats'}
                       </button>
                       <button 
                         onClick={() => handleDeleteSubplot(subplot.id)}
                         className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                       >
                         Remove
                       </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      {(subplot.subplot_beats || []).map((beat: any) => (
                        <div key={beat.id} className="relative group">
                           <div className="absolute top-4 left-0 w-8 text-center text-[10px] font-black text-slate-400">0{beat.beat_number}</div>
                           <textarea
                             defaultValue={beat.description}
                             onBlur={(e) => handleUpdateBeatText(beat.id, e.target.value)}
                             className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-slate-300 rounded-2xl text-sm font-medium text-slate-700 transition-all resize-none min-h-[80px]"
                             placeholder={`Describe beat ${beat.beat_number}...`}
                           />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                 <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                   <p className="text-slate-400 font-medium text-sm">No secondary objectives assigned yet.</p>
                 </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
