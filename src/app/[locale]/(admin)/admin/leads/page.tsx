import React, { Suspense } from 'react';
import { getLeads } from '../admin-data';

export const unstable_instant = false;

export default async function AdminLeadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
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
        <Suspense fallback={<div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm w-32 h-[52px] animate-pulse"></div>}>
          <LeadsCount />
        </Suspense>
      </div>

      <Suspense fallback={<LeadsTableSkeleton />}>
        <LeadsContent />
      </Suspense>
    </div>
  );
}

async function LeadsCount() {
  const leads = await getLeads();
  return (
    <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Leads</p>
      <p className="text-2xl font-black text-brand-dark">{leads.length}</p>
    </div>
  );
}

async function LeadsContent() {
  const leads = await getLeads();
  return (
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
  );
}

function LeadsTableSkeleton() {
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
