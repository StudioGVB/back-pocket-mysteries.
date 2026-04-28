'use client';

import React, { useState, useTransition } from 'react';
import { addSubplotAction, removeSubplotAction, updateBeatAction, generateSubplotAction, addSubplotBeatAction } from '../actions';
import { getCharacterColor } from '@/utils/colors';

interface props {
  mysteryId: string;
  characters: any[];
  subplots: any[];
}

function BeatAutocompleteTextarea({ beat, allDescriptions, onSave }: { beat: any, allDescriptions: string[], onSave: (val: string) => void }) {
  const [value, setValue] = useState(beat.description || '');
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = value && isFocused 
    ? allDescriptions.filter(d => d.toLowerCase().includes(value.toLowerCase()) && d !== value) 
    : [];

  return (
    <div className="relative group">
       <div className="absolute top-4 left-0 w-8 text-center text-[10px] font-black text-slate-400">0{beat.beat_number}</div>
       <textarea
         value={value}
         onChange={(e) => setValue(e.target.value)}
         onFocus={() => setIsFocused(true)}
         onBlur={() => {
           setTimeout(() => {
             setIsFocused(false);
             if (value !== beat.description) onSave(value);
           }, 200);
         }}
         className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-slate-300 rounded-2xl text-sm font-medium text-slate-700 transition-all resize-none min-h-[80px]"
         placeholder={`Describe beat ${beat.beat_number}...`}
       />
       {suggestions.length > 0 && (
         <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl max-h-60 overflow-y-auto">
           {suggestions.map((suggestion, idx) => (
             <div 
               key={idx}
               onMouseDown={(e) => {
                 e.preventDefault();
                 setValue(suggestion);
                 setIsFocused(false);
                 onSave(suggestion);
               }}
               className="px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
             >
               {suggestion}
             </div>
           ))}
         </div>
       )}
    </div>
  );
}

export function SubplotManager({ mysteryId, characters, subplots }: props) {
  const [activeSubplotId, setActiveSubplotId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Group subplots by primary or secondary character
  const subplotsByCharacter = characters.reduce((acc, char) => {
    acc[char.id] = subplots.find(sp => sp.primary_character_id === char.id || sp.secondary_character_id === char.id) || null;
    return acc;
  }, {} as Record<string, any>);

  const allBeatDescriptions = Array.from(new Set(
    subplots.flatMap(s => s.subplot_beats?.map((b: any) => b.description) || []).filter(Boolean)
  )) as string[];

  const characterIdsForColors = characters.map(c => c.id);

  const handleGenerateSubplot = async (characterId: string) => {
    setGeneratingId(characterId);
    startTransition(async () => {
      const res = await generateSubplotAction(mysteryId, characterId);
      setGeneratingId(null);
      if (res && !res.success) {
        alert('Failed to generate subplot: ' + res.error);
        return;
      }
      const newSubplot = subplots.find(sp => sp.primary_character_id === characterId);
      if (newSubplot) setActiveSubplotId(newSubplot.id);
    });
  };

  const handleCreateManualSubplot = async (characterId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', 'New Subplot');
      formData.append('primary_character_id', characterId);
      await addSubplotAction(mysteryId, formData);
      const newSubplot = subplots.find(sp => sp.primary_character_id === characterId);
      if (newSubplot) setActiveSubplotId(newSubplot.id);
    });
  };

  const handleDeleteSubplot = async (subplotId: string) => {
    if (confirm('Are you sure you want to delete this subplot?')) {
      await removeSubplotAction(mysteryId, subplotId);
    }
  };

  const handleUpdateBeatText = async (beatId: string, description: string) => {
    await updateBeatAction(mysteryId, beatId, { description });
  };

  const handleAddBeat = async (subplotId: string, currentCount: number) => {
    startTransition(async () => {
      await addSubplotBeatAction(mysteryId, subplotId, currentCount + 1);
    });
  };

  // Filter out victims AND the actual murderer (they don't need secondary subplots)
  const eligibleCharacters = characters.filter(c => !c.is_victim && c.plot_role !== 'killer');

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {eligibleCharacters.map(character => {
          const subplot = subplotsByCharacter[character.id];
          const isExpanded = activeSubplotId === subplot?.id;
          const isGenerating = generatingId === character.id;
          const charColor = getCharacterColor(character.id, characterIdsForColors);

          const otherCharacterId = subplot ? (subplot.primary_character_id === character.id ? subplot.secondary_character_id : subplot.primary_character_id) : null;
          const otherCharacter = otherCharacterId ? characters.find(c => c.id === otherCharacterId) : null;

          return (
            <div key={character.id} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/20">
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold uppercase shadow-inner"
                    style={{ backgroundColor: `${charColor}20`, color: charColor }}
                  >
                    {character.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{character.name.split('|')[0]}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {character.name.includes('|') ? character.name.split('|')[1] : (character.archetype || 'Suspect')}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${character.is_mandatory ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                        {character.is_mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>

                {!subplot && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleGenerateSubplot(character.id)}
                      disabled={isGenerating}
                      className="px-6 py-3 bg-brand-pink text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-pink-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Writing...
                        </>
                      ) : (
                        '✨ Auto-Generate Arc'
                      )}
                    </button>
                    <button 
                      onClick={() => handleCreateManualSubplot(character.id)}
                      disabled={isPending || isGenerating}
                      className="px-6 py-2 border-2 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                    >
                      + Blank Arc
                    </button>
                  </div>
                )}
              </div>

              {subplot ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-1">
                        Subplot Theme
                        {otherCharacter && <span className="text-brand-pink ml-2 px-2 py-0.5 bg-brand-pink/10 rounded-full">Shared with {otherCharacter.name.split('|')[0]}</span>}
                      </div>
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
                      {(subplot.subplot_beats || []).sort((a: any, b: any) => a.beat_number - b.beat_number).map((beat: any) => (
                        <BeatAutocompleteTextarea 
                          key={beat.id} 
                          beat={beat} 
                          allDescriptions={allBeatDescriptions}
                          onSave={(val) => handleUpdateBeatText(beat.id, val)}
                        />
                      ))}
                      <button 
                        onClick={() => handleAddBeat(subplot.id, (subplot.subplot_beats || []).length)}
                        disabled={isPending}
                        className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-xs hover:border-slate-300 hover:text-slate-600 transition-colors"
                      >
                        + Add Beat
                      </button>
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
