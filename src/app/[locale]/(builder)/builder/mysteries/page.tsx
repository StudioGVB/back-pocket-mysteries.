import React, { Suspense } from 'react';
import Link from 'next/link';
import { formatDate } from '@/utils/date';
import { getUserMysteries } from '@/services/mysteries';
import { CreateMysteryButton } from './_components/CreateMysteryButton';
import { Locale } from '@/lib/i18n-config';

export const unstable_instant = false;

export default async function BuilderMysteriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="p-12 max-w-6xl mx-auto h-full">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Your Mysteries</h1>
          <p className="text-slate-500 font-medium text-sm">Manage and edit your interactive experiences.</p>
        </div>
        <CreateMysteryButton />
      </div>
      
      <Suspense fallback={<BuilderMysteriesSkeleton />}>
        <BuilderMysteriesList params={params} />
      </Suspense>
    </div>
  );
}

async function BuilderMysteriesList({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const mysteries = await getUserMysteries();

  return (
    <div className="grid gap-6">
      {mysteries.length > 0 ? (
        mysteries.map((mystery) => (
          <div key={mystery.id} className="bg-white border border-slate-100 p-8 rounded-[2rem] flex items-center justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🎭
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-brand-pink transition-colors">{mystery.title}</h3>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <span>{mystery.min_players}-{mystery.max_players} Players</span>
                  <span>•</span>
                  <span>Created {formatDate(mystery.created_at)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${mystery.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {mystery.status}
              </span>
              <Link 
                href={`/${locale}/builder/mysteries/${mystery.id}`}
                className="px-5 py-2 hover:bg-brand-pink/10 rounded-xl text-sm font-bold text-slate-600 hover:text-brand-pink transition-all"
              >
                Edit
              </Link>
            </div>
          </div>
        ))
      ) : (
        <div className="border-2 border-dashed border-slate-100 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center opacity-50">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl mb-4">✨</div>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No mysteries found. Start by creating your first one!</p>
        </div>
      )}
      
      <div className="border border-dashed border-slate-100 rounded-[2.5rem] p-8 flex items-center justify-center text-center opacity-30">
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">New template slot available</p>
      </div>
    </div>
  );
}

function BuilderMysteriesSkeleton() {
  return (
    <div className="grid gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white border border-slate-100 p-8 rounded-[2rem] flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl animate-pulse bg-slate-100"></div>
            <div className="space-y-2">
              <div className="h-6 bg-slate-100 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-slate-100 rounded w-32 animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="w-20 h-6 bg-slate-100 rounded-full animate-pulse"></div>
            <div className="w-16 h-8 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

