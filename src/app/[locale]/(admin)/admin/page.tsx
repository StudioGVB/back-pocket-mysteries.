import React, { Suspense } from 'react';
import { getAdminStats, getRecentTransactions, getTopMysteries } from './admin-data';
import { getAnalyticsTimeseries } from '@/app/actions/admin-vercel';
import { DashboardTrafficWidget } from '@/components/admin/DashboardTrafficWidget';
import { cookies } from 'next/headers';
import { DashboardTracker } from './DashboardTracker';

export const unstable_instant = false;

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
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
    { label: 'Total Revenue', value: `£${stats.totalRevenue.toLocaleString()}`, color: 'brand-pink' },
    { label: 'Mystery Sales', value: stats.salesCount.toString(), color: 'brand-blue' },
    { label: 'Active Users', value: stats.activeUsers.toString(), color: 'brand-dark', badge: stats.newUsersCount > 0 ? `${stats.newUsersCount} New` : null },
    { label: 'Avg. Order Val', value: `£${stats.avgOrderVal.toFixed(2)}`, color: 'gray-500' },
  ];

  return (
    <>
      <DashboardTracker />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statConfig.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
              {stat.badge && (
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink bg-brand-pink/10 px-2 py-1 rounded-full">{stat.badge}</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-dark">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

async function DashboardTraffic() {
  const timeseries = await getAnalyticsTimeseries(7);
  const isConnected = !!process.env.VERCEL_ACCESS_TOKEN;
  
  const totalVisitors = timeseries.reduce((acc: any, curr: any) => acc + (curr.visitors || 0), 0);
  const totalPageviews = timeseries.reduce((acc: any, curr: any) => acc + (curr.pageviews || 0), 0);

  return <DashboardTrafficWidget data={timeseries} totalVisitors={totalVisitors} totalPageviews={totalPageviews} isConnected={isConnected} />;
}

async function DashboardTransactions() {
  const transactions = await getRecentTransactions();
  return (
    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Recent Transactions</h3>
        <button className="text-xs font-black text-brand-pink uppercase tracking-widest hover:underline">View All</button>
      </div>
      <div className="space-y-6">
        {transactions.length > 0 ? (
          transactions.map((tx: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-brand-dark text-[10px] uppercase">
                  {(tx.profile?.full_name || 'Guest').split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-dark">{tx.profile?.full_name || 'Anonymous Guest'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{tx.mystery?.title || 'Unknown Mystery'}</p>
                </div>
              </div>
              <div className="text-right">
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
    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Top Mystery Bases</h3>
        <button className="text-xs font-black text-brand-pink uppercase tracking-widest hover:underline">Manage All</button>
      </div>
      <div className="space-y-6">
        {topMysteries.length > 0 ? (
          topMysteries.map((base, i) => {
            const colors = ['bg-brand-pink', 'bg-brand-blue', 'bg-brand-dark', 'bg-gray-400'];
            const colorClass = colors[i % colors.length];
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 rounded-full ${colorClass}`}></div>
                  <div>
                    <p className="text-sm font-bold text-brand-dark">{base.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{base.sales} Sales</p>
                  </div>
                </div>
                <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
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
