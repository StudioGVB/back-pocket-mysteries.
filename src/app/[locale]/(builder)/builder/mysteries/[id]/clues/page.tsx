import React from 'react';
import { getCluesByMysteryId, getMysteryById, getPlotBeatsByMysteryId, getCharactersByMysteryId } from '@/services/mysteries';
import { ClueGrid } from './_components/ClueGrid';

export default async function MysteryCluesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const [mystery, clues, beats, characters] = await Promise.all([
    getMysteryById(id),
    getCluesByMysteryId(id),
    getPlotBeatsByMysteryId(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Clue Board</h1>
          <p className="text-slate-500 font-medium">Manage evidence, link discoveries, and plant red herrings.</p>
        </div>
        
        <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-sm">
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">{clues.length}</div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total</div>
          </div>
          <div className="w-px h-6 bg-slate-100"></div>
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">
               {clues.filter(c => c.is_essential).length}
             </div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-brand-blue">Essential</div>
          </div>
        </div>
      </div>

      <ClueGrid 
        mysteryId={id} 
        clues={clues} 
        beats={beats}
        characters={characters}
      />
    </div>
  );
}
