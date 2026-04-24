import React from 'react';
import { getEnquiries } from '../admin-data';

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

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date Received</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Name</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Email</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Message</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enquiries.length > 0 ? (
                enquiries.map((enquiry: any) => (
                  <tr key={enquiry.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-6 text-sm font-bold text-gray-400 whitespace-nowrap">
                      {new Date(enquiry.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-brand-dark">{enquiry.name}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-gray-500">{enquiry.email}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-medium text-gray-600 max-w-md truncate" title={enquiry.message}>
                        {enquiry.message}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${enquiry.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${enquiry.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'}`}></span>
                        {enquiry.status || 'Received'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold">
                    No enquiries received yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
