import React, { Suspense } from 'react';
import Link from 'next/link';
import { getAdminStats, getRecentTransactions, getTopMysteries } from './admin-data';
import { getAnalyticsTimeseries } from '@/app/actions/admin-vercel';
import { DashboardTrafficWidget } from '@/components/admin/DashboardTrafficWidget';
import { DashboardSignupsWidget } from '@/components/admin/DashboardSignupsWidget';
import { cookies } from 'next/headers';
import { getUserDisplayAvatarUrl } from '@/utils/avatar';

export const unstable_instant = false;

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="space-y-8">
      {/* Stats Grid + Sign-Ups & Newsletter Growth Widget */}
      <Suspense fallback={<StatsGridSkeleton />}>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={<div className="h-24 bg-slate-100 rounded-[32px] animate-pulse"></div>}>
        <DashboardTraffic />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <Suspense fallback={<TransactionsSkeleton />}>
          <DashboardTransactions />
        </Suspense>

        {/* Popular Mystery Bases */}
        <Suspense fallback={<TopMysteriesSkeleton />}>
          <DashboardTopMysteries />
        </Suspense>
      </div>
    </div>
  );
}

async function DashboardStats() {
  const cookieStore = await cookies();
  const lastViewStr = cookieStore.get('admin_dashboard_last_view')?.value;
  const stats = await getAdminStats(lastViewStr);
  const statConfig = [
    {
      label: 'Total Revenue',
      value: `£${stats.totalRevenue.toLocaleString()}`,
      href: '/en/admin/transactions',
      badge: null,
      urgent: false,
    },
    {
      label: 'Mystery Sales',
      value: stats.salesCount.toString(),
      href: '/en/admin/transactions',
      badge:
        stats.newOrdersCount > 0
          ? `+${stats.newOrdersCount} New`
          : `+${stats.orderPeriods.week} this wk`,
      urgent: stats.newOrdersCount > 0,
    },
    {
      label: 'Customer Sign-Ups',
      value: stats.activeUsers.toString(),
      href: '/en/admin/users',
      badge:
        stats.newUsersCount > 0
          ? `+${stats.newUsersCount} New`
          : `+${stats.customerPeriods.week} this wk`,
      urgent: stats.newUsersCount > 0,
    },
    {
      label: 'Newsletter & VIPs',
      value: stats.totalLeads.toString(),
      href: '/en/admin/leads',
      badge:
        stats.newLeadsCount > 0
          ? `+${stats.newLeadsCount} New`
          : `+${stats.leadPeriods.week} this wk`,
      urgent: stats.newLeadsCount > 0,
    },
    {
      label: 'Avg. Order Val',
      value: `£${stats.avgOrderVal.toFixed(2)}`,
      href: '/en/admin/balance-sheet',
      badge: null,
      urgent: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {statConfig.map((stat, i) => (
          <Link
            key={i}
            href={stat.href}
            className={`bg-white p-6 rounded-[28px] border shadow-sm hover:shadow-xl transition-all duration-300 block ${
              stat.urgent
                ? 'border-brand-pink/50 ring-2 ring-brand-pink/15'
                : 'border-gray-100'
            }`}
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                {stat.label}
              </p>
              {stat.badge && (
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shrink-0 ${
                    stat.urgent
                      ? 'bg-brand-pink text-white shadow-sm shadow-brand-pink/30 animate-pulse'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {stat.badge}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-dark">{stat.value}</h3>
            </div>
          </Link>
        ))}
      </div>

      <DashboardSignupsWidget
        newOrdersCount={stats.newOrdersCount}
        newUsersCount={stats.newUsersCount}
        newLeadsCount={stats.newLeadsCount}
        newEnquiriesCount={stats.newEnquiriesCount}
        newReviewsCount={stats.newReviewsCount}
        newTicketsCount={stats.newTicketsCount}
        unseenCustomers={stats.unseenCustomers}
        unseenLeads={stats.unseenLeads}
        unseenEnquiries={stats.unseenEnquiries}
        unseenReviews={stats.unseenReviews}
        unseenTickets={stats.unseenTickets}
        customerPeriods={stats.customerPeriods}
        leadPeriods={stats.leadPeriods}
        enquiryPeriods={stats.enquiryPeriods}
        reviewPeriods={stats.reviewPeriods}
        ticketPeriods={stats.ticketPeriods}
      />
    </div>
  );
}

async function DashboardTraffic() {
  const timeseriesRes = await getAnalyticsTimeseries(7);
  const timeseries = Array.isArray(timeseriesRes) ? timeseriesRes : (timeseriesRes?.data || []);
  const isConnected = !!process.env.VERCEL_ACCESS_TOKEN;
  
  const sumVisitors = timeseries.reduce((acc: any, curr: any) => acc + (curr.visitors || 0), 0);
  const sumPageviews = timeseries.reduce((acc: any, curr: any) => acc + (curr.pageviews || 0), 0);
  const totalVisitors = timeseriesRes?.totals?.visitors > 0 ? timeseriesRes.totals.visitors : sumVisitors;
  const totalPageviews = timeseriesRes?.totals?.pageviews > 0 ? timeseriesRes.totals.pageviews : sumPageviews;

  return <DashboardTrafficWidget data={timeseries} totalVisitors={totalVisitors} totalPageviews={totalPageviews} isConnected={isConnected} />;
}

async function DashboardTransactions() {
  const transactions = await getRecentTransactions();
  return (
    <div className="bg-white p-5 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 sm:mb-8">
        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Recent Transactions</h3>
        <div className="flex items-center gap-4">
          <Link href="/en/admin/balance-sheet" className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">
            Balance Sheet
          </Link>
          <Link href="/en/admin/transactions" className="text-xs font-black text-brand-pink uppercase tracking-widest hover:underline">
            View All
          </Link>
        </div>
      </div>
      <div className="space-y-6">
        {transactions.length > 0 ? (
          transactions.map((tx: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-3 py-4 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getUserDisplayAvatarUrl(tx.profile)}
                  alt={tx.profile?.full_name || 'Guest'}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-slate-100 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand-dark truncate">{tx.profile?.full_name || 'Anonymous Guest'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{tx.mystery?.title || 'Unknown Mystery'}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-brand-dark">£{(tx.amount || 0).toLocaleString()}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${tx.status === 'succeeded' ? 'text-green-500' : 'text-amber-500'}`}>
                  {tx.status}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}

async function DashboardTopMysteries() {
  const topMysteries = await getTopMysteries();
  return (
    <div className="bg-white p-5 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 sm:mb-8">
        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Top Mystery Bases</h3>
        <Link href="/en/admin/mysteries" className="text-xs font-black text-brand-pink uppercase tracking-widest hover:underline">Manage All</Link>
      </div>
      <div className="space-y-6">
        {topMysteries.length > 0 ? (
          topMysteries.map((base, i) => {
            const colors = ['bg-brand-pink', 'bg-brand-blue', 'bg-brand-dark', 'bg-gray-400'];
            const colorClass = colors[i % colors.length];
            return (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-2 h-12 rounded-full shrink-0 ${colorClass}`}></div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-dark truncate">{base.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{base.sales} Sales</p>
                  </div>
                </div>
                <div className="w-20 sm:w-24 bg-gray-100 h-2 rounded-full overflow-hidden shrink-0">
                  <div 
                    className={`h-full ${colorClass}`} 
                    style={{ width: `${Math.min(100, (base.sales / (topMysteries[0].sales || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No mystery sales data yet.</p>
        )}
      </div>
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 h-28 shadow-sm">
          <div className="h-3 bg-slate-100 rounded w-16 mb-4"></div>
          <div className="h-8 bg-slate-100 rounded w-24"></div>
        </div>
      ))}
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm animate-pulse h-[400px]">
      <div className="flex justify-between items-center mb-8">
        <div className="h-6 bg-slate-100 rounded w-40"></div>
        <div className="h-4 bg-slate-100 rounded w-16"></div>
      </div>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center h-16 border-b border-gray-50 last:border-0 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-24"></div>
                <div className="h-3 bg-slate-100 rounded w-32"></div>
              </div>
            </div>
            <div className="space-y-2 text-right">
              <div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div>
              <div className="h-3 bg-slate-100 rounded w-12 ml-auto"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopMysteriesSkeleton() {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm animate-pulse h-[400px]">
      <div className="flex justify-between items-center mb-8">
        <div className="h-6 bg-slate-100 rounded w-40"></div>
        <div className="h-4 bg-slate-100 rounded w-16"></div>
      </div>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center h-14">
            <div className="flex items-center gap-4">
              <div className="w-2 h-12 rounded-full bg-slate-100"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-32"></div>
                <div className="h-3 bg-slate-100 rounded w-16"></div>
              </div>
            </div>
            <div className="w-24 bg-slate-100 h-2 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
