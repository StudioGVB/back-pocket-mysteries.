import React from 'react';
import { getEnquiries } from '../admin-data';
import EnquiriesTable from '@/components/admin/EnquiriesTable';

export default async function AdminEnquiriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const enquiries = await getEnquiries();

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
        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Enquiries</p>
          <p className="text-2xl font-black text-brand-dark">{enquiries.length}</p>
        </div>
      </div>

      <EnquiriesTable enquiries={enquiries} />
    </div>
  );
}
