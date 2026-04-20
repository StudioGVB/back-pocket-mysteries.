'use client';

import React from 'react';
import { Database } from '@/types/database';
import { updateBeatAction } from '../actions';

type Character = Database['public']['Tables']['characters']['Row'];

interface BeatInvolvementProps {
  mysteryId: string;
  beatId: string;
  involvedIds: string[];
  allCharacters: Character[];
}

export function BeatInvolvement({ mysteryId, beatId, involvedIds, allCharacters }: BeatInvolvementProps) {
  
  const toggleCharacter = async (charId: string) => {
    let newInvolved = [...involvedIds];
    if (newInvolved.includes(charId)) {
      newInvolved = newInvolved.filter(id => id !== charId);
    } else {
      newInvolved.push(charId);
    }
    
    await updateBeatAction(mysteryId, beatId, { characters_involved: newInvolved });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {allCharacters.map((char) => {
        const isInvolved = involvedIds.includes(char.id);
        
        return (
          <button
            key={char.id}
            onClick={() => toggleCharacter(char.id)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              isInvolved 
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 ring-2 ring-brand-blue/20 ring-offset-2' 
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            {char.name}
          </button>
        );
      })}
      
      {allCharacters.length === 0 && (
        <span className="text-[10px] text-slate-300 font-bold italic">No characters created yet</span>
      )}
    </div>
  );
}
