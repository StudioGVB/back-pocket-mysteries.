import React, { Suspense } from 'react';
import Link from 'next/link';
import { getMysteriesAndPackagesAnalytics } from '@/app/actions/admin-analytics';
import { AnalyticsNav } from '@/components/admin/AnalyticsNav';

export const unstable_instant = false;

export default async function PackagesAnalyticsPage({
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
            Mysteries &amp; Packages
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Package tier popularity, best-selling mystery bases, themes, spice levels &amp; currency split
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
        <PackagesAnalyticsContent locale={locale} />
      </Suspense>
    </div>
  );
}

async function PackagesAnalyticsContent({ locale }: { locale: string }) {
  const data = await getMysteriesAndPackagesAnalytics();

  return (
    <div className="space-y-8">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Total Paid Orders
          </p>
          <p className="text-3xl font-black text-brand-dark mt-2">
            {data.summary.totalOrders.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">Completed purchases</p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Gross Order Volume
          </p>
          <p className="text-3xl font-black text-brand-pink mt-2">
            £{data.summary.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">Across all package tiers</p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Published Bases
          </p>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            {data.summary.publishedMysteries}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">Live on storefront</p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Draft / Custom Mysteries
          </p>
          <p className="text-3xl font-black text-amber-500 mt-2">
            {data.summary.draftMysteries}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">In builder or host drafts</p>
        </div>
      </div>

      {/* Package Tier Popularity */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight">
              Package Tier Popularity
            </h2>
            <p className="text-xs font-bold text-gray-400">
              Comparison of Basic (4–6), Premium (4–10), Grand (4–16), and Monthly Unlimited Pass
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {data.packages.map((pkg) => (
            <div
              key={pkg.id}
              className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    {pkg.rangeLabel}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-black text-brand-dark">
                    {pkg.orderSharePercent}% of sales
                  </span>
                </div>
                <h3 className="text-base font-black text-brand-dark mb-4">{pkg.name}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-500">Orders Sold</span>
                  <span className="font-black text-brand-dark">{pkg.ordersCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-500">Revenue</span>
                  <span className="font-black text-emerald-600">£{pkg.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-500">Mystery Bases</span>
                  <span className="font-bold text-gray-700">{pkg.mysteryBasesCount}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-brand-pink rounded-full transition-all"
                    style={{ width: `${Math.max(pkg.orderSharePercent, pkg.ordersCount > 0 ? 6 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mystery Base Leaderboard */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight">
              Mystery Base Leaderboard
            </h2>
            <p className="text-xs font-bold text-gray-400">
              All mysteries ranked by order volume, revenue &amp; guest review ratings
            </p>
          </div>
          <Link
            href={`/${locale}/admin/mysteries`}
            className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
          >
            Manage Bases →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="py-3 pr-4">Mystery Title</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Package Size</th>
                <th className="py-3 px-4">Theme</th>
                <th className="py-3 px-4 text-right">Orders</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 pl-4 text-right">Guest Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {data.mysteryLeaderboard.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 pr-4 font-black text-brand-dark">
                    <Link
                      href={`/${locale}/builder/mysteries/${m.id}`}
                      className="hover:text-brand-pink transition-colors"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        m.status === 'published'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold text-gray-600">{m.packageLabel}</td>
                  <td className="py-3.5 px-4 text-xs font-bold text-gray-500">{m.theme}</td>
                  <td className="py-3.5 px-4 text-right font-black text-brand-dark">
                    {m.ordersCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                    £{m.revenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 pl-4 text-right text-xs font-bold text-gray-600">
                    {m.avgRating ? (
                      <span className="text-amber-500 font-black">
                        ★ {m.avgRating} <span className="text-gray-400">({m.reviewsCount})</span>
                      </span>
                    ) : (
                      <span className="text-gray-300">No reviews</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Theme, Spice, Complexity & Currency Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AttributeCard title="Popular Themes" items={data.themes} />
        <AttributeCard title="Spice Levels" items={data.spiceLevels} />
        <AttributeCard title="Complexity" items={data.complexities} />
        <AttributeCard title="Voice Accents" items={data.voiceRegions} />
      </div>
    </div>
  );
}

function AttributeCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}) {
  return (
    <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
      <h3 className="text-sm font-black text-brand-dark uppercase tracking-tight mb-4">{title}</h3>
      <div className="space-y-2.5">
        {items.slice(0, 6).map((item, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0 text-xs"
          >
            <span className="font-bold text-gray-600 capitalize truncate max-w-[75%]">
              {item.label}
            </span>
            <span className="font-black text-brand-dark">{item.count}</span>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400">No data yet.</p>}
      </div>
    </div>
  );
}
