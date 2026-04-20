import React from 'react';
import { getPlotBeatsByMysteryId, getMysteryById, getCharactersByMysteryId } from '@/services/mysteries';
import { TimelineEditor } from './_components/TimelineEditor';
import { MainMurderConfig } from './_components/MainMurderConfig';
import { Locale } from '@/lib/i18n-config';

export default async function MysteryTimelinePage({
  params,
}: {
  params: Promise<{ id: string; locale: Locale }>;
}) {
  const { id } = await params;
  const [mystery, beats, characters] = await Promise.all([
    getMysteryById(id),
    getPlotBeatsByMysteryId(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Plot Timeline</h1>
          <p className="text-slate-500 font-medium">Map out the sequence of events, discoveries, and twists.</p>
        </div>
        
        <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-sm">
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">{beats.length}</div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Beats</div>
          </div>
          <div className="w-px h-6 bg-slate-100"></div>
          <div className="text-center">
             <div className="text-lg font-black text-slate-900 leading-none mb-1">
               {beats.filter(b => b.beat_type === 'twist').length}
             </div>
             <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-brand-pink">Twists</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <MainMurderConfig mystery={mystery} characters={characters} />
        
        <TimelineEditor 
          mysteryId={id} 
          initialBeats={beats} 
          allCharacters={characters}
        />
      </div>
    </div>
  );
}
