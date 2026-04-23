// @ts-nocheck
import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { AddCharacterQuickForm } from './_components/AddCharacterQuickForm';
import { CharacterCard } from './_components/CharacterCard';
import { Locale } from '@/lib/i18n-config';

export default async function MysteryCharactersPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const [mystery, characters] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return null;

  // Group characters by importance and role
  const victim = characters.find(c => c.is_victim);
  const killer = characters.find(c => c.plot_role === 'killer' && !c.is_victim);
  const assistant = characters.find(c => c.plot_role === 'assistant' && !c.is_victim);

  const topCharacterIds = new Set([victim?.id, killer?.id, assistant?.id].filter(Boolean));

  const remainingMandatory = characters.filter(c => c.is_mandatory && !topCharacterIds.has(c.id));
  const remainingOptional = characters.filter(c => !c.is_mandatory && !topCharacterIds.has(c.id));

  const mandatoryCount = remainingMandatory.length + topCharacterIds.size;
  const optionalCount = remainingOptional.length;

  const maxCharacters = mystery.complexity === 'easy' ? 10 : mystery.complexity === 'medium' ? 12 : mystery.complexity === 'hard' ? 16 : 10;
  const isAtLimit = characters.length >= maxCharacters;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Page Header */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-1">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Stage Crew</h1>
              <div className="flex gap-2">
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest bg-slate-200 px-3 py-1 rounded-md">
                  {characters.length} / {maxCharacters} total
                </span>
                <span className="text-[9px] font-black text-brand-pink uppercase tracking-widest bg-brand-pink/5 px-3 py-1 rounded-md">
                  {mandatoryCount} mandatory
                </span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md">
                  {optionalCount} optional
                </span>
              </div>
            </div>
            <p className="text-slate-400 font-medium text-sm">Managing {characters.length} out of {maxCharacters} principal suspects and victims.</p>
          </div>
        </div>

        {/* Action Bar / Quick Add */}
        {!isAtLimit ? (
          <div className="bg-slate-50/50 p-1 rounded-[2.5rem] border border-slate-100 shadow-inner">
            <AddCharacterQuickForm mysteryId={id} />
          </div>
        ) : (
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 text-center flex flex-col items-center justify-center">
             <div className="text-red-400 font-black text-xl mb-1">CAST FULL</div>
             <p className="text-red-500 font-bold text-xs uppercase tracking-widest">You've reached the maximum of {maxCharacters} cast members for this tier.</p>
          </div>
        )}
      </div>

      <div className="space-y-16 pb-20">
        {/* CORE ROLES SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">The Core Roles</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {victim && (
              <CharacterCard character={victim} mysteryId={id} allCharacters={characters} />
            )}
            {!victim && (
              <div className="bg-red-50/30 border border-dashed border-red-100 rounded-[2.5rem] p-10 text-center flex flex-col items-center justify-center">
                <p className="text-red-400 font-black text-xs uppercase tracking-widest">No victim selected</p>
              </div>
            )}
            
            {killer && (
              <CharacterCard character={killer} mysteryId={id} allCharacters={characters} />
            )}
            {!killer && (
              <div className="border-2 border-dashed border-brand-pink/20 rounded-[2.5rem] p-10 text-center flex flex-col items-center justify-center opacity-70">
                <p className="text-brand-pink font-black text-xs uppercase tracking-widest">No killer assigned</p>
              </div>
            )}

            {assistant && (
              <CharacterCard character={assistant} mysteryId={id} allCharacters={characters} />
            )}
            {!assistant && (
              <div className="border-2 border-dashed border-orange-500/20 rounded-[2.5rem] p-10 text-center flex flex-col items-center justify-center opacity-50">
                <p className="text-orange-500 font-black text-xs uppercase tracking-widest">No assistant assigned</p>
                <p className="text-orange-400/70 font-bold text-[9px] uppercase tracking-widest mt-2">(Optional)</p>
              </div>
            )}
          </div>
        </section>

        {/* OTHER MANDATORY CHARACTERS SECTION */}
        {remainingMandatory.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-brand-pink" />
               <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Other Mandatory Characters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remainingMandatory.map((character) => (
                <CharacterCard key={character.id} character={character} mysteryId={id} allCharacters={characters} />
              ))}
            </div>
          </section>
        )}

        {/* OPTIONAL CHARACTERS SECTION */}
        <section className="space-y-6">
           <div className="flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-slate-300" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Optional Characters (5+ Players)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingOptional.map((character) => (
              <CharacterCard key={character.id} character={character} mysteryId={id} allCharacters={characters} />
            ))}
            <div className="border-2 border-dashed border-slate-50 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-20 h-full min-h-[200px]">
               <span className="text-2xl mb-2">➕</span>
               <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Add suspect for larger parties</p>
            </div>
          </div>
        </section>
      </div>

      {characters.length === 0 && (
         /* Large Empty State */
         <div className="border-2 border-dashed border-slate-100 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center opacity-50 bg-white/50">
           <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-sm">🎭</div>
           <h3 className="text-2xl font-black text-slate-900 mb-2">The Stage is Empty</h3>
           <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
             Every great mystery needs a cast of compelling characters. Start by adding your first mandatory suspect!
           </p>
         </div>
      )}
    </div>
  );
}
