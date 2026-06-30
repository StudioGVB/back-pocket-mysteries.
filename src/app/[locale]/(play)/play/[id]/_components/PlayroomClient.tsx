"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { hydrateTextWithCharacters } from '@/utils/hydration';

interface Mystery {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  image_url: string | null;
  current_round: number | null;
}

interface Character {
  id: string;
  name: string;
  archetype: string | null;
  gender: string;
  image_url: string | null;
  profile_data: any;
}

interface Relationship {
  id: string;
  character_a_id: string;
  character_b_id: string;
  know_each_other: boolean;
  dynamics: string[] | null;
  notes: string | null;
}

interface Clue {
  id: string;
  title: string;
  description: string | null;
  clue_type: string | null;
  static_image_url: string | null;
  round_number: number | null;
}

interface PlayroomClientProps {
  mystery: Mystery;
  characters: Character[];
  relationships: Relationship[];
  clues: Clue[];
}

export function PlayroomClient({ mystery, characters, relationships, clues }: PlayroomClientProps) {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'relations' | 'clues'>('profile');

  const selectedChar = characters.find(c => c.id === selectedCharId);

  // Helper to split character name
  const parseName = (fullName: string) => {
    const parts = fullName.split('|');
    return {
      name: parts[0]?.trim() || fullName,
      archetype: parts[1]?.trim() || 'Suspect'
    };
  };

  if (!selectedCharId || !selectedChar) {
    // ----------------------------------------------------
    // CHARACTER SELECTION LOBBY
    // ----------------------------------------------------
    return (
      <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans antialiased">
        {/* Banner with cover photo overlay */}
        <div className="relative h-[40vh] w-full flex items-end justify-center overflow-hidden border-b border-white/5">
          {mystery.image_url ? (
            <Image
              src={mystery.image_url}
              alt={mystery.title}
              fill
              className="object-cover opacity-30 blur-[2px]"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#070b13]/80 to-transparent" />
          
          <div className="relative z-10 text-center max-w-3xl px-6 pb-10">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-pink bg-brand-pink/10 px-3.5 py-1.5 rounded-full border border-brand-pink/20 mb-4 inline-block">
              {mystery.theme || 'Murder Mystery Party'}
            </span>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mt-2 mb-4 leading-none">
              {mystery.title}
            </h1>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl mx-auto">
              {mystery.description}
            </p>
          </div>
        </div>

        {/* Character Selection Grid */}
        <div className="flex-grow max-w-5xl mx-auto w-full px-6 py-12">
          <div className="text-center mb-10">
            <h2 className="text-xl font-black uppercase tracking-wider text-white">Choose Your Character</h2>
            <p className="text-slate-500 text-xs font-semibold mt-1">Select your assigned character to unlock your digital guide.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map(char => {
              const { name, archetype } = parseName(char.name);
              
              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className="bg-slate-900/40 border border-white/5 hover:border-brand-pink/50 hover:bg-slate-900/60 rounded-[2rem] p-6 text-left transition-all duration-300 group flex flex-col items-center text-center shadow-lg active:scale-[0.98]"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-white/10 group-hover:border-brand-pink/40 transition-colors bg-slate-950/60 flex items-center justify-center relative">
                    {char.image_url ? (
                      <Image
                        src={char.image_url}
                        alt={name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-white group-hover:text-brand-pink transition-colors">
                    {name}
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 bg-white/5 px-2.5 py-1 rounded-full">
                    {archetype}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // GUEST DASHBOARD (CHARACTER ACTIVE)
  // ----------------------------------------------------
  const { name: selectedName, archetype: selectedArchetype } = parseName(selectedChar.name);
  const profile = selectedChar.profile_data || {};
  const outfitUrl = selectedChar.gender === 'adaptable'
    ? (profile.presentation_female?.outfit_image_url || profile.presentation_male?.outfit_image_url)
    : profile.outfit_image_url;

  // Filter and format connections
  const charConnections = relationships
    .filter(r => r.know_each_other && (r.character_a_id === selectedChar.id || r.character_b_id === selectedChar.id))
    .map(r => {
      const otherId = r.character_a_id === selectedChar.id ? r.character_b_id : r.character_a_id;
      const otherChar = characters.find(c => c.id === otherId);
      return {
        relationship: r,
        character: otherChar
      };
    })
    .filter(conn => conn.character !== undefined) as { relationship: Relationship; character: Character }[];

  const currentRound = mystery.current_round ?? 0;

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans antialiased">
      {/* Player Header */}
      <header className="bg-slate-950/60 border-b border-white/5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto w-full px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 relative bg-slate-900">
              {selectedChar.image_url ? (
                <Image
                  src={selectedChar.image_url}
                  alt={selectedName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
              )}
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight">{selectedName}</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                {selectedArchetype} • {currentRound === 0 ? 'Lobby' : currentRound === 5 ? 'Reveal' : `Round ${currentRound}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedCharId(null)}
            className="text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-xl bg-white/5 border border-white/5"
          >
            Change Character
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-white/5">
          <div className="max-w-4xl mx-auto w-full px-4 py-2.5 flex items-center gap-1.5 justify-center">
            {(['profile', 'relations', 'clues'] as const).map(tabKey => {
              const labelMap = {
                profile: 'Your Profile',
                relations: 'Relationships',
                clues: 'Clue Board'
              };
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 border ${
                    isActive
                      ? 'bg-brand-pink/15 text-brand-pink border-brand-pink/30 shadow-[0_0_15px_rgba(254,4,198,0.1)]'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {labelMap[tabKey]}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-8">
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Bio Card */}
            <div className="bg-slate-900/30 border border-white/5 rounded-[2rem] p-8 shadow-sm">
              <h2 className="text-lg font-black uppercase tracking-wider text-white mb-4 border-b border-white/5 pb-3">Biography</h2>
              <p className="text-slate-300 text-sm font-medium leading-relaxed font-sans">
                {hydrateTextWithCharacters(profile.bio || 'No biography details loaded.', characters, 'print')}
              </p>
            </div>

            {/* Secrets Card */}
            {profile.secrets && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                <h2 className="text-lg font-black uppercase tracking-wider text-red-400 mb-4 border-b border-red-500/10 pb-3 flex items-center gap-2">
                  <span>🤫</span> Secrets & Motivation
                </h2>
                <p className="text-slate-300 text-sm font-medium leading-relaxed font-sans">
                  {hydrateTextWithCharacters(profile.secrets, characters, 'print')}
                </p>
              </div>
            )}

            {/* Outfits Card */}
            {(profile.outfit_description || outfitUrl) && (
              <div className="bg-slate-900/30 border border-white/5 rounded-[2rem] p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-white mb-4 border-b border-white/5 pb-3">Outfit & Dressing</h2>
                  <p className="text-slate-300 text-sm font-medium leading-relaxed font-sans">
                    {profile.outfit_description || 'Dress according to your character\'s theme and style.'}
                  </p>
                </div>
                {outfitUrl && (
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                    <Image
                      src={outfitUrl}
                      alt={`${selectedName} Outfit`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'relations' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/30 border border-white/5 rounded-[2rem] p-8 shadow-sm">
              <h2 className="text-lg font-black uppercase tracking-wider text-white mb-6 border-b border-white/5 pb-3">Social Connections</h2>
              
              {charConnections.length === 0 ? (
                <p className="text-slate-500 text-sm font-medium">You don't have any seeded connections with other characters.</p>
              ) : (
                <div className="space-y-6">
                  {charConnections.map(conn => {
                    const { name: otherName, archetype: otherArch } = parseName(conn.character.name);
                    const dynamics = conn.relationship.dynamics;
                    const notes = conn.relationship.notes;
                    
                    return (
                      <div key={conn.character.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 relative bg-slate-950">
                            {conn.character.image_url ? (
                              <Image
                                src={conn.character.image_url}
                                alt={otherName}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white">{otherName}</h3>
                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{otherArch}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          {dynamics && dynamics.length > 0 && (
                            <div>
                              <span className="font-black text-brand-pink uppercase tracking-widest text-[9px] block">Dynamics</span>
                              <span className="text-slate-300 font-bold">{dynamics.join(', ')}</span>
                            </div>
                          )}
                          {notes && (
                            <div>
                              <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block">Secret Knowledge</span>
                              <p className="text-slate-400 font-medium leading-relaxed mt-0.5">
                                {hydrateTextWithCharacters(notes, characters, 'print')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clues' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Evidence & Clues Board</h2>
              <p className="text-slate-500 text-xs font-semibold mt-1">Review all clues discovered throughout the investigation.</p>
            </div>

            {clues.length === 0 ? (
              <div className="bg-slate-900/30 border border-white/5 rounded-[2rem] p-12 text-center text-slate-500 font-medium">
                No clues have been seeded or published for this mystery yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {clues.map(clue => {
                  const isLocked = clue.round_number !== null && clue.round_number > currentRound;

                  if (isLocked) {
                    return (
                      <div
                        key={clue.id}
                        className="bg-slate-950/40 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-lg relative min-h-[300px] justify-center items-center p-8 text-center"
                      >
                        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl mb-4 text-slate-500">
                          🔒
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-1">
                          Round {clue.round_number} Clue
                        </h3>
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed max-w-xs">
                          This clue is locked. It will be revealed on your device once the host starts Round {clue.round_number}.
                        </p>
                      </div>
                    );
                  }

                  const hydratedTitle = hydrateTextWithCharacters(clue.title || 'Evidence', characters, 'print');
                  const hydratedDesc = hydrateTextWithCharacters(clue.description || '', characters, 'print');

                  return (
                    <div
                      key={clue.id}
                      className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-lg relative min-h-[300px]"
                    >
                      {clue.static_image_url ? (
                        <div className="relative h-44 w-full bg-slate-950 flex-shrink-0">
                          <Image
                            src={clue.static_image_url}
                            alt={hydratedTitle}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/90 to-transparent pointer-events-none z-10" />
                        </div>
                      ) : (
                        <div className="relative h-20 w-full bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
                          <span className="text-3xl opacity-30">🔍</span>
                        </div>
                      )}

                      <div className="p-6 flex-grow flex flex-col relative z-20 bg-slate-900/20">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h3 className="text-sm font-black uppercase tracking-wider text-white select-all">
                            {hydratedTitle}
                          </h3>
                          {clue.clue_type && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink border border-brand-pink/20 shrink-0">
                              {clue.clue_type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 leading-relaxed font-sans select-all whitespace-pre-line mt-2">
                          {hydratedDesc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-white/5 text-center text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-950/20">
        Back Pocket Games Studio Playroom
      </footer>
    </div>
  );
}
