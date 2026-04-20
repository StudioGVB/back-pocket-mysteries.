'use client';

import React, { useState } from 'react';
import { Database, PlotRole } from '@/types/database';
import { toggleVictimAction, removeCharacterAction } from '../actions';
import { CharacterDetailPanel } from './CharacterDetailPanel';

type Motive = Database['public']['Tables']['motives']['Row'];
type Character = Database['public']['Tables']['characters']['Row'] & { motives?: Motive[] };

interface CharacterCardProps {
  character: Character;
  mysteryId: string;
  allCharacters: Character[];
}

export function CharacterCard({ character, mysteryId, allCharacters }: CharacterCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Derive display role and style
  const role = character.plot_role || 'innocent';
  const isVictim = character.is_victim;

  const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
    killer: { label: 'Killer', bg: 'bg-brand-pink', text: 'text-white' },
    assistant: { label: 'Assisted Murder', bg: 'bg-orange-500', text: 'text-white' },
    innocent: { label: 'Completely Innocent', bg: 'bg-emerald-500', text: 'text-white' },
    victim: { label: 'Victim — Not Playable', bg: 'bg-brand-pink/10', text: 'text-brand-pink border border-brand-pink/20' },
  };

  const currentRole = isVictim ? roleConfig.victim : roleConfig[role as keyof typeof roleConfig] || roleConfig.innocent;

  return (
    <>
      <div className={`p-8 rounded-[2rem] border transition-all duration-300 group relative flex flex-col h-full ${
        isVictim ? 'bg-red-50/50 border-red-100 shadow-sm' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl'
      }`}>
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
              isVictim ? 'bg-white text-red-400' : 'bg-slate-50 text-slate-400'
            }`}>
              {isVictim ? '💀' : '👤'}
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 leading-tight">{character.name}</h4>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {character.archetype || 'Mystery Guest'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(true)}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              title="Edit Profile"
            >
              ✎
            </button>
            <button 
              onClick={async () => {
                if (confirm('Delete this character profile?')) {
                  setIsDeleting(true);
                  await removeCharacterAction(mysteryId, character.id);
                }
              }}
              disabled={isDeleting}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              title="Delete Profile"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Badges Section */}
        <div className="flex flex-wrap gap-2 mb-6">
          {character.is_mandatory && !isVictim && (
            <span className="px-3 py-1 bg-brand-pink text-white rounded-full text-[9px] font-black uppercase tracking-widest">
              Mandatory
            </span>
          )}
          {!character.is_mandatory && !isVictim && (
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">
              5+ players
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${currentRole.bg} ${currentRole.text}`}>
            {currentRole.label}
          </span>
        </div>

        {/* Detail/Story Section */}
        <div className="mt-auto pt-6 border-t border-slate-50 space-y-3">
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Relationship:</span>
             <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
               {character.victim_relationship || 'Unknown'}
             </span>
          </div>
          
          {character.motives && character.motives.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight whitespace-nowrap mt-0.5">Motive:</span>
              <div className="flex flex-wrap gap-1">
                {character.motives.map((m, idx) => (
                  <span key={idx} className="text-[10px] font-bold text-slate-600 italic">
                    {m.notes || m.motive_type}{idx < (character.motives?.length || 0) - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <CharacterDetailPanel 
          character={character}
          mysteryId={mysteryId}
          allCharacters={allCharacters}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  );
}
