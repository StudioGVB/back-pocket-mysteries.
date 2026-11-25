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
  const clues = (mystery as any).clues || [];
  const pkgInfo = getPackageInfoForMaxPlayers(mystery.max_players);
  const populatedRoundsCount = Array.from({ length: pkgInfo.requiredRounds }, (_, idx) => idx + 1).filter(
    (rNum) => clues.some((c: any) => Number(c.round_number || 1) === rNum)
  ).length;

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
  if (plotBeats && plotBeats.length > 0 && populatedRoundsCount >= pkgInfo.requiredRounds) {
    progress += 20;
  }

  const isLive = mystery.status === 'published';

  return (
    <div className="px-8 lg:px-10 py-3.5 max-w-[1500px] mx-auto w-full flex flex-wrap items-center justify-between gap-4">
      {/* Left: Mystery Title & Package / Role / Round Metadata */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
          {mystery.title}
        </h1>
        <span className="px-2.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600 border border-slate-200">
          {pkgInfo.label} ({pkgInfo.rangeLabel} • {pkgInfo.requiredRounds} Rounds)
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
        <span
          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
            populatedRoundsCount >= pkgInfo.requiredRounds
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={`${pkgInfo.label} requires clues across all ${pkgInfo.requiredRounds} investigation rounds`}
        >
          {populatedRoundsCount}/{pkgInfo.requiredRounds} Rounds Clued
        </span>
      </div>

      {/* Right: Readiness Progress & Live / Draft Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-full">
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

        <Link
          href={`/${locale}/builder/mysteries/${id}/status`}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all ${
            isLive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
          title="Click to manage publishing status"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          {isLive ? 'Status: Live on Site' : 'Status: Draft (Not Live)'}
        </Link>
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
