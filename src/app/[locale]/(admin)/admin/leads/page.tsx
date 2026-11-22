import React, { Suspense } from 'react';
import { getUnifiedNewsletterDirectoryAction } from '@/app/actions/marketing';
import AdminLeadsClient from './AdminLeadsClient';

export const unstable_instant = false;

export default async function AdminLeadsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-3">
          Newsletter Subscribers &amp; <span className="text-brand-pink italic">First 50 VIPs</span>
        </h1>
        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
          Separate Email-Only Newsletter Sign-Ups · First 50 Free Mystery VIP Tally (#1–#50) · Unified Customer Newsletter Audience
        </p>
      </div>

      <Suspense fallback={<LeadsTableSkeleton />}>
        <LeadsContent />
      </Suspense>
    </div>
  );
}

async function LeadsContent() {
  const { newsletterLeads, customerSubscribers, combinedActiveEmails } =
    await getUnifiedNewsletterDirectoryAction();
  return (
    <AdminLeadsClient
      initialLeads={newsletterLeads}
      customerSubscribers={customerSubscribers}
      totalCombinedAudienceCount={combinedActiveEmails.length}
    />
  );
}

function LeadsTableSkeleton() {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden h-96 animate-pulse">
      <div className="h-16 bg-gray-50/50 border-b border-gray-100 w-full animate-pulse"></div>
      <div className="p-8 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center h-12">
            <div className="h-4 bg-slate-100 rounded w-24"></div>
            <div className="h-4 bg-slate-100 rounded w-32"></div>
            <div className="h-4 bg-slate-100 rounded w-48"></div>
            <div className="w-16 h-8 bg-slate-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
