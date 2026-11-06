import React, { Suspense } from 'react';
import Link from 'next/link';
import { getConversionAndPromoAnalytics } from '@/app/actions/admin-analytics';
import { AnalyticsNav } from '@/components/admin/AnalyticsNav';

export const unstable_instant = false;

export default async function ConversionsAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
            Platform Intelligence
          </p>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">
            Conversions, Promos &amp; Referrals
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Lead-to-host conversion funnel, repeat host retention, discount code redemptions &amp; friend referrals
          </p>
        </div>
      </div>

      <AnalyticsNav locale={locale} />

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 bg-slate-100 animate-pulse rounded-[28px]" />
              ))}
            </div>
            <div className="h-96 bg-slate-100 animate-pulse rounded-[32px]" />
          </div>
        }
      >
        <ConversionsAnalyticsContent locale={locale} />
      </Suspense>
    </div>
  );
}

async function ConversionsAnalyticsContent({ locale }: { locale: string }) {
  const data = await getConversionAndPromoAnalytics();

  return (
    <div className="space-y-8">
      {/* KPI Funnel Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Marketing Leads
          </p>
          <p className="text-3xl font-black text-brand-dark mt-2">
            {data.funnel.leadsCount.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">Captured email leads</p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Registered Accounts
          </p>
          <p className="text-3xl font-black text-brand-dark mt-2">
            {data.funnel.registeredAccountsCount.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            {data.funnel.marketingOptInCount} opted into marketing
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Unique Paying Hosts
          </p>
          <p className="text-3xl font-black text-brand-pink mt-2">
            {data.funnel.uniquePayingCustomers.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Avg Order Value: £{data.funnel.avgOrderValue}
          </p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Repeat Host Rate
          </p>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            {data.funnel.repeatHostRate}%
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            {data.funnel.repeatHostsCount} hosts with 2+ orders
          </p>
        </div>
      </div>

      {/* Referral Program & Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Friend Referral Engine */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-1">
            Friend Referral Program (Give 20%, Get 20%)
          </h2>
          <p className="text-xs font-bold text-gray-400 mb-6">
            Real-time tracking of host referral codes &amp; unlocked reward vouchers
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Active Host Codes
              </p>
              <p className="text-2xl font-black text-brand-dark mt-1">
                {data.referrals.activeHostCodes}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Referred Purchases
              </p>
              <p className="text-2xl font-black text-brand-pink mt-1">
                {data.referrals.friendPurchasesCompleted}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                20% Rewards Unlocked
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {data.referrals.rewardVouchersIssued}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Rewards Redeemed
              </p>
              <p className="text-2xl font-black text-brand-dark mt-1">
                {data.referrals.rewardVouchersRedeemed}
              </p>
            </div>
          </div>
        </div>

        {/* Lead Capture Sources */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                Lead Capture Sources
              </h2>
              <p className="text-xs font-bold text-gray-400">
                Where marketing leads signed up from
              </p>
            </div>
            <Link
              href={`/${locale}/admin/leads`}
              className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
            >
              View Leads →
            </Link>
          </div>
          <div className="space-y-3">
            {data.leadSources.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-sm font-bold text-gray-700 capitalize">{item.source}</span>
                <span className="text-sm font-black text-brand-dark">{item.count} leads</span>
              </div>
            ))}
            {data.leadSources.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No marketing leads recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Promo & Discount Codes Table */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight">
              Discount &amp; Promo Code Performance
            </h2>
            <p className="text-xs font-bold text-gray-400">
              Redemption counts across promo codes and scheduled sales
            </p>
          </div>
          <Link
            href={`/${locale}/admin/discounts`}
            className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
          >
            Manage Discounts →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="py-3 pr-4">Campaign Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Applies To</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 pl-4 text-right">Times Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {data.discounts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 pr-4 font-black text-brand-dark">{d.name}</td>
                  <td className="py-3.5 px-4 font-mono text-xs font-black text-brand-pink">
                    {d.code}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold text-gray-600">
                    {d.discountType === 'percentage' ? `${d.discountValue}% Off` : `£${d.discountValue} Off`}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold text-gray-500 capitalize">
                    {d.appliesTo}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        d.isActive
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 pl-4 text-right font-black text-brand-dark">
                    {d.timesUsed}
                  </td>
                </tr>
              ))}
              {data.discounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400 text-sm">
                    No discount campaigns created yet.
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
