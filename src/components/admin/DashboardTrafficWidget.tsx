"use client";
import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export function DashboardTrafficWidget({ data, totalVisitors, totalPageviews, isConnected }: { data: any[], totalVisitors: number, totalPageviews: number, isConnected: boolean }) {
  
  if (!isConnected) {
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

  const formattedData = data.map(d => {
    const date = new Date(d.key);
    return {
      ...d,
      displayDate: date.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });

  return (
    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
      <div className="flex-shrink-0 w-full lg:w-auto">
        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live Site Traffic
        </h3>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Last 7 Days</p>
        
        <div className="flex items-center gap-8 mt-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Visitors</p>
            <p className="text-3xl font-black text-brand-dark">{totalVisitors.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Page Views</p>
            <p className="text-3xl font-black text-brand-pink">{totalPageviews.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="mt-6">
          <Link href="/en/admin/analytics" className="bg-slate-100 hover:bg-brand-dark hover:text-white text-brand-dark text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm inline-block">
            Full Report →
          </Link>
        </div>
      </div>
      
      <div className="w-full lg:flex-1 h-[160px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} dy={10} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 900, color: '#1e293b' }}
              labelStyle={{ fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}
            />
            <Bar dataKey="pageviews" fill="#fe04c6" radius={[8, 8, 8, 8] as any} barSize={16} name="Page Views" background={{ fill: '#f4f4f4', radius: 8 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
