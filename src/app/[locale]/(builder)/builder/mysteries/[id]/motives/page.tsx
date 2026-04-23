// @ts-nocheck
import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { MotiveManager } from '../characters/_components/MotiveManager';
import { AIGenerateMotivesButton } from '../relationships/_components/AIGenerateMotivesButton';

export default async function MysteryMotivesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const [mystery, rowCharacters] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id),
  ]);

  if (!mystery) return null;

  // Syncing with Characters Page logic: Strip out hidden/duplicate victims or broken rows
  const victim = rowCharacters.find(c => c.is_victim);
  const mandatorySuspects = rowCharacters.filter(c => c.is_mandatory && !c.is_victim);
  const optionalSuspects = rowCharacters.filter(c => !c.is_mandatory && !c.is_victim);
  
  const activeCharacters = [
    ...(victim ? [victim] : []),
    ...mandatorySuspects,
    ...optionalSuspects
  ];

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">Character Motives</h2>
          <p className="text-slate-400 font-medium text-sm">Define the stakes and reasons for murder for {activeCharacters.length} characters.</p>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex gap-4">
             <div className="bg-white border border-slate-100 px-6 py-4 rounded-[2rem] shadow-sm">
               <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 text-brand-pink">Total Motives</div>
               <div className="text-2xl font-black text-slate-900 leading-none">
                 {activeCharacters.reduce((acc, char) => acc + (char.motives?.length || 0), 0)}
               </div>
             </div>
           </div>
        </div>
      </div>

      {activeCharacters.length < 2 ? (
        <div className="border-2 border-dashed border-slate-100 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center opacity-50 bg-white/50">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-sm">🔪</div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">No Suspects</h3>
          <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
            You need characters to have motives! Head over to the Characters section to add more.
          </p>
        </div>
      ) : (
        <section className="space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/20" />
               <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">The Stakes: Murder Motives</h2>
            </div>
            <AIGenerateMotivesButton mysteryId={id} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {activeCharacters.map((character) => (
              <div key={character.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-6 hover:shadow-md hover:border-slate-200 transition-all">
                <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-xl shadow-inner flex-shrink-0">
                    {character.is_victim ? '💀' : '👤'}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-none mb-1.5">{character.name.split('|')[0]}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      character.is_victim ? 'text-red-500' :
                      character.plot_role === 'killer' ? 'text-orange-500' :
                      character.plot_role === 'assistant' ? 'text-blue-500' : 'text-emerald-500'
                    }`}>
                      {character.name.includes('|') ? character.name.split('|')[1] : (character.archetype || character.plot_role || 'Suspect')}
                    </p>
                  </div>
                </div>

                <MotiveManager 
                  mysteryId={id}
                  characterId={character.id}
                  existingMotives={character.motives || []}
                  allCharacters={activeCharacters}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
