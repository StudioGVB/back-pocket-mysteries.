import React from 'react';
import { getLeads } from '../admin-data';

export default async function AdminLeadsPage() {
  const leads = await getLeads();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
            Marketing <span className="text-brand-pink italic">Leads</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Newsletter sign-ups from the blog and marketing pages
          </p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Leads</p>
          <p className="text-2xl font-black text-brand-dark">{leads.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date Joined</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Contact</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Name</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Consent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length > 0 ? (
                leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-6 text-sm font-bold text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-brand-dark">{lead.email}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-gray-500">{lead.full_name || '—'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold">
                    No leads found yet.
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
