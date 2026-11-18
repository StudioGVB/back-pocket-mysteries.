'use client';

import React, { useState } from 'react';
import {
  MarketingLeadRecord,
  adminSendFreeMysteryCodeToLeadAction,
} from '@/app/actions/marketing';

const FIRST_50_VIP_CAP = 50;

export default function AdminLeadsClient({
  initialLeads,
}: {
  initialLeads: MarketingLeadRecord[];
}) {
  const [leads, setLeads] = useState<MarketingLeadRecord[]>(initialLeads);
  const [filter, setFilter] = useState<'all' | 'vip50' | 'pending_code'>('all');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const vipLeads = leads.filter((l) => l.qualifies_for_free_mystery || l.vip_rank <= FIRST_50_VIP_CAP);
  const spotsRemaining = Math.max(0, FIRST_50_VIP_CAP - vipLeads.length);
  const codesSentCount = vipLeads.filter((l) => Boolean(l.free_mystery_code)).length;

  const filteredLeads = leads.filter((l) => {
    if (filter === 'vip50') return l.qualifies_for_free_mystery || l.vip_rank <= FIRST_50_VIP_CAP;
    if (filter === 'pending_code') {
      return (l.qualifies_for_free_mystery || l.vip_rank <= FIRST_50_VIP_CAP) && !l.free_mystery_code;
    }
    return true;
  });

  const handleSendFreeMysteryCode = async (email: string) => {
    setSendingEmail(email);
    setStatusBanner(null);
    try {
      const res = await adminSendFreeMysteryCodeToLeadAction(email);
      if (res.success && res.code) {
        setLeads((prev) =>
          prev.map((item) =>
            item.email.toLowerCase() === email.toLowerCase()
              ? {
                  ...item,
                  free_mystery_code: res.code!,
                  code_sent_at: new Date().toISOString(),
                }
              : item
          )
        );
        setStatusBanner(
          `✓ Generated 100%-Off Free Mystery code ${res.code} and emailed it to ${email}!`
        );
      } else {
        setStatusBanner(res.error || 'Could not generate code.');
      }
    } catch {
      setStatusBanner('Failed to generate/send code.');
    } finally {
      setSendingEmail(null);
    }
  };

  const handleExportCsv = () => {
    const headers = ['VIP Rank', 'Email', 'Full Name', 'First 50 Free Mystery', 'Free Mystery Code', 'Code Sent At', 'Source', 'Date Joined'];
    const rows = leads.map((l) => [
      l.vip_rank || '',
      l.email,
      l.full_name || '',
      l.qualifies_for_free_mystery ? 'YES (First 50 VIP)' : 'No',
      l.free_mystery_code || '',
      l.code_sent_at || '',
      l.source || 'website',
      l.created_at,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `back-pocket-vip-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            First 50 VIP Spots Claimed
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-brand-pink">
              {vipLeads.length} / {FIRST_50_VIP_CAP}
            </h3>
          </div>
          <p className="text-xs font-bold text-gray-400 mt-1">
            {spotsRemaining} free mystery spots left
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Total Waitlist Sign-Ups
          </p>
          <h3 className="text-3xl font-black text-brand-dark">{leads.length}</h3>
          <p className="text-xs font-bold text-gray-400 mt-1">
            All website & footer leads
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Free Mystery Codes Sent
          </p>
          <h3 className="text-3xl font-black text-emerald-600">
            {codesSentCount} / {vipLeads.length}
          </h3>
          <p className="text-xs font-bold text-gray-400 mt-1">
            {vipLeads.length - codesSentCount} VIPs awaiting launch code
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              Export VIP List
            </p>
            <p className="text-xs font-bold text-gray-500">
              Download CSV for email campaigns or manual launch outreach
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="mt-3 px-4 py-2.5 bg-brand-dark hover:bg-brand-pink text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
          >
            Export CSV ↓
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="p-4 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-xs font-black">
          {statusBanner}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1.5 rounded-full bg-white border border-gray-100 shadow-sm">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-brand-dark text-white'
                : 'text-gray-500 hover:text-brand-dark'
            }`}
          >
            All Leads ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('vip50')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'vip50'
                ? 'bg-brand-pink text-white'
                : 'text-gray-500 hover:text-brand-pink'
            }`}
          >
            🎁 First 50 VIPs ({vipLeads.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending_code')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'pending_code'
                ? 'bg-amber-500 text-white'
                : 'text-gray-500 hover:text-amber-600'
            }`}
          >
            Awaiting Launch Code ({vipLeads.length - codesSentCount})
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  VIP Spot
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Contact & Name
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Source & Date
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Free Mystery Status
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                  Launch Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const isVip =
                    lead.qualifies_for_free_mystery || lead.vip_rank <= FIRST_50_VIP_CAP;
                  const isSending = sendingEmail === lead.email;

                  return (
                    <tr key={lead.id || lead.email} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-5">
                        {isVip ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-xs font-black">
                            🎁 #{lead.vip_rank} / 50
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
                            #{lead.vip_rank}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-sm font-black text-brand-dark">{lead.email}</div>
                        <div className="text-xs font-bold text-gray-400">
                          {lead.full_name || 'No name provided'}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                          {(lead.source || 'website').replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs font-medium text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {isVip ? (
                          lead.free_mystery_code ? (
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                  {lead.free_mystery_code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(lead.free_mystery_code!);
                                    setCopiedCode(lead.free_mystery_code!);
                                    setTimeout(() => setCopiedCode(null), 2000);
                                  }}
                                  className="text-[10px] font-black uppercase text-brand-pink hover:underline cursor-pointer"
                                >
                                  {copiedCode === lead.free_mystery_code ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              {lead.code_sent_at && (
                                <p className="text-[10px] font-bold text-gray-400">
                                  Sent{' '}
                                  {new Date(lead.code_sent_at).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                  })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                              VIP Spot Reserved (Code Not Sent Yet)
                            </span>
                          )
                        ) : (
                          <span className="text-xs font-bold text-gray-400">
                            Standard Waitlist
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5 text-right">
                        {isVip && (
                          <button
                            type="button"
                            disabled={isSending}
                            onClick={() => handleSendFreeMysteryCode(lead.email)}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 ${
                              lead.free_mystery_code
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                : 'bg-brand-pink hover:bg-brand-dark text-white shadow-sm'
                            }`}
                          >
                            {isSending
                              ? 'Sending...'
                              : lead.free_mystery_code
                              ? 'Resend Free Code'
                              : 'Send Free Mystery Code ✉️'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-bold">
                    No leads in this view yet.
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
