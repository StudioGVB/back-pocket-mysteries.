import React, { Suspense } from 'react';
import { getBalanceSheetReportAction } from '@/app/actions/balance-sheet';
import { BalanceSheetClient } from '@/components/admin/BalanceSheetClient';

export const unstable_instant = false;

export default async function AdminBalanceSheetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={<BalanceSheetSkeleton />}>
      <BalanceSheetContent />
    </Suspense>
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
