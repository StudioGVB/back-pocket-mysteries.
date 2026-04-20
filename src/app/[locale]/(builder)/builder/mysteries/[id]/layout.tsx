import React from 'react';
import { notFound } from 'next/navigation';
import { getMysteryById } from '@/services/mysteries';
import { MysteryStudioNav } from '@/components/builder/MysteryStudioNav';
import { Locale } from '@/lib/i18n-config';

export default async function MysteryStudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const mystery = await getMysteryById(id);

  if (!mystery) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Pinned Studio Header / Toolbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 mb-8 shadow-sm">
        <div className="px-12 py-6 space-y-6 max-w-[1600px] mx-auto w-full">
          {/* Top Tier: Identity & Actions */}
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">🕵️</div>
              <div>
                 <div className="flex items-center gap-3">
                   <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                     {mystery.title}
                   </h1>
                   <span className="px-2 py-0.5 bg-brand-pink/10 rounded-md text-[8px] font-black uppercase tracking-widest text-brand-pink border border-brand-pink/10">
                     {mystery.status}
                   </span>
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Mystery Builder Studio</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 transition-all">
                 Preview
               </button>
               <button className="px-6 py-2.5 bg-slate-900 hover:bg-brand-pink text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all">
                 Generate Clues
               </button>
            </div>
          </div>

          {/* Bottom Tier: Pinned Navigation */}
          <div className="overflow-x-auto no-scrollbar pb-1">
            <MysteryStudioNav mysteryId={id} />
          </div>
        </div>
      </header>

      {/* Main Studio Content */}
      <main className="flex-grow animate-in fade-in duration-700 px-12">
        <div className="pb-24 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

