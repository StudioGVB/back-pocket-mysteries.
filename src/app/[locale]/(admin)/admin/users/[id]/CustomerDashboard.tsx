'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function CustomerDashboard({ profile, orders, mysteries, guests }: any) {
  const [activeTab, setActiveTab] = useState<'mysteries' | 'orders' | 'guests' | 'personal'>('mysteries');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedCount, setRegeneratedCount] = useState(0);
  const [currentlyGeneratingId, setCurrentlyGeneratingId] = useState<string | null>(null);

  const handleRegenerateAll = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setRegeneratedCount(0);

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      setCurrentlyGeneratingId(guest.id);

      try {
        const res = await fetch(`/api/admin/generate-avatar-single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId: guest.id, userId: profile.id })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to generate avatar for guest ${guest.id}`);
        }
      } catch (e: any) {
        console.error(`Error generating avatar for guest ${guest.id}:`, e);
        alert(`Error generating avatar for ${guest.name || guest.id}: ${e.message}`);
        setCurrentlyGeneratingId(null);
        setIsRegenerating(false);
        return; // STOP the loop!
      }

      setRegeneratedCount(prev => prev + 1);
      // Wait to avoid Imagen 4.0 API rate limits (15 RPM)
      await new Promise(r => setTimeout(r, 4000));
    }

    setCurrentlyGeneratingId(null);
    setIsRegenerating(false);
    window.location.reload();
  };

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mysteries.map((m: any, i: number) => (
                  <Link href={`/en/builder/mysteries/${m.id}`} key={i} className="block group">
                    <div className="p-6 rounded-[2rem] border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all bg-gray-50 group-hover:bg-white group-hover:border-brand-blue/30">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          m.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {m.status}
                        </span>
                        <span className="text-xs font-bold text-gray-400">{m.max_players} Players</span>
                      </div>
                      <h3 className="text-xl font-black text-brand-dark mb-2 line-clamp-2 leading-tight">{m.title}</h3>
                      <p className="text-xs text-gray-500 font-medium">Created {new Date(m.created_at).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <h3 className="text-lg font-black text-brand-dark mb-2">No mysteries yet</h3>
                <p className="text-gray-500 text-sm">This customer hasn't purchased or created any mysteries.</p>
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-500 font-medium">Viewing {orders.length} transactions</p>
            </div>
            
            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mystery</th>
                      <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm font-medium text-gray-600">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="py-4 px-4 text-sm font-bold text-brand-dark">{o.mystery?.title || 'Unknown Product'}</td>
                        <td className="py-4 px-4 text-sm font-black text-gray-900">${(o.amount || 0).toFixed(2)}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            o.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {o.status}
                          </span>
                        </td>
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
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-500 font-medium">Viewing {guests.length} guests</p>
              <button 
                onClick={handleRegenerateAll}
                disabled={isRegenerating}
                className={`px-4 py-2 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${
                  isRegenerating 
                    ? 'bg-brand-pink animate-pulse cursor-not-allowed' 
                    : 'bg-brand-dark hover:bg-brand-pink active:scale-95'
                }`}
              >
                {isRegenerating 
                  ? `Updated ${regeneratedCount}/${guests.length} photos` 
                  : 'Regenerate All AI Avatars'}
              </button>
            </div>
            
            {guests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guests.map((g: any, i: number) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedGuest(g)}
                    className="p-5 rounded-2xl border border-gray-100 flex items-start gap-5 hover:shadow-md hover:border-brand-pink/30 transition-all cursor-pointer group relative"
                  >
                    {currentlyGeneratingId === g.id && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                        <div className="w-8 h-8 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    <div className="w-24 h-24 rounded-2xl bg-brand-pink/10 text-brand-pink flex items-center justify-center text-2xl font-black uppercase flex-shrink-0 overflow-hidden shadow-inner border border-brand-pink/20 group-hover:scale-105 transition-transform">
                      {g.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={g.avatar_url} alt={g.name} className="w-full h-full object-cover" />
                      ) : (
                        g.name[0]
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-black text-brand-dark truncate text-xl">{g.name}</p>
                        {g.isLinked ? (
                          <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Linked Account</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded-lg text-[9px] font-black uppercase tracking-widest">Manual Entry</span>
                        )}
                      </div>
                      
                      {/* Physical Features */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {g.gender && <span className="px-2 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded-md text-[10px] font-bold">{g.gender}</span>}
                        {g.eye_color && <span className="px-2 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded-md text-[10px] font-bold">{g.eye_color} Eyes</span>}
                        {g.height && <span className="px-2 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded-md text-[10px] font-bold">{g.height}</span>}
                      </div>
                      
                      {/* Traits / Character Preferences */}
                      {(g.traits && g.traits.length > 0) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {g.traits.map((t: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-brand-pink/5 text-brand-pink border border-brand-pink/10 rounded-md text-[9px] font-black uppercase tracking-widest">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400 italic">No traits specified</span>
                      )}
                      
                      {/* Bio preview if exists */}
                      {g.bio && (
                        <p className="mt-3 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          "{g.bio}"
                        </p>
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

      {/* Guest Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedGuest(null)}>
          <div className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedGuest(null)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            
            <div className="flex flex-col md:flex-row">
              {/* Photo Side */}
              <div className="w-full md:w-1/2 bg-gray-100 relative min-h-[300px]">
                {selectedGuest.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={selectedGuest.avatar_url} alt={selectedGuest.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <p className="font-bold text-sm">No Photo Generated</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                  <div className="text-center">
                    <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                      AI Reference Photo
                    </span>
                  </div>
                  <button
                    id={`gen-single-${selectedGuest.id}`}
                    onClick={async () => {
                      const btn = document.getElementById(`gen-single-${selectedGuest.id}`);
                      if (btn) btn.innerText = 'Generating... (Wait)';
                      try {
                        const res = await fetch(`/api/admin/generate-avatar-single`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ guestId: selectedGuest.id, userId: profile.id })
                        });
                        if (res.ok) {
                          if (btn) btn.innerText = 'Done! Refreshing...';
                          window.location.reload();
                        } else {
                          const errorData = await res.json().catch(() => ({}));
                          alert(`Failed: ${errorData.error || 'Unknown error'}`);
                          if (btn) btn.innerText = 'Regenerate Photo';
                        }
                      } catch (e: any) {
                        alert(`Error: ${e.message}`);
                        if (btn) btn.innerText = 'Regenerate Photo';
                      }
                    }}
                    className="w-full py-2 bg-brand-pink text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark transition-colors shadow-lg"
                  >
                    Regenerate Photo
                  </button>
                </div>
              </div>
              
              {/* Details Side */}
              <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                <div className="mb-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-2">
                    {selectedGuest.isLinked ? 'Linked Account' : 'Manual Entry'}
                  </p>
                  <h2 className="text-3xl font-black text-brand-dark tracking-tight leading-none mb-2">{selectedGuest.name}</h2>
                  {selectedGuest.email && (
                    <p className="text-sm font-bold text-gray-400">{selectedGuest.email}</p>
                  )}
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Physical Attributes</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedGuest.gender ? <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{selectedGuest.gender}</span> : null}
                      {selectedGuest.eye_color ? <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{selectedGuest.eye_color} Eyes</span> : null}
                      {selectedGuest.height ? <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{selectedGuest.height}</span> : null}
                      {!selectedGuest.gender && !selectedGuest.eye_color && !selectedGuest.height && <span className="text-xs text-gray-400 italic">No physical attributes provided.</span>}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Character Traits</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedGuest.traits && selectedGuest.traits.length > 0) ? (
                        selectedGuest.traits.map((t: string, idx: number) => (
                          <span key={idx} className="px-3 py-1.5 bg-brand-pink/10 text-brand-pink rounded-lg text-xs font-black uppercase tracking-widest">
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">No traits selected.</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Guest Bio</h4>
                    {selectedGuest.bio ? (
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                        {selectedGuest.bio}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No bio provided.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
