import React, { Suspense } from 'react';
import { getMysteries } from '@/services/admin';
import { CreateMysteryBaseButton } from './_components/CreateMysteryBaseButton';
import { MysteryCard } from './_components/MysteryCard';

export const unstable_instant = false;

export default async function AdminMysteries({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">Mystery Bases</h2>
          <p className="text-gray-500 text-sm font-medium">Create and manage the foundation of your murder mysteries</p>
        </div>
        <CreateMysteryBaseButton />
      </div>

      <Suspense fallback={<AdminMysteriesSkeleton />}>
        <AdminMysteriesList params={params} />
      </Suspense>
    </div>
  );
}

async function AdminMysteriesList({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const mysteries = await getMysteries();

  if (!mysteries || mysteries.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden p-20 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <h3 className="text-lg font-black text-brand-dark mb-2">No Mystery Bases Yet</h3>
        <p className="text-gray-400 text-sm mb-8">Ready to create your first mystery template?</p>
        <button className="text-brand-pink text-xs font-black uppercase tracking-widest hover:underline">
          Learn how to create a mystery base
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {mysteries.map((item) => (
        <MysteryCard key={item.id} mystery={item} locale={locale} />
      ))}
    </div>
  );
}

function AdminMysteriesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-[32px] border border-slate-100 p-8 space-y-6 shadow-sm animate-pulse">
          <div className="h-48 bg-slate-100 rounded-2xl w-full"></div>
          <div className="space-y-3">
            <div className="h-6 bg-slate-100 rounded w-2/3"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
          <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
        </div>
      ))}
    </div>
  );
}



