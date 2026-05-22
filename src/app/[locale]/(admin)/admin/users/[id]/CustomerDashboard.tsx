'use client';

import React, { useState } from 'react';

export function CustomerDashboard({ profile, orders, mysteries, guests }: any) {
  const [activeTab, setActiveTab] = useState<'mysteries' | 'orders' | 'guests' | 'personal'>('mysteries');

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-gray-100">
        {[
          { id: 'mysteries', label: 'Mysteries Created' },
          { id: 'orders', label: 'Transaction History' },
          { id: 'guests', label: 'Guest Roster' },
          { id: 'personal', label: 'Player Details' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${
              activeTab === tab.id 
                ? 'border-brand-pink text-brand-dark' 
                : 'border-transparent text-gray-400 hover:text-brand-pink hover:bg-gray-50/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-8">
        
        {/* MYSTERIES TAB */}
        {activeTab === 'mysteries' && (
          <div>
            {mysteries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 rounded-tl-xl">Title</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Size</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 rounded-tr-xl">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mysteries.map((m: any) => (
                      <tr key={m.id}>
                        <td className="px-6 py-4 font-black text-brand-dark">{m.title}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${m.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{m.max_players ? `Up to ${m.max_players}` : 'N/A'}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(m.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 font-bold text-sm text-center py-12">No mysteries created yet.</p>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 rounded-tl-xl">Order ID</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Item</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 rounded-tr-xl">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map((o: any) => (
                      <tr key={o.id}>
                        <td className="px-6 py-4 text-xs font-mono text-gray-400">{o.id.split('-')[0]}</td>
                        <td className="px-6 py-4 font-black text-brand-dark">{o.mystery?.title || 'Unknown Item'}</td>
                        <td className="px-6 py-4 font-bold text-brand-pink">${((o.amount || 0) / 100).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${o.status === 'succeeded' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 font-bold text-sm text-center py-12">No transaction history.</p>
            )}
          </div>
        )}

        {/* GUESTS TAB */}
        {activeTab === 'guests' && (
          <div>
            {guests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {guests.map((g: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center font-black uppercase flex-shrink-0">
                      {g.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-brand-dark truncate">{g.name}</p>
                      {g.isLinked ? (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-green-500">Linked Account</p>
                      ) : (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Manual Entry</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 font-bold text-sm text-center py-12">Guest roster is empty.</p>
            )}
          </div>
        )}

        {/* PERSONAL DETAILS TAB */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Player Bio</h4>
                <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {profile.bio || 'No bio provided.'}
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Fun Facts</h4>
                <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {profile.fun_facts || 'No fun facts provided.'}
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Character Preferences</h4>
                <div className="flex flex-wrap gap-2">
                  {(profile.character_preferences || []).length > 0 ? (
                    profile.character_preferences.map((pref: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                        {pref}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm font-bold">None specified</span>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Dietary Needs</h4>
                <div className="flex flex-wrap gap-2">
                  {(profile.dietary_needs || []).length > 0 ? (
                    profile.dietary_needs.map((diet: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {diet}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm font-bold">None specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
