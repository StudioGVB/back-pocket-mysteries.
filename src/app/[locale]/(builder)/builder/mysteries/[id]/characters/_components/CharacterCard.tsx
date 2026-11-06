'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Database, PlotRole } from '@/types/database';
import { toggleVictimAction, removeCharacterAction, assignGuestToCharacterAction } from '../actions';
import { CharacterDetailPanel } from './CharacterDetailPanel';

type Motive = Database['public']['Tables']['motives']['Row'];
type Character = Database['public']['Tables']['characters']['Row'] & { motives?: Motive[] };

interface CharacterCardProps {
  character: Character;
  mysteryId: string;
  allCharacters: Character[];
  guests: any[];
}

import { getCharacterColor } from '@/utils/colors';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  getCharacterDisplayName,
  getCharacterRoleTitle,
  hasAssignedGuest,
  hydrateTextWithCharacters,
} from '@/utils/hydration';

export function CharacterCard({ character, mysteryId, allCharacters, guests }: CharacterCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [pendingVictimGuestId, setPendingVictimGuestId] = useState<string | null>(null);

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

  const profileData = character.profile_data as any;
  const assignedGuestId = profileData?.guest_id;
  const isLinked = profileData?.is_linked;
  const roleTitle = getCharacterRoleTitle(character);
  const displayName = getCharacterDisplayName(character, { includePrefix: true });
  const isGuestAssigned = hasAssignedGuest(character);

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
                {roleTitle}
              </h4>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {isGuestAssigned ? `Played by ${displayName}` : 'Unassigned Role'}
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
                        &ldquo;{hydrateTextWithCharacters(m.notes, allCharacters, 'role')}&rdquo;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unified Guest Casting Control Badge */}
        {guests.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col gap-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Assigned Actor</span>
              {assignedGuestId && (
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isLinked ? 'bg-brand-pink/5 text-brand-pink' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isLinked ? 'Connected' : 'Roster'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200/60 shrink-0">
                  {profileData?.avatar_url ? (
                    <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">🎭</span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black text-slate-800 truncate">
                    {profileData?.guest_name || profileData?.name || 'Unassigned'}
                  </p>
                  {profileData?.gender ? (
                    <p className="text-[9px] font-bold text-slate-400 capitalize truncate mt-0.5">
                      {profileData.gender} {profileData.eye_color ? `• ${profileData.eye_color} eyes` : ''}
                    </p>
                  ) : (
                    <p className="text-[9px] font-bold text-slate-300 truncate mt-0.5">No guest casted yet</p>
                  )}
                </div>
              </div>

              <CustomSelect
                value={assignedGuestId || ''}
                disabled={isCasting}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (val && isVictim) {
                    const directGender = (character.gender || 'adaptable').toLowerCase();
                    const currentCastGender = (profileData?.gender || 'adaptable').toLowerCase();
                    const effectiveVictimGender =
                      directGender === 'male' || directGender === 'female'
                        ? directGender
                        : currentCastGender;
                    const pickedGuest = guests.find((g) => g.id === val);
                    const guestGender = (pickedGuest?.gender || 'adaptable').toLowerCase();
                    if (
                      (effectiveVictimGender === 'male' || effectiveVictimGender === 'female') &&
                      guestGender !== effectiveVictimGender
                    ) {
                      setPendingVictimGuestId(val);
                      return;
                    }
                  }
                  setIsCasting(true);
                  try {
                    await assignGuestToCharacterAction(mysteryId, character.id, val ? val : null);
                  } catch (err: any) {
                    alert('Casting failed: ' + err.message);
                  } finally {
                    setIsCasting(false);
                  }
                }}
                className="bg-white border border-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-brand-pink/20 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
              >
                <option value="">-- Clear --</option>
                {guests.map((g) => {
                  const isCastElsewhere = allCharacters.some(c => c.id !== character.id && (c.profile_data as any)?.guest_id === g.id);
                  return (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.gender}){isCastElsewhere ? ' [Busy]' : ''}
                    </option>
                  );
                })}
              </CustomSelect>
            </div>
          </div>
        )}
        
        <Link 
          href={`/builder/mysteries/${mysteryId}/characters/${character.id}`}
          className="mt-4 flex w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors items-center justify-center gap-2"
        >
          {profileData && typeof profileData === 'object' && Object.keys(profileData).length > 0 && (
            <span className="text-emerald-400 text-sm leading-none mt-[-2px]">✓</span>
          )}
          Visuals & Personality ✨
        </Link>
      </div>

      {/* VICTIM GENDER MISMATCH CONFIRMATION POP-UP */}
      {pendingVictimGuestId && (() => {
        const pendingGuest = guests.find((g) => g.id === pendingVictimGuestId);
        const baselineGender =
          character.gender === 'male' || character.gender === 'female'
            ? character.gender
            : profileData?.gender || 'their original gender';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-amber-400/50 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 text-white">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Gender Mismatch Heads-Up
                </span>
                <h3 className="text-xl font-black text-white">
                  Assign {pendingGuest?.name} as The Victim?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  The Victim role (<strong>{roleTitle}</strong>) is set as{' '}
                  <strong className="text-amber-300 uppercase">{baselineGender}</strong>, while{' '}
                  <strong>{pendingGuest?.name}</strong> is listed as{' '}
                  <strong className="text-amber-300 uppercase">{pendingGuest?.gender}</strong>.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Some pre-written clues or pronouns in the story may occasionally misgender them or refer to their original gender. Are you happy to proceed with this?
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingVictimGuestId(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-black uppercase tracking-wider text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const guestIdToAssign = pendingVictimGuestId;
                    setPendingVictimGuestId(null);
                    setIsCasting(true);
                    try {
                      await assignGuestToCharacterAction(mysteryId, character.id, guestIdToAssign);
                    } catch (err: any) {
                      alert('Casting failed: ' + err.message);
                    } finally {
                      setIsCasting(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
                >
                  Proceed Anyway →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {isEditing && (
        <CharacterDetailPanel 
          character={character}
          mysteryId={mysteryId}
          allCharacters={allCharacters}
          guests={guests}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  );
}

