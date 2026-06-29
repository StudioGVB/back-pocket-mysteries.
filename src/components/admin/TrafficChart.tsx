"use client";
import React, { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function TrafficChart({ data }: { data: any[] }) {
  const [activeTab, setActiveTab] = useState<'visitors' | 'pageviews'>('visitors');

  const formattedData = data.map(d => {
    const date = new Date(d.key);
    return {
      ...d,
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  const totalVisitors = data.reduce((acc, curr) => acc + (curr.visitors || 0), 0);
  const totalPageviews = data.reduce((acc, curr) => acc + (curr.pageviews || 0), 0);

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('visitors')}
          className={`flex-1 p-6 text-left border-b-2 transition-all ${activeTab === 'visitors' ? 'border-brand-dark bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}
        >
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Visitors</p>
          <div className="flex items-center gap-4">
            <p className="text-4xl font-black text-brand-dark">{totalVisitors.toLocaleString()}</p>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('pageviews')}
          className={`flex-1 p-6 text-left border-l border-gray-100 border-b-2 transition-all ${activeTab === 'pageviews' ? 'border-brand-pink bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}
        >
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Page Views</p>
          <div className="flex items-center gap-4">
            <p className="text-4xl font-black text-brand-dark">{totalPageviews.toLocaleString()}</p>
          </div>
        </button>
      </div>

      {/* Chart */}
      <div className="p-6 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeTab === 'visitors' ? '#1e293b' : '#ec4899'} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={activeTab === 'visitors' ? '#1e293b' : '#ec4899'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 900, color: '#1e293b' }}
              labelStyle={{ fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey={activeTab} 
              stroke={activeTab === 'visitors' ? '#1e293b' : '#ec4899'} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
