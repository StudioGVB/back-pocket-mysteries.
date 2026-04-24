import React from 'react';
import { getAdminStats } from '../admin-data';

export default async function AdminAnalyticsPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
          Platform <span className="text-brand-pink italic">Analytics</span>
        </h1>
        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
          Detailed sales, conversion rates, and traffic
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Revenue</p>
          <p className="text-4xl font-black text-brand-dark">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Sales</p>
          <p className="text-4xl font-black text-brand-dark">{stats.salesCount}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Avg Order Value</p>
          <p className="text-4xl font-black text-brand-dark">${stats.avgOrderVal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Active Users</p>
          <p className="text-4xl font-black text-brand-dark">{stats.activeUsers}</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-300 mb-4"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <h3 className="text-lg font-black text-brand-dark mb-2">More Analytics Coming Soon</h3>
        <p className="text-gray-500 font-medium">Detailed traffic sources, conversion funnels, and mystery performance graphs will be available in a future update.</p>
      </div>
    </div>
  );
}
