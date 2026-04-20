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
  params: Promise<{ id: string; locale: Locale }>;
}) {
  const { id } = await params;
  const mystery = await getMysteryById(id);

  if (!mystery) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen -m-12 bg-white">
      {/* Studio Header */}
      <div className="px-12 pt-12 pb-6 border-b border-slate-50 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
              {mystery.title}
            </h1>
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400">
              {mystery.status}
            </span>
          </div>
          
          <MysteryStudioNav mysteryId={id} />
        </div>
      </div>

      {/* Studio Content */}
      <div className="flex-grow overflow-auto p-12 bg-white font-sans">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

