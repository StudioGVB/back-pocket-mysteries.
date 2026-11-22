'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MarketingLeadRecord,
  adminSendFreeMysteryCodeToLeadAction,
  adminSendTestVipWelcomeEmailAction,
  adminAddNewsletterLeadAction,
} from '@/app/actions/marketing';
import { buildVipWelcomeEmailHtml } from '@/lib/vip-welcome-email';
import { buildBrandedEmailShell } from '@/lib/branded-email-template';

const FIRST_50_VIP_CAP = 50;
export const VIP_WELCOME_EDM_ID = '00000000-0000-4000-8000-000000000050';

export interface CustomerSubscriberRow {
  id: string;
  email: string;
  full_name: string | null;
  country: string | null;
  created_at: string;
  also_in_vip_leads: boolean;
  vip_rank: number | null;
}

export default function AdminLeadsClient({
  initialLeads,
  customerSubscribers = [],
  totalCombinedAudienceCount = 0,
}: {
  initialLeads: MarketingLeadRecord[];
  customerSubscribers?: CustomerSubscriberRow[];
  totalCombinedAudienceCount?: number;
}) {
  const [leads, setLeads] = useState<MarketingLeadRecord[]>(initialLeads);
  const [filter, setFilter] = useState<'all_leads' | 'vip50' | 'pending_code' | 'customer_accounts'>(
    'all_leads'
  );
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sendingBatchCodes, setSendingBatchCodes] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Manual Add Subscriber state
  const [newSubEmail, setNewSubEmail] = useState<string>('');
  const [newSubName, setNewSubName] = useState<string>('');
  const [addingSub, setAddingSub] = useState<boolean>(false);

  // Email Preview state (Subscriber "You're In!" vs Admin Alert)
  const [showWelcomePreview, setShowWelcomePreview] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'subscriber_welcome' | 'admin_alert'>(
    'subscriber_welcome'
  );
  const [previewName, setPreviewName] = useState<string>('Gabby');
  const [previewRank, setPreviewRank] = useState<number>(Math.max(1, initialLeads.length || 1));
  const [testRecipient, setTestRecipient] = useState<string>('Hello@backpocketgames.com');
  const [sendingTestWelcome, setSendingTestWelcome] = useState<boolean>(false);

  const vipLeads = leads.filter(
    (l) => l.qualifies_for_free_mystery || l.vip_rank <= FIRST_50_VIP_CAP
  );
  const spotsRemaining = Math.max(0, FIRST_50_VIP_CAP - vipLeads.length);
  const codesSentCount = vipLeads.filter((l) => Boolean(l.free_mystery_code)).length;
  const pendingVipLeads = vipLeads.filter((l) => !l.free_mystery_code);

  const filteredLeads = leads.filter((l) => {
    if (filter === 'vip50') return l.qualifies_for_free_mystery || l.vip_rank <= FIRST_50_VIP_CAP;
    if (filter === 'pending_code') {
      return (l.qualifies_for_free_mystery || l.vip_rank <= FIRST_50_VIP_CAP) && !l.free_mystery_code;
    }
    return true;
  });

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEmail.trim()) return;
    setAddingSub(true);
    setStatusBanner(null);
    try {
      const res = await adminAddNewsletterLeadAction(newSubEmail.trim(), newSubName.trim() || undefined);
      if (res.success && res.lead) {
        setLeads((prev) => {
          const exists = prev.some((p) => p.email.toLowerCase() === res.lead!.email.toLowerCase());
          if (exists) return prev;
          return [res.lead!, ...prev];
        });
        setNewSubEmail('');
        setNewSubName('');
        setStatusBanner(
          `✓ Added ${res.lead.email} to Newsletter Subscribers (VIP Spot #${res.lead.vip_rank}/${FIRST_50_VIP_CAP})!`
        );
      } else {
        setStatusBanner(res.error || 'Could not add subscriber.');
      }
    } catch {
      setStatusBanner('Failed to add subscriber.');
    } finally {
      setAddingSub(false);
    }
  };

  const handleSendTestWelcomeEmail = async () => {
    setSendingTestWelcome(true);
    setStatusBanner(null);
    try {
      const res = await adminSendTestVipWelcomeEmailAction(
        testRecipient,
        previewName || 'Gabby',
        previewRank || 1
      );
      if (res.success) {
        setStatusBanner(`✓ Sent test branded VIP email to ${testRecipient}!`);
      } else {
        setStatusBanner(res.error || 'Could not send test welcome email.');
      }
    } catch {
      setStatusBanner('Failed to send test welcome email.');
    } finally {
      setSendingTestWelcome(false);
    }
  };

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

  const handleBatchSendAllPendingVipCodes = async () => {
    if (pendingVipLeads.length === 0) return;
    setSendingBatchCodes(true);
    setStatusBanner(null);
    let sent = 0;
    for (const lead of pendingVipLeads) {
      try {
        const res = await adminSendFreeMysteryCodeToLeadAction(lead.email);
        if (res.success && res.code) {
          sent++;
          setLeads((prev) =>
            prev.map((item) =>
              item.email.toLowerCase() === lead.email.toLowerCase()
                ? {
                    ...item,
                    free_mystery_code: res.code!,
                    code_sent_at: new Date().toISOString(),
                  }
                : item
            )
          );
        }
      } catch {
        // continue
      }
    }
    setSendingBatchCodes(false);
    setStatusBanner(
      `✓ Dispatched 100%-Off Free Mystery Promo Codes to ${sent} First-50 VIP Subscriber(s)!`
    );
  };

  const handleExportCsv = () => {
    const headers = [
      'Subscriber Type',
      'VIP Rank',
      'Email',
      'Full Name',
      'First 50 Free Mystery',
      'Free Mystery Code',
      'Code Sent At',
      'Source',
      'Date Joined',
    ];
    const leadRows = leads.map((l) => [
      'Newsletter / VIP Sign-Up (Email-Only)',
      l.vip_rank || '',
      l.email,
      l.full_name || '',
      l.qualifies_for_free_mystery ? 'YES (First 50 VIP)' : 'No',
      l.free_mystery_code || '',
      l.code_sent_at || '',
      l.source || 'website',
      l.created_at,
    ]);
    const custRows = customerSubscribers
      .filter((c) => !c.also_in_vip_leads)
      .map((c) => [
        'Customer Account (Also Receives Newsletter)',
        '',
        c.email,
        c.full_name || '',
        'No',
        '',
        '',
        'customer_account',
        c.created_at,
      ]);

    const csv = [headers, ...leadRows, ...custRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `back-pocket-newsletter-and-vip50-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const welcomePreviewHtml =
    previewMode === 'subscriber_welcome'
      ? buildVipWelcomeEmailHtml({
          firstName: previewName || 'there',
          vipRank: previewRank,
          vipCap: FIRST_50_VIP_CAP,
          qualifiesForFreeMystery: previewRank <= FIRST_50_VIP_CAP,
          spotsRemaining: Math.max(0, FIRST_50_VIP_CAP - previewRank),
        })
      : buildBrandedEmailShell({
          preheader: `${previewName || 'Testing'} just claimed VIP Spot #${previewRank} of ${FIRST_50_VIP_CAP}.`,
          kicker: `FIRST 50 VIP SPOT #${previewRank} OF ${FIRST_50_VIP_CAP}`,
          headline: `New VIP Launch Waitlist Registration`,
          bodyHtml: `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Subscriber Email</span><br/>
                  <a href="mailto:gabriellablyth@me.com" style="color:#fe04c6;text-decoration:none;font-size:16px;font-weight:800;">gabriellablyth@me.com</a>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Name</span><br/>
                  <span style="color:#1e191c;font-size:15px;font-weight:700;">${previewName || 'Testing'}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Signup Source</span><br/>
                  <span style="color:#1e191c;font-size:14px;font-weight:600;">first_50_vip_modal</span>
                </td>
              </tr>
            </table>
            <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;padding:18px 22px;border-radius:12px;">
              <p style="margin:0 0 4px 0;color:#fe04c6;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
                FIRST 50 VIP TALLY STATUS
              </p>
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;line-height:1.6;">
                ✓ Qualifies for First 50 FREE Mystery (Spot #${previewRank} of 50 — ${Math.max(
            0,
            FIRST_50_VIP_CAP - previewRank
          )} spots remaining). Open Admin → Newsletter &amp; VIP Leads to dispatch their 100%-off promo code on launch day.
              </p>
            </div>
          `,
          ctaText: 'Open Newsletter & VIP Leads →',
          ctaUrl: 'https://backpocketmysteries.com/en/admin/leads',
        });

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            First 50 VIP Tally
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-brand-pink">
              {vipLeads.length} / {FIRST_50_VIP_CAP}
            </h3>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2.5 mb-1.5">
            <div
              className="h-full bg-brand-pink rounded-full transition-all"
              style={{ width: `${Math.min(100, (vipLeads.length / FIRST_50_VIP_CAP) * 100)}%` }}
            />
          </div>
          <p className="text-xs font-bold text-gray-400">
            {spotsRemaining} of {FIRST_50_VIP_CAP} free mystery spots left on website
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Separate Newsletter Sign-Ups
          </p>
          <h3 className="text-3xl font-black text-brand-dark">{leads.length}</h3>
          <p className="text-xs font-bold text-gray-400 mt-1">
            Email-only leads (stored separately from Customers)
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Total Newsletter Audience
          </p>
          <h3 className="text-3xl font-black text-indigo-600">
            {Math.max(leads.length, totalCombinedAudienceCount)}
          </h3>
          <p className="text-xs font-bold text-gray-400 mt-1">
            {leads.length} Email Leads + {customerSubscribers.length} Customer Accounts
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              First 50 Free Promo Codes
            </p>
            <h3 className="text-2xl font-black text-emerald-600">
              {codesSentCount} / {vipLeads.length} Sent
            </h3>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              {pendingVipLeads.length} VIP(s) awaiting launch code
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {pendingVipLeads.length > 0 && (
              <button
                type="button"
                disabled={sendingBatchCodes}
                onClick={handleBatchSendAllPendingVipCodes}
                className="flex-1 px-3 py-2 bg-brand-pink hover:bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
              >
                {sendingBatchCodes
                  ? 'Sending...'
                  : `Send All (${pendingVipLeads.length}) Codes ✉️`}
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-brand-dark hover:bg-brand-pink text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Export CSV ↓
            </button>
          </div>
        </div>
      </div>

      {/* Add Subscriber Manually + Architecture Note */}
      <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-brand-dark">
            How Newsletter Sign-Ups &amp; Customer Accounts Work
          </p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Email sign-ups (from the First 50 VIP Popup, Footer, and Landing Page) don&apos;t have passwords or guest rosters yet, so they sit in this dedicated <strong>Newsletter &amp; VIP Leads</strong> directory. When you send a Weekly EDM, both these email subscribers <em>and</em> your registered Customers receive it automatically.
          </p>
        </div>

        <form onSubmit={handleAddSubscriber} className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <input
            type="text"
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            placeholder="First name (optional)"
            className="px-3.5 py-2 rounded-full border border-gray-200 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-pink w-40"
          />
          <input
            type="email"
            required
            value={newSubEmail}
            onChange={(e) => setNewSubEmail(e.target.value)}
            placeholder="Add email subscriber..."
            className="px-3.5 py-2 rounded-full border border-gray-200 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-pink w-52"
          />
          <button
            type="submit"
            disabled={addingSub}
            className="px-4 py-2 rounded-full bg-brand-dark hover:bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
          >
            {addingSub ? 'Adding...' : '+ Add Subscriber'}
          </button>
        </form>
      </div>

      {statusBanner && (
        <div className="p-4 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-xs font-black">
          {statusBanner}
        </div>
      )}

      {/* Filter Tabs & Branded Email Preview Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex flex-wrap p-1.5 rounded-full bg-white border border-gray-100 shadow-sm">
          <button
            type="button"
            onClick={() => setFilter('all_leads')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'all_leads'
                ? 'bg-brand-dark text-white'
                : 'text-gray-500 hover:text-brand-dark'
            }`}
          >
            Newsletter Sign-Ups ({leads.length})
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
            🎁 First 50 VIP Tally ({vipLeads.length} / 50)
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
            Awaiting Launch Code ({pendingVipLeads.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('customer_accounts')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'customer_accounts'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-indigo-600'
            }`}
          >
            Customer Accounts Receiving EDM ({customerSubscribers.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowWelcomePreview((prev) => !prev)}
            className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
              showWelcomePreview
                ? 'bg-brand-dark text-white border-brand-dark'
                : 'bg-white text-brand-dark border-gray-200 hover:border-brand-pink'
            }`}
          >
            {showWelcomePreview
              ? 'Hide Branded Email Previews ▲'
              : '✉️ Preview Branded VIP & Admin Emails ▼'}
          </button>
          <Link
            href={`/admin/edm/${VIP_WELCOME_EDM_ID}`}
            className="px-4 py-2.5 rounded-full bg-brand-pink hover:bg-brand-dark text-white text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
          >
            Edit in EDM Builder →
          </Link>
        </div>
      </div>

      {/* Collapsible Branded Email Visual Preview */}
      {showWelcomePreview && (
        <div className="bg-white rounded-[32px] border border-brand-pink/30 shadow-sm overflow-hidden">
          <div className="p-6 bg-gray-50/80 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode('subscriber_welcome')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider cursor-pointer ${
                  previewMode === 'subscriber_welcome'
                    ? 'bg-brand-pink text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                1. Subscriber &ldquo;You&apos;re In!&rdquo; Email
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('admin_alert')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider cursor-pointer ${
                  previewMode === 'admin_alert'
                    ? 'bg-brand-dark text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                2. Admin VIP Lead Alert Email (Upgraded Branding)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">Preview Name:</span>
                <input
                  type="text"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  className="w-20 text-xs font-bold text-brand-dark focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">VIP Spot #:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={previewRank}
                  onChange={(e) => setPreviewRank(Number(e.target.value) || 1)}
                  className="w-12 text-xs font-bold text-brand-dark focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="test@email.com"
                  className="w-44 text-xs font-bold text-brand-dark focus:outline-none"
                />
                <button
                  type="button"
                  disabled={sendingTestWelcome}
                  onClick={handleSendTestWelcomeEmail}
                  className="px-3 py-1 rounded-lg bg-brand-pink hover:bg-brand-dark text-white text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                >
                  {sendingTestWelcome ? 'Sending...' : 'Send Test ✉️'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#f4f4f5] flex justify-center">
            <iframe
              title="Branded Email Preview"
              srcDoc={welcomePreviewHtml}
              className="w-full max-w-[640px] h-[820px] rounded-2xl border border-gray-200 bg-white shadow-md"
            />
          </div>
        </div>
      )}

      {/* Table Section */}
      {filter === 'customer_accounts' ? (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-900">
              These are registered <strong>Customer Accounts</strong> (stored in <Link href="/admin/users" className="underline font-black">Admin → Customers</Link>). They automatically receive your Weekly EDM newsletters alongside your email-only Newsletter Sign-Ups.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Customer Email &amp; Name
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Country
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    First 50 VIP Status
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Account Created
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                    Customer Profile
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customerSubscribers.length > 0 ? (
                  customerSubscribers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-5">
                        <div className="text-sm font-black text-brand-dark">{cust.email}</div>
                        <div className="text-xs font-bold text-gray-400">
                          {cust.full_name || 'Customer Account'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-600">
                        {cust.country || '—'}
                      </td>
                      <td className="px-6 py-5">
                        {cust.also_in_vip_leads && cust.vip_rank ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-xs font-black">
                            🎁 Also VIP Spot #{cust.vip_rank} / 50
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                            ✓ Subscribed via Customer Account
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-xs font-medium text-gray-400">
                        {new Date(cust.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/admin/users/${cust.id}`}
                          className="text-xs font-black uppercase tracking-wider text-indigo-600 hover:underline"
                        >
                          View Customer →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-bold">
                      No customer accounts found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    First 50 VIP Tally
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Subscriber Email &amp; Name
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Signup Source &amp; Date
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    100%-Off Promo Code Status
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
                              🎁 Spot #{lead.vip_rank} of 50
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
                              Subscriber #{lead.vip_rank}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="text-sm font-black text-brand-dark">{lead.email}</div>
                          <div className="text-xs font-bold text-gray-400">
                            {lead.full_name || 'Email-only newsletter sign-up'}
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
                                VIP Spot #{lead.vip_rank}/50 Reserved (Code Not Sent Yet)
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-bold text-gray-400">
                              Newsletter Subscriber (After First 50)
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
                      No newsletter leads in this view yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
