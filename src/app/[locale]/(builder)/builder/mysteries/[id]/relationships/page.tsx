import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { MotiveManager } from '../characters/_components/MotiveManager';

export default async function MysteryRelationshipsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const [mystery, characters] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Relationship Builder</h1>
          <p className="text-slate-500 font-medium">Define how your characters feel about each other and their motives for murder.</p>
        </div>
        
        <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-sm">
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">{characters.length}</div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Characters</div>
          </div>
          <div className="w-px h-6 bg-slate-100"></div>
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">
               {characters.reduce((acc, char) => acc + (char.motives?.length || 0), 0)}
             </div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-brand-pink">Active Motives</div>
          </div>
        </div>
      </div>

      {characters.length < 2 ? (
        <div className="border-2 border-dashed border-slate-100 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center opacity-50 bg-white/50">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-sm">👥</div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Need More Characters</h3>
          <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
            You need at least two characters to start mapping relationships. Head over to the Characters section to add more!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {characters.map((character) => (
            <div key={character.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl">
                  {character.is_victim ? '💀' : '👤'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{character.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{character.archetype}</p>
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
      )}
    </div>
  );
}
