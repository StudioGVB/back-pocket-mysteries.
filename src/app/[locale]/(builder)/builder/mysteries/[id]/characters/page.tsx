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
  const mandatorySuspects = characters.filter(c => c.is_mandatory && !c.is_victim);
  const optionalSuspects = characters.filter(c => !c.is_mandatory && !c.is_victim);

  const mandatoryCount = mandatorySuspects.length + (victim ? 1 : 0);
  const optionalCount = optionalSuspects.length;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Page Header */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Characters ({characters.length})</h1>
              <div className="flex gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                  {mandatoryCount} mandatory
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                  {optionalCount} optional
                </span>
              </div>
            </div>
            <p className="text-slate-500 font-medium text-lg">Build your ensemble of suspects, victims, and assistants.</p>
          </div>
        </div>

        {/* Action Bar / Quick Add */}
        <div className="bg-slate-50/50 p-1 rounded-[2.5rem] border border-slate-100 shadow-inner">
          <AddCharacterQuickForm mysteryId={id} />
        </div>
      </div>

      <div className="space-y-16 pb-20">
        {/* THE VICTIM SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">The Victim</h2>
          </div>
          <div className="grid grid-cols-1">
            {victim ? (
              <div className="max-w-2xl">
                <CharacterCard character={victim} mysteryId={id} allCharacters={characters} />
              </div>
            ) : (
              <div className="bg-red-50/30 border border-dashed border-red-100 rounded-[2.5rem] p-10 text-center max-w-2xl">
                <p className="text-red-400 font-black text-xs uppercase tracking-widest">No victim selected — a crime must be committed!</p>
              </div>
            )}
          </div>
        </section>

        {/* MANDATORY CHARACTERS SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-brand-pink" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Mandatory Characters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mandatorySuspects.map((character) => (
              <CharacterCard key={character.id} character={character} mysteryId={id} allCharacters={characters} />
            ))}
            {mandatorySuspects.length < 3 && (
              <div className="border-2 border-dashed border-slate-50 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-30">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest leading-loose">
                  Mandatory Slot <br /> {3 - mandatorySuspects.length} Remaining
                </p>
              </div>
            )}
          </div>
        </section>

        {/* OPTIONAL CHARACTERS SECTION */}
        <section className="space-y-6">
           <div className="flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-slate-300" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Optional Characters (5+ Players)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {optionalSuspects.map((character) => (
              <CharacterCard key={character.id} character={character} mysteryId={id} allCharacters={characters} />
            ))}
            <div className="border-2 border-dashed border-slate-50 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-20">
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
