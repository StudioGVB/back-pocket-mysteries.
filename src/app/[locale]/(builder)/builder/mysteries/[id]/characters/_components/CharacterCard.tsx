'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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

import { getCharacterColor } from '@/utils/colors';

export function CharacterCard({ character, mysteryId, allCharacters }: CharacterCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Derive display role and style
  const role = character.plot_role || 'innocent';
  const isVictim = character.is_victim;

  const charColor = getCharacterColor({ id: character.id, is_victim: isVictim, plot_role: role }, allCharacters);

  const roleConfig: Record<string, { label: string; text: string }> = {
    killer: { label: 'Killer', text: 'text-white' },
    assistant: { label: 'Assisted Murder', text: 'text-white' },
    innocent: { label: 'Innocent', text: 'text-white' },
    victim: { label: 'The Victim', text: 'text-white' },
  };

  const currentRole = isVictim ? roleConfig.victim : roleConfig[role as keyof typeof roleConfig] || roleConfig.innocent;

  return (
    <>
      <div className={`p-8 rounded-[2rem] border transition-all duration-300 group relative flex flex-col h-full ${
        isVictim ? 'bg-brand-pink/5 border-brand-pink/20 shadow-sm' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl'
      }`}>
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
              style={{ 
                backgroundColor: isVictim ? 'white' : `${charColor}20`,
                color: charColor 
              }}
            >
              {isVictim ? '💀' : '👤'}
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 leading-tight">
                {character.name.split('|')[2] && (
                  <span className="text-slate-400 mr-1.5">{character.name.split('|')[2]}</span>
                )}
                {character.name.split('|')[0]}
              </h4>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {character.name.includes('|') && character.name.split('|')[1] 
                  ? character.name.split('|')[1] 
                  : 'Mystery Guest'}
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
                  try {
                    await removeCharacterAction(mysteryId, character.id);
                  } catch (e: any) {
                    alert(`Failed to delete character: ${e.message}`);
                    setIsDeleting(false);
                  }
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
          {character.is_mandatory && (
            <span className="px-3 py-1 bg-slate-800 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
              Mandatory
            </span>
          )}
          {!character.is_mandatory && (
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">
              5+ players
            </span>
          )}
          <span 
            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white`}
            style={{ backgroundColor: charColor }}
          >
            {currentRole.label}
          </span>
          {(character.gender || 'adaptable') && (
            <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
              {(character.gender || 'adaptable') === 'adaptable' ? 'Adaptable ⚧' : character.gender === 'female' ? 'Female ♀' : 'Male ♂'}
            </span>
          )}
        </div>

        {/* Detail/Story Section */}
        <div className="mt-auto pt-6 border-t border-slate-50 space-y-3">
          {!isVictim && (
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Relationship:</span>
               <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                 {character.victim_relationship || 'Unknown'}
               </span>
            </div>
          )}
          
          {character.motives && character.motives.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight whitespace-nowrap mt-0.5">Motive:</span>
              <div className="flex flex-col gap-2 w-full">
                {character.motives.map((m, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-l-2 border-brand-pink/20 pl-2">
                    <span className="text-[9px] font-black text-brand-pink uppercase tracking-widest bg-brand-pink/10 px-2 py-0.5 rounded w-fit">
                      {m.motive_type}
                    </span>
                    {m.notes && (
                      <span className="text-[10px] font-bold text-slate-600 italic">
                        "{m.notes}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <Link 
          href={`/builder/mysteries/${mysteryId}/characters/${character.id}`}
          className="mt-6 flex w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors items-center justify-center gap-2"
        >
          {character.profile_data && typeof character.profile_data === 'object' && Object.keys(character.profile_data).length > 0 && (
            <span className="text-emerald-400 text-sm leading-none mt-[-2px]">✓</span>
          )}
          Visuals & Personality ✨
        </Link>
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
