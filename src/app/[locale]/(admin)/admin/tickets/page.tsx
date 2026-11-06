import React, { Suspense } from 'react';
import { getAllAdminTicketsAction } from '@/app/actions/tickets';
import { AdminTicketsClient } from '@/components/admin/AdminTicketsClient';
import { SUPPORT_EMAIL } from '@/utils/tickets';

export const unstable_instant = false;

export default async function AdminTicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-3">
            Support <span className="text-brand-pink italic">Tickets</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Customer tickets raised in the Builder &amp; Account Portal • Direct inbox:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-pink hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm h-96 animate-pulse p-8" />
        }
      >
        <AdminTicketsContent />
      </Suspense>
    </div>
  );
}

async function AdminTicketsContent() {
  const tickets = await getAllAdminTicketsAction();
  return <AdminTicketsClient initialTickets={tickets} />;
}
