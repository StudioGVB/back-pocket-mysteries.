import React, { Suspense } from 'react';
import Link from 'next/link';
import { getTransactions } from '@/services/admin';
import { AdminTransactionsClient } from '@/components/admin/AdminTransactionsClient';

export const unstable_instant = false;

export default async function AdminTransactions({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">
            Transactions &amp; Purchased Mystery Packs
          </h2>
          <p className="text-gray-500 text-sm font-medium">
            Daily Net Revenue (£), per-order unit economics, live customer party status, 1-click support rescue &amp; 4-Gate AI QA reports
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/${locale}/admin/balance-sheet`}
            className="px-6 py-3 bg-brand-pink text-white rounded-full text-xs font-black uppercase tracking-widest hover:opacity-95 transition-all"
          >
            Income vs. Tax Balance Sheet →
          </Link>
        </div>
      </div>

      <Suspense fallback={<AdminTransactionsSkeleton />}>
        <AdminTransactionsLoader locale={locale} />
      </Suspense>
    </div>
  );
}

async function AdminTransactionsLoader({ locale }: { locale: string }) {
  const transactions: any[] = await getTransactions();
  return <AdminTransactionsClient locale={locale} initialTransactions={transactions} />;
}

function AdminTransactionsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm h-80 w-full" />
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden h-96">
        <div className="h-12 bg-slate-50 border-b border-gray-100 w-full" />
        <div className="p-8 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center h-8">
              <div className="h-4 bg-slate-100 rounded w-24" />
              <div className="h-4 bg-slate-100 rounded w-24" />
              <div className="h-4 bg-slate-100 rounded w-32" />
              <div className="h-4 bg-slate-100 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
