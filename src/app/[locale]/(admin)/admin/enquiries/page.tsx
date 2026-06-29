import React, { Suspense } from 'react';
import { getEnquiries } from '../admin-data';
import EnquiriesTable from '@/components/admin/EnquiriesTable';

export const unstable_instant = false;

export default async function AdminEnquiriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
            Customer <span className="text-brand-pink italic">Enquiries</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Messages submitted via the contact form
          </p>
        </div>
        <Suspense fallback={<div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm w-32 h-[52px] animate-pulse"></div>}>
          <EnquiriesCount />
        </Suspense>
      </div>

      <Suspense fallback={<EnquiriesTableSkeleton />}>
        <EnquiriesContent />
      </Suspense>
    </div>
  );
}

async function EnquiriesCount() {
  const enquiries = await getEnquiries();
  return (
    <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Enquiries</p>
      <p className="text-2xl font-black text-brand-dark">{enquiries.length}</p>
    </div>
  );
}

async function EnquiriesContent() {
  const enquiries = await getEnquiries();
  return <EnquiriesTable enquiries={enquiries} />;
}

function EnquiriesTableSkeleton() {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden h-96 animate-pulse">
      <div className="h-16 bg-gray-50/50 border-b border-gray-100 w-full animate-pulse"></div>
      <div className="p-8 space-y-6">
        {[1, 2].map((i) => (
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
