import React from 'react';
import { getAdminStats, getRecentTransactions, getTopMysteries } from './admin-data';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [stats, transactions, topMysteries] = await Promise.all([
    getAdminStats(),
    getRecentTransactions(),
    getTopMysteries(),
  ]);

  const statConfig = [
    { label: 'Total Revenue', value: `£${stats.totalRevenue.toLocaleString()}`, color: 'brand-pink' },
    { label: 'Mystery Sales', value: stats.salesCount.toString(), color: 'brand-blue' },
    { label: 'Active Users', value: stats.activeUsers.toString(), color: 'brand-dark' },
    { label: 'Avg. Order Val', value: `£${stats.avgOrderVal.toFixed(2)}`, color: 'gray-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
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

        {/* Popular Mystery Bases */}
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
      </div>
    </div>
  );
}
