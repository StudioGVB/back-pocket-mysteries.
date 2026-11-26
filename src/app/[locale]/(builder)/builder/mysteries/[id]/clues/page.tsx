import React, { Suspense } from 'react';
import {
  getCluesByMysteryId,
  getMysteryById,
  getPlotBeatsByMysteryId,
  getCharactersByMysteryId,
} from '@/services/mysteries';
import { OgPlotAndEvidenceStudio } from './_components/OgPlotAndEvidenceStudio';

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">
            Plot &amp; Evidence
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Main murder timeline beats, red-herring subplots, and round-by-round evidence deck synced from the OG Base Builder.
          </p>
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
    beatsPromise,
  ]);

  if (!mystery) return null;

  const clues =
    Array.isArray((mystery as any).clues) && (mystery as any).clues.length > 0
      ? (mystery as any).clues
      : rawClues;
  const beats =
    Array.isArray((mystery as any).plot_beats) &&
    (mystery as any).plot_beats.length > 0
      ? (mystery as any).plot_beats
      : rawBeats;

  const subplots = mystery.subplots || [];
  const realClues = clues.filter(
    (c: any) =>
      c.evidence_status !== 'fake' &&
      c.implication_type !== 'red_herring' &&
      !(c.linked_subplot_beat_id && !c.linked_plot_beat_id)
  );
  const fakeClues = clues.filter(
    (c: any) =>
      c.evidence_status === 'fake' ||
      c.implication_type === 'red_herring' ||
      Boolean(c.linked_subplot_beat_id && !c.linked_plot_beat_id)
  );

  return (
    <div className="bg-white border border-slate-200/80 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-xs">
      <div className="text-center">
        <div className="text-lg font-black text-slate-900 leading-none mb-1">
          {beats.length}
        </div>
        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-600">
          Plot Beats
        </div>
      </div>
      <div className="w-px h-6 bg-slate-100"></div>
      <div className="text-center">
        <div className="text-lg font-black text-slate-900 leading-none mb-1">
          {subplots.length}
        </div>
        <div className="text-[8px] font-black uppercase tracking-widest text-amber-600">
          Red-Herring Arcs
        </div>
      </div>
      <div className="w-px h-6 bg-slate-100"></div>
      <div className="text-center">
        <div className="text-lg font-black text-slate-900 leading-none mb-1">
          {realClues.length}
        </div>
        <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">
          Real Clues
        </div>
      </div>
      <div className="w-px h-6 bg-slate-100"></div>
      <div className="text-center">
        <div className="text-lg font-black text-slate-900 leading-none mb-1">
          {fakeClues.length}
        </div>
        <div className="text-[8px] font-black uppercase tracking-widest text-brand-pink">
          Decoy Clues
        </div>
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
    charactersPromise,
  ]);

  if (!mystery) return null;

  const clues =
    Array.isArray((mystery as any).clues) && (mystery as any).clues.length > 0
      ? (mystery as any).clues
      : rawClues;
  const beats =
    Array.isArray((mystery as any).plot_beats) &&
    (mystery as any).plot_beats.length > 0
      ? (mystery as any).plot_beats
      : rawBeats;
  const characters =
    Array.isArray((mystery as any).characters) &&
    (mystery as any).characters.length > 0
      ? (mystery as any).characters
      : rawCharacters;

  return (
    <OgPlotAndEvidenceStudio
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
      <div className="bg-white border border-slate-100 rounded-[32px] p-8 h-24 w-full"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm h-[320px] p-6 space-y-4"
          >
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
