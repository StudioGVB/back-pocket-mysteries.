import React, { Suspense } from 'react';
import { getCluesByMysteryId, getMysteryById, getPlotBeatsByMysteryId, getCharactersByMysteryId } from '@/services/mysteries';
import { ClueGrid } from './_components/ClueGrid';
import { Locale } from '@/lib/i18n-config';

export const unstable_instant = false;

export default async function MysteryCluesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  
  const mysteryPromise = getMysteryById(id);
  const cluesPromise = getCluesByMysteryId(id);
  const beatsPromise = getPlotBeatsByMysteryId(id);
  const charactersPromise = getCharactersByMysteryId(id);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Clue Board</h1>
          <p className="text-slate-500 font-medium">Manage evidence, link discoveries, and plant red herrings.</p>
        </div>
        
        <Suspense fallback={<CluesStatsSkeleton />}>
          <CluesStats 
            mysteryPromise={mysteryPromise}
            cluesPromise={cluesPromise}
            beatsPromise={beatsPromise}
          />
        </Suspense>
      </div>

      <Suspense fallback={<CluesContentSkeleton />}>
        <CluesContent
          id={id}
          mysteryPromise={mysteryPromise}
          cluesPromise={cluesPromise}
          beatsPromise={beatsPromise}
          charactersPromise={charactersPromise}
        />
      </Suspense>
    </div>
  );
}

async function CluesStats({
  mysteryPromise,
  cluesPromise,
  beatsPromise,
}: {
  mysteryPromise: ReturnType<typeof getMysteryById>;
  cluesPromise: ReturnType<typeof getCluesByMysteryId>;
  beatsPromise: ReturnType<typeof getPlotBeatsByMysteryId>;
}) {
  const [mystery, rawClues, rawBeats] = await Promise.all([
    mysteryPromise,
    cluesPromise,
    beatsPromise
  ]);

  if (!mystery) return null;

  const clues = Array.isArray((mystery as any).clues) && (mystery as any).clues.length > 0 ? (mystery as any).clues : rawClues;
  const beats = Array.isArray((mystery as any).plot_beats) && (mystery as any).plot_beats.length > 0 ? (mystery as any).plot_beats : rawBeats;

  const subplots = mystery.subplots || [];
  const subplotBeatsCount = subplots.reduce((acc: number, sub: any) => acc + (sub.subplot_beats?.length || 0), 0);
  const targetTotal = Math.max(clues.length, (beats.length * 2) + (subplotBeatsCount * 1));
  
  const realClues = clues.filter((c: any) => c.evidence_status !== 'fake' && Boolean(c.linked_plot_beat_id) && c.implication_type !== 'red_herring');
  const fakeClues = clues.filter((c: any) => c.evidence_status === 'fake' || !c.linked_plot_beat_id || c.implication_type === 'red_herring');

  return (
    <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-sm">
      <div className="text-center">
         <div className="text-lg font-black text-slate-900 leading-none mb-1">{clues.length} / {targetTotal}</div>
         <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Created</div>
      </div>
      <div className="w-px h-6 bg-slate-100"></div>
      <div className="text-center">
         <div className="text-lg font-black text-slate-900 leading-none mb-1">
           {clues.filter((c: any) => c.is_essential).length}
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
  );
}

async function CluesContent({
  id,
  mysteryPromise,
  cluesPromise,
  beatsPromise,
  charactersPromise,
}: {
  id: string;
  mysteryPromise: ReturnType<typeof getMysteryById>;
  cluesPromise: ReturnType<typeof getCluesByMysteryId>;
  beatsPromise: ReturnType<typeof getPlotBeatsByMysteryId>;
  charactersPromise: ReturnType<typeof getCharactersByMysteryId>;
}) {
  const [mystery, rawClues, rawBeats, rawCharacters] = await Promise.all([
    mysteryPromise,
    cluesPromise,
    beatsPromise,
    charactersPromise
  ]);

  if (!mystery) return null;

  const clues = Array.isArray((mystery as any).clues) && (mystery as any).clues.length > 0 ? (mystery as any).clues : rawClues;
  const beats = Array.isArray((mystery as any).plot_beats) && (mystery as any).plot_beats.length > 0 ? (mystery as any).plot_beats : rawBeats;
  const characters = Array.isArray((mystery as any).characters) && (mystery as any).characters.length > 0 ? (mystery as any).characters : rawCharacters;

  return (
    <ClueGrid 
      mystery={mystery}
      mysteryId={id} 
      clues={clues} 
      beats={beats}
      characters={characters}
      subplots={mystery.subplots || []}
    />
  );
}

function CluesStatsSkeleton() {
  return (
    <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl w-[380px] h-[52px] animate-pulse shadow-sm"></div>
  );
}

function CluesContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Discovery Log Skeleton */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-8 h-24 w-full"></div>
      {/* Created Evidence Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm h-[320px] p-6 space-y-4">
            <div className="h-48 bg-slate-50 rounded-2xl w-full"></div>
            <div className="space-y-3">
              <div className="h-6 bg-slate-50 rounded w-2/3"></div>
              <div className="h-4 bg-slate-50 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

