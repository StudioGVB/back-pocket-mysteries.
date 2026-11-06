import React, { Suspense } from 'react';
import { getDiscountsAction } from '@/app/actions/discounts';
import { getMysteries } from '@/services/admin';
import DiscountsManagerClient from '@/components/admin/DiscountsManagerClient';

export const unstable_instant = false;

export default async function AdminDiscountsPage() {
  return (
    <Suspense fallback={<DiscountsPageSkeleton />}>
      <AdminDiscountsContent />
    </Suspense>
  );
}

async function AdminDiscountsContent() {
  const [discounts, mysteries] = await Promise.all([
    getDiscountsAction(),
    getMysteries().catch(() => []),
  ]);

  const dbMysteries = (mysteries || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    theme: m.theme || null,
    complexity: m.complexity || null,
    status: m.status || null,
  }));

  return (
    <DiscountsManagerClient
      initialDiscounts={discounts}
      dbMysteries={dbMysteries}
    />
  );
}

function DiscountsPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-3">
          <div className="h-10 w-80 bg-gray-200 rounded-2xl" />
          <div className="h-3 w-64 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-12 w-44 bg-gray-200 rounded-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white rounded-3xl border border-gray-100 p-6" />
        ))}
      </div>
      <div className="h-80 bg-white rounded-[32px] border border-gray-100 p-8" />
    </div>
  );
}
