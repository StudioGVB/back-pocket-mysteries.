import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { RelationshipGraph } from './_components/RelationshipGraph';
import { RelationshipMatrix } from './_components/RelationshipMatrix';
import { MotiveManager } from '../characters/_components/MotiveManager';
import { Locale } from '@/lib/i18n-config';

export default async function MysteryRelationshipsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const [mystery, characters, relationships] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id),
    getRelationshipsByMysteryId(id)
  ]);

  if (!mystery) return null;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* 1. Header & Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">Relationship Studio</h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl">
            Map out the bonds, rivalries, and dirty secrets connecting your cast of characters.
          </p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-white border border-slate-100 px-6 py-4 rounded-[2rem] shadow-sm">
             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Bonds</div>
             <div className="text-2xl font-black text-slate-900 leading-none">
               {relationships.filter(r => r.know_each_other).length}
             </div>
           </div>
           <div className="bg-white border border-slate-100 px-6 py-4 rounded-[2rem] shadow-sm">
             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 text-brand-pink">Lethal Motives</div>
             <div className="text-2xl font-black text-slate-900 leading-none">
               {characters.reduce((acc, char) => acc + (char.motives?.length || 0), 0)}
             </div>
           </div>
        </div>
      </div>

      {characters.length < 2 ? (
        <div className="border-2 border-dashed border-slate-100 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center opacity-50 bg-white/50">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-sm">🎭</div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Cast is Missing</h3>
          <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
            You need at least two characters to start mapping relationships. Head over to the Characters section to add more!
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* 2. The Relationship Map (Visual) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-brand-pink" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Relationship Map</h2>
            </div>
            <RelationshipGraph characters={characters} relationships={relationships} />
          </section>

          {/* 3. The Relationship Matrix (Settings) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Relationship Matrix</h2>
            </div>
            <RelationshipMatrix mysteryId={id} characters={characters} relationships={relationships} />
          </section>

          {/* 4. Murder Motives (Stakes) */}
          <section className="space-y-10 pt-10 border-t border-slate-100">
            <div className="flex items-center gap-3">
               <span className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/20" />
               <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">The Stakes: Murder Motives</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {characters.filter(c => !c.is_victim).map((character) => (
                <div key={character.id} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8 hover:shadow-xl hover:shadow-slate-200/20 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">👤</div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">{character.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{character.archetype}</p>
                    </div>
                  </div>

                  <MotiveManager 
                    mysteryId={id}
                    characterId={character.id}
                    existingMotives={character.motives || []}
                    allCharacters={characters}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
