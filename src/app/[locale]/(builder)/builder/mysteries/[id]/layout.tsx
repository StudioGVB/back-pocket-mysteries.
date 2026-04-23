import React from 'react';
import { notFound } from 'next/navigation';
import { getCharactersByMysteryId, getMysteryById, getPlotBeatsByMysteryId } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { MysteryStudioNav } from '@/components/builder/MysteryStudioNav';
import { Locale } from '@/lib/i18n-config';
import Link from 'next/link';

export default async function MysteryStudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const [mystery, characters, relationships, plotBeats] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id),
    getRelationshipsByMysteryId(id),
    getPlotBeatsByMysteryId(id)
  ]);

  if (!mystery) {
    notFound();
  }

  // Calculate Progress
  let progress = 0;
  
  if (mystery.title && mystery.title !== 'Untitled Mystery' && mystery.theme) {
    progress += 20;
  }
  if (characters.length > 1 && characters.some((c: any) => c.is_victim)) {
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
    <div className="flex flex-col min-h-full bg-[#f8fafc]">
      <header className="sticky top-0 z-40 bg-slate-900 border-l border-slate-800">
        <div className="px-12 pt-6 pb-10 max-w-[1600px] mx-auto w-full">
          {/* Top Tier: Identity & Actions */}
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">🕵️</div>
              <div>
                 <div className="flex items-center gap-3">
                   <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                     {mystery.title}
                   </h1>
                   <span className="px-2 py-0.5 bg-brand-pink/20 rounded-md text-[8px] font-black uppercase tracking-widest text-brand-pink border border-brand-pink/20">
                     {mystery.status}
                   </span>
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Mystery Builder Studio</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
               {progress < 100 ? (
                 <div className="flex flex-col items-end gap-1.5">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completion</span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">{progress}%</span>
                   </div>
                   <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-brand-pink rounded-full transition-all duration-1000 ease-out"
                       style={{ width: `${progress}%` }}
                     />
                   </div>
                 </div>
               ) : (
                 <Link 
                   href={`/${locale}/builder/mysteries/${id}/compile`}
                   className="px-6 py-3 bg-brand-pink hover:bg-[#FF3366] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-pink/20 transition-all flex items-center gap-2"
                 >
                   <span>Preview Package</span>
                   <span>📦</span>
                 </Link>
               )}
            </div>
          </div>
        </div>

        {/* Bottom Tier: Pinned Navigation */}
        <div className="w-full">
          <MysteryStudioNav mysteryId={id} />
        </div>
      </header>

      {/* Main Studio Content */}
      <main className="flex-grow animate-in fade-in duration-700 px-12 pt-10">
        <div className="pb-24 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

