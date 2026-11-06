import React, { useState } from 'react';
import { Database, MotiveType, VictimRelationship, Archetype } from '@/types/database';
import { updateCharacterAction, assignGuestToCharacterAction } from '../actions';
import { MotiveManager } from './MotiveManager';

type Motive = Database['public']['Tables']['motives']['Row'];
type Character = Database['public']['Tables']['characters']['Row'] & { motives?: Motive[] };

interface CharacterDetailPanelProps {
  character: Character;
  mysteryId: string;
  allCharacters: Character[];
  guests: any[];
  onClose: () => void;
}

import { RoleTitleInput } from './RoleTitleInput';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { getCharacterRoleTitle, getCharacterPrefix } from '@/utils/hydration';

export function CharacterDetailPanel({ character, mysteryId, allCharacters, guests, onClose }: CharacterDetailPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isCasting, setIsCasting] = useState(false);

  const profileData = character.profile_data as any;
  const assignedGuestId = profileData?.guest_id;
  const isLinked = profileData?.is_linked;
  const initialRoleTitle = getCharacterRoleTitle(character);
  const initialPrefix = getCharacterPrefix(character);

  const archetypes: Archetype[] = ['hero', 'villain', 'sidekick', 'victim', 'witness', 'investigator'];
  const relationships: VictimRelationship[] = ['spouse', 'sibling', 'friend', 'enemy', 'stranger', 'colleague'];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="p-10 flex-grow">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-slate-900">Edit Profile</h2>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-12">
            <form 
              action={async (formData) => {
                setIsSaving(true);
                const plot_role = formData.get('plot_role') as any;
                const is_victim = plot_role === 'victim';
                const is_mandatory = formData.get('is_mandatory') === 'on' || is_victim;
                const gender = formData.get('gender') as any;

                const relationshipValue = formData.get('victim_relationship');

                const title = ((formData.get('title') as string) || initialRoleTitle).trim();
                const prefix = ((formData.get('prefix') as string) || '').trim();
                const name = `${title}|${title}|${prefix}`;

                const updates = {
                  name,
                  archetype: null,
                  is_mandatory,
                  is_victim,
                  plot_role,
                  gender,
                  victim_relationship: (relationshipValue ? relationshipValue : null) as VictimRelationship | null,
                };
                await updateCharacterAction(mysteryId, character.id, updates);
                setIsSaving(false);
                onClose();
              }}
              className="space-y-8"
            >
              {/* Base Identity */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-2">Identity</h3>
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-2">Character Title / Role</label>
                      <RoleTitleInput 
                        mysteryId={mysteryId}
                        defaultValue={initialRoleTitle}
                        inputClassName="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">Prefix (Optional)</label>
                      <input 
                        name="prefix"
                        defaultValue={initialPrefix}
                        placeholder="e.g. Captain"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">Gender</label>
                      <CustomSelect 
                        name="gender"
                        defaultValue={character.gender || 'adaptable'}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all"
                      >
                         <option value="adaptable">Adaptable ⚧</option>
                         <option value="female">Female ♀</option>
                         <option value="male">Male ♂</option>
                      </CustomSelect>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-3 cursor-pointer p-1">
                        <input 
                          type="checkbox" 
                          name="is_mandatory"
                          defaultChecked={character.is_mandatory}
                          className="w-6 h-6 rounded-lg accent-slate-900" 
                        />
                        <span className="text-xs font-bold text-slate-500">Mandatory Core Profile?</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Actor Casting */}
              {guests.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-2">Actor Casting</h3>
                  
                  <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                    <div className="flex items-center gap-4 overflow-hidden w-full sm:w-auto">
                      <div className="w-14 h-14 rounded-2xl bg-white overflow-hidden flex items-center justify-center border border-slate-200/60 shrink-0 shadow-sm">
                        {profileData?.avatar_url ? (
                          <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">🎭</span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-800 truncate">
                            {profileData?.guest_name || profileData?.name || 'Unassigned'}
                          </p>
                          {assignedGuestId && (
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                              isLinked ? 'bg-brand-pink/5 text-brand-pink' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {isLinked ? 'Connected' : 'Roster'}
                            </span>
                          )}
                        </div>
                        {profileData?.gender ? (
                          <p className="text-[10px] font-bold text-slate-400 capitalize truncate mt-1">
                            {profileData.gender} {profileData.eye_color ? `• ${profileData.eye_color} eyes` : ''} {profileData.height ? `• ${profileData.height}` : ''}
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold text-slate-400 truncate mt-1">No guest casted yet</p>
                        )}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto shrink-0">
                      <CustomSelect
                        value={assignedGuestId || ''}
                        disabled={isCasting}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setIsCasting(true);
                          try {
                            await assignGuestToCharacterAction(mysteryId, character.id, val ? val : null);
                          } catch (err: any) {
                            alert('Casting failed: ' + err.message);
                          } finally {
                            setIsCasting(false);
                          }
                        }}
                        className="w-full sm:w-auto bg-white border border-slate-200 text-xs font-black uppercase tracking-wider rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand-pink/20 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                      >
                        <option value="">-- Clear Casting --</option>
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
                </div>
              )}

              {/* Story Roles */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-2">Story Roles</h3>
                <div className="grid gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Plot Role</label>
                    <div className="flex flex-wrap gap-2">
                       {['innocent', 'killer', 'assistant', 'victim'].map((role) => (
                         <label key={role} className="cursor-pointer">
                           <input 
                             type="radio" 
                             name="plot_role" 
                             value={role} 
                             defaultChecked={character.plot_role === role || (role === 'victim' && character.is_victim)}
                             className="peer sr-only"
                           />
                           <span className="px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 peer-checked:bg-brand-pink peer-checked:text-white peer-checked:border-brand-pink transition-all inline-block">
                             {role}
                           </span>
                         </label>
                       ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Relationship to Victim</label>
                    <CustomSelect 
                      name="victim_relationship"
                      defaultValue={character.victim_relationship || ''}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all"
                    >
                       <option value="">Select Relationship...</option>
                       {relationships.map(r => (
                         <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                       ))}
                    </CustomSelect>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <button 
                   type="button" 
                   onClick={onClose}
                   className="flex-grow py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all font-sans"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit"
                   disabled={isSaving}
                   className="flex-grow py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-pink transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
                 >
                   {isSaving ? 'Updating...' : 'Save Profile'}
                 </button>
              </div>
            </form>

            {/* Separate Motive Management */}
            <MotiveManager 
              mysteryId={mysteryId}
              characterId={character.id}
              existingMotives={character.motives || []}
              allCharacters={allCharacters}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

