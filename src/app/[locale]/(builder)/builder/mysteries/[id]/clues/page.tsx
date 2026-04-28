import React from 'react';
import { getCluesByMysteryId, getMysteryById, getPlotBeatsByMysteryId, getCharactersByMysteryId } from '@/services/mysteries';
import { ClueGrid } from './_components/ClueGrid';
import { Locale } from '@/lib/i18n-config';

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

  const subplots = mystery.subplots || [];
  const subplotBeatsCount = subplots.reduce((acc: number, sub: any) => acc + (sub.subplot_beats?.length || 0), 0);
  const targetTotal = (beats.length * 2) + (subplotBeatsCount * 1);
  
  const realClues = clues.filter(c => c.linked_plot_beat_id);
  const fakeClues = clues.filter(c => c.linked_subplot_beat_id);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Clue Board</h1>
          <p className="text-slate-500 font-medium">Manage evidence, link discoveries, and plant red herrings.</p>
        </div>
        
        <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-sm">
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">{clues.length} / {targetTotal}</div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Created</div>
          </div>
          <div className="w-px h-6 bg-slate-100"></div>
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">
               {clues.filter(c => c.is_essential).length}
             </div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-brand-blue">Essential</div>
          </div>
          <div className="w-px h-6 bg-slate-100"></div>
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">
               {realClues.length}
             </div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Real Storyline</div>
          </div>
          <div className="w-px h-6 bg-slate-100"></div>
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">
               {fakeClues.length}
             </div>
             <div className="text-[8px] font-black uppercase tracking-widest text-brand-pink">Fake / Red Herrings</div>
          </div>
        </div>
      </div>

      <ClueGrid 
        mystery={mystery}
        mysteryId={id} 
        clues={clues} 
        beats={beats}
        characters={characters}
        subplots={mystery.subplots || []}
      />
    </div>
  );
}
