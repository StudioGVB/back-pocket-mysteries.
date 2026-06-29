import React, { Suspense } from 'react';
import { getAdminStats, getRecentTransactions, getTopMysteries } from './admin-data';
import { getVercelTraffic } from '@/app/actions/admin-vercel';

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
  const stats = await getAdminStats();
  const statConfig = [
    { label: 'Total Revenue', value: `£${stats.totalRevenue.toLocaleString()}`, color: 'brand-pink' },
    { label: 'Mystery Sales', value: stats.salesCount.toString(), color: 'brand-blue' },
    { label: 'Active Users', value: stats.activeUsers.toString(), color: 'brand-dark' },
    { label: 'Avg. Order Val', value: `£${stats.avgOrderVal.toFixed(2)}`, color: 'gray-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statConfig.map((stat, i) => (
        <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{stat.label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-brand-dark">{stat.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}

async function DashboardTraffic() {
  const traffic = await getVercelTraffic();
  
  if (!traffic.isConnected) {
    return (
      <div className="bg-gradient-to-r from-brand-dark to-slate-900 p-8 rounded-[32px] border border-brand-pink/20 shadow-lg relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-pink/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Live Analytics Not Connected</h3>
            <p className="text-sm text-slate-300">Add <code className="bg-black/50 px-2 py-1 rounded text-brand-pink">VERCEL_ACCESS_TOKEN</code> to your local environment variables to see live site traffic.</p>
          </div>
          <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="bg-brand-pink hover:bg-white hover:text-brand-dark text-white text-sm font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl shrink-0">
            Get Token
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
      <div>
        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live Site Traffic
        </h3>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Last 30 Days (Vercel Analytics)</p>
      </div>
      <div className="flex items-center gap-12">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Total Visitors</p>
          <p className="text-4xl font-black text-brand-dark">{traffic.visitors.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Page Views</p>
          <p className="text-4xl font-black text-brand-pink">{traffic.pageViews.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
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
