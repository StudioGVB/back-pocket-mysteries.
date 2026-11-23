import React, { Suspense } from 'react';
import Link from 'next/link';
import { getBalanceSheetReportAction } from '@/app/actions/balance-sheet';
import { BalanceSheetClient } from '@/components/admin/BalanceSheetClient';

export const unstable_instant = false;

export default async function AdminBalanceSheetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <Link
          href={`/${locale}/admin/balance-sheet`}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-brand-dark text-white shadow-sm"
        >
          Balance Sheet &amp; P&amp;L
        </Link>
        <Link
          href={`/${locale}/admin/costs`}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-gray-500 hover:text-brand-dark hover:bg-gray-50"
        >
          AI Costs &amp; Billing
        </Link>
      </div>

      <Suspense fallback={<BalanceSheetSkeleton />}>
        <BalanceSheetContent />
      </Suspense>
    </div>
  );
}

async function BalanceSheetContent() {
  const report = await getBalanceSheetReportAction();
  return <BalanceSheetClient initialReport={report} />;
}

function BalanceSheetSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="bg-white h-28 rounded-[28px] border border-gray-100" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white h-36 rounded-[28px] border border-gray-100" />
        ))}
      </div>
      <div className="bg-white h-40 rounded-[32px] border border-gray-100" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white h-96 rounded-[32px] border border-gray-100" />
        <div className="bg-white h-96 rounded-[32px] border border-gray-100" />
      </div>
    </div>
  );
}
