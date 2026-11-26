import React from 'react';
import Link from 'next/link';
import { getMysteryById } from '@/services/mysteries';
import { createClient } from '@/utils/supabase/server';
import { getPackageInfoForMaxPlayers } from '@/utils/localization';
import { getAllPlatformReviews } from '@/app/actions/reviews';

export const unstable_instant = false;

const FX_TO_GBP: Record<string, number> = {
  GBP: 1,
  USD: 0.79,
  EUR: 0.86,
  AUD: 0.52,
  CAD: 0.57,
  NZD: 0.47,
};

function normalizeOrderAmountToGbp(rawAmount: any, rawCurrency?: any): number {
  const num = Number(rawAmount) || 0;
  const major = num > 100 ? num / 100 : num;
  const curr = String(rawCurrency || 'GBP').toUpperCase();
  const rate = FX_TO_GBP[curr] ?? 1;
  return Number((major * rate).toFixed(2));
}

export default async function MysterySalesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();

  const [mystery, { data: allMysteries }, { data: allOrders }, allReviews] =
    await Promise.all([
      getMysteryById(id),
      supabase
        .from('mysteries')
        .select('id, title, max_players, status, created_at, author_id')
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false }),
      getAllPlatformReviews(supabase).catch(() => []),
    ]);

  if (!mystery) return null;

  const pkgInfo = getPackageInfoForMaxPlayers(mystery.max_players);

  // Identify any cloned customer instances belonging to this mystery base
  const normalizedTitle = String(mystery.title || '').trim().toLowerCase();
  const relatedMysteryIds = new Set<string>([mystery.id]);

  for (const m of (allMysteries || []) as any[]) {
    if (
      m.id === mystery.id ||
      m.parent_mystery_id === mystery.id ||
      (normalizedTitle &&
        String(m.title || '').trim().toLowerCase() === normalizedTitle)
    ) {
      relatedMysteryIds.add(m.id);
    }
  }

  // Filter orders strictly for THIS mystery (and its customer clones)
  const mysteryOrders = ((allOrders || []) as any[]).filter(
    (o) =>
      o.status !== 'refunded' &&
      o.status !== 'cancelled' &&
      (relatedMysteryIds.has(o.mystery_id) ||
        (normalizedTitle &&
          String(o.mystery_title || o.product_name || '')
            .trim()
            .toLowerCase() === normalizedTitle))
  );

  // Filter reviews strictly for THIS mystery
  const mysteryReviews = ((allReviews || []) as any[]).filter(
    (r) =>
      relatedMysteryIds.has(r.mystery_id) ||
      (normalizedTitle &&
        String(r.mystery_title || '').trim().toLowerCase() === normalizedTitle)
  );

  // Compute package tier breakdown for THIS mystery
  const tierStats = {
    basic: {
      id: 'basic',
      label: 'Basic Package',
      range: '4–6 Players • 3 Rounds',
      priceLabel: '£15 / $19',
      count: 0,
      revenueGbp: 0,
    },
    premium: {
      id: 'premium',
      label: 'Premium Package',
      range: '4–10 Players • 4 Rounds',
      priceLabel: '£20 / $25',
      count: 0,
      revenueGbp: 0,
    },
    grand: {
      id: 'grand',
      label: 'Grand Package',
      range: '4–16 Players • 5 Rounds',
      priceLabel: '£25 / $33',
      count: 0,
      revenueGbp: 0,
    },
  };

  let totalRevenueGbp = 0;

  const enrichedOrders = mysteryOrders.map((o) => {
    const amountGbp = normalizeOrderAmountToGbp(o.amount, o.currency);
    totalRevenueGbp = Number((totalRevenueGbp + amountGbp).toFixed(2));

    let tierKey: 'basic' | 'premium' | 'grand' = 'basic';
    const orderMaxPlayers = Number(o.max_players || mystery.max_players || 6);
    if (amountGbp >= 23 || orderMaxPlayers > 10) {
      tierKey = 'grand';
    } else if (amountGbp >= 18 || orderMaxPlayers > 6) {
      tierKey = 'premium';
    } else {
      tierKey = 'basic';
    }

    tierStats[tierKey].count += 1;
    tierStats[tierKey].revenueGbp = Number(
      (tierStats[tierKey].revenueGbp + amountGbp).toFixed(2)
    );

    return {
      ...o,
      amountGbp,
      tierLabel: tierStats[tierKey].label,
    };
  });

  const totalUnitsSold = enrichedOrders.length;
  const avgOrderValueGbp =
    totalUnitsSold > 0
      ? Number((totalRevenueGbp / totalUnitsSold).toFixed(2))
      : 0;

  // Customer party clones (excluding the base pack itself)
  const customerSessionsCount = Math.max(0, relatedMysteryIds.size - 1);

  const avgRating =
    mysteryReviews.length > 0
      ? Number(
          (
            mysteryReviews.reduce(
              (sum, r) => sum + (Number(r.rating) || 5),
              0
            ) / mysteryReviews.length
          ).toFixed(1)
        )
      : null;

  const isPublished = mystery.status === 'published';

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Sales Breakdown
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                isPublished
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isPublished ? '🟢 Live in Shop' : `📝 ${mystery.status || 'Draft'}`}
            </span>
            <span className="px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
              {pkgInfo.label} ({pkgInfo.rangeLabel})
            </span>
          </div>
          <p className="text-slate-500 font-medium text-sm">
            Real-time unit sales, revenue, package tier mix, and customer ratings scoped strictly to{' '}
            <strong className="text-slate-800">{mystery.title}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/${locale}/builder/mysteries/${id}`}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            ⚙️ Publishing Settings in Overview →
          </Link>
          <Link
            href={`/${locale}/admin/analytics/packages`}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xs"
          >
            📊 All-Platform Revenue Leaderboard ↗
          </Link>
        </div>
      </div>

      {/* 4 Per-Mystery KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Units Sold
          </div>
          <div className="text-3xl font-black text-slate-900">
            {totalUnitsSold.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-slate-500">
            Completed purchases of this mystery
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Net Revenue (GBP)
          </div>
          <div className="text-3xl font-black text-emerald-600">
            £{totalRevenueGbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-medium text-slate-500">
            FX-normalized revenue from this pack
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Avg. Order Value
          </div>
          <div className="text-3xl font-black text-brand-pink">
            £{avgOrderValueGbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-medium text-slate-500">
            Default Tier: {pkgInfo.label} (${pkgInfo.baseUsd} USD)
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Parties &amp; Host Rating
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {avgRating ? `★ ${avgRating}` : '—'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              ({mysteryReviews.length} {mysteryReviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
          <div className="text-xs font-medium text-slate-500">
            {customerSessionsCount} customer party {customerSessionsCount === 1 ? 'clone' : 'clones'}
          </div>
        </div>
      </div>

      {/* Package Tier Sales Mix for This Mystery */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Package Tier Breakdown ({mystery.title})
            </h2>
            <p className="text-xs font-medium text-slate-500">
              How customers are purchasing this mystery across Basic, Premium, and Grand party sizes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.values(tierStats).map((tier) => {
            const sharePercent =
              totalUnitsSold > 0
                ? Math.round((tier.count / totalUnitsSold) * 100)
                : 0;

            return (
              <div
                key={tier.id}
                className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/70 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                      {tier.range}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-800">
                      {sharePercent}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-black text-slate-900">
                      {tier.label}
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      {tier.priceLabel}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-500">Units Sold</span>
                    <span className="font-black text-slate-900">{tier.count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-500">Revenue</span>
                    <span className="font-black text-emerald-600">
                      £{tier.revenueGbp.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-pink rounded-full transition-all"
                      style={{
                        width: `${Math.max(sharePercent, tier.count > 0 ? 6 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order History Table for This Mystery */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Order Ledger ({enrichedOrders.length})
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Individual customer purchases recorded for {mystery.title}.
            </p>
          </div>
        </div>

        {enrichedOrders.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <div className="text-2xl">🛍️</div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              No Orders Recorded Yet for {mystery.title}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              As soon as customers purchase this mystery pack from the shop, their order details, currency, and package tier breakdown will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Package Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 pl-4 text-right">Amount (GBP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {enrichedOrders.slice(0, 25).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 pr-4 font-bold text-slate-600 whitespace-nowrap">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {String(order.id).slice(0, 8)}…
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {order.customer_email || order.user_email || 'Customer Host'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                        {order.tierLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                        {order.status || 'paid'}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-right font-black text-slate-900">
                      £{order.amountGbp.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Reviews for This Mystery */}
      {mysteryReviews.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Verified Host Reviews ({mysteryReviews.length})
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Post-party ratings and feedback submitted by hosts who played {mystery.title}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mysteryReviews.slice(0, 8).map((rev: any, idx: number) => (
              <div
                key={rev.id || idx}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-amber-500 font-black text-xs">
                    {'★'.repeat(Math.max(1, Math.min(5, Number(rev.rating) || 5)))}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {rev.reviewer_name || 'Verified Host'}
                  </span>
                </div>
                {rev.comment && (
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
