import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMysteryById } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { getPackageInfoForMaxPlayers } from '@/utils/localization';

export const unstable_instant = false;

export default async function MysteryStudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;

  const mysteryPromise = getMysteryById(id);
  const relationshipsPromise = getRelationshipsByMysteryId(id);

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <Suspense fallback={<MysteryHeaderSkeleton />}>
          <MysteryHeader
            id={id}
            locale={locale}
            mysteryPromise={mysteryPromise}
            relationshipsPromise={relationshipsPromise}
          />
        </Suspense>
      </header>

      {/* Main Studio Content */}
      <main className="flex-grow animate-in fade-in duration-500 px-8 lg:px-10 pt-8">
        <div className="pb-24 max-w-[1500px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}

async function MysteryHeader({
  id,
  locale,
  mysteryPromise,
  relationshipsPromise,
}: {
  id: string;
  locale: string;
  mysteryPromise: ReturnType<typeof getMysteryById>;
  relationshipsPromise: ReturnType<typeof getRelationshipsByMysteryId>;
}) {
  const [mystery, relationships] = await Promise.all([mysteryPromise, relationshipsPromise]);

  if (!mystery) {
    notFound();
  }

  const characters = (mystery as any).characters || [];
  const plotBeats = (mystery as any).plot_beats || [];
  const pkgInfo = getPackageInfoForMaxPlayers(mystery.max_players);

  // Calculate Progress
  let progress = 0;
  if (mystery.title && mystery.title !== 'Untitled Mystery' && mystery.theme) {
    progress += 20;
  }
  if (
    characters.length >= pkgInfo.requiredCharacters &&
    characters.some((c: any) => c.is_victim)
  ) {
    progress += 20;
  }
  if (relationships.length > 0) {
    progress += 20;
  }
  if (characters.some((c: any) => c.motives && c.motives.length > 0)) {
    progress += 20;
  }
  if (plotBeats && plotBeats.length > 0) {
    progress += 20;
  }

  return (
    <div className="px-8 lg:px-10 py-3.5 max-w-[1500px] mx-auto w-full flex flex-wrap items-center justify-between gap-4">
      {/* Left: Mystery Title & Badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
          {mystery.title}
        </h1>
        <span
          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
            mystery.status === 'published'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-brand-pink/10 text-brand-pink border-brand-pink/20'
          }`}
        >
          {mystery.status === 'published' ? 'Live' : mystery.status}
        </span>
        <span className="px-2.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600 border border-slate-200">
          {pkgInfo.label} ({pkgInfo.rangeLabel})
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
            characters.length >= pkgInfo.requiredCharacters
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {characters.length}/{pkgInfo.requiredCharacters} Roles
        </span>
      </div>

      {/* Right: Completion & Digital Quick Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Ready
          </span>
          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-pink rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-brand-pink">{progress}%</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/mysteries/${id}/cast`}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-black uppercase tracking-wider transition-all"
          >
            Cast View
          </Link>
          <Link
            href={`/${locale}/play/${id}`}
            target="_blank"
            className="px-3.5 py-1.5 rounded-lg bg-brand-pink hover:opacity-90 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-xs"
          >
            Live Playroom ↗
          </Link>
        </div>
      </div>
    </div>
  );
}

function MysteryHeaderSkeleton() {
  return (
    <div className="px-8 lg:px-10 py-3.5 max-w-[1500px] mx-auto w-full flex items-center justify-between gap-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 bg-slate-200 rounded w-48" />
        <div className="h-5 bg-slate-100 rounded w-20" />
      </div>
      <div className="h-7 bg-slate-100 rounded-lg w-40" />
    </div>
  );
}
