'use client';

import React, { useState } from 'react';
import { createMysteryAction } from '../actions';
import { useParams } from 'next/navigation';

export function CreateMysteryButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState<number>(6);
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const packageOptions = [
    { max: 6, label: 'Basic Package', range: '4–6 Players', sub: '$19 Base • Requires 6 Characters' },
    { max: 10, label: 'Premium Package', range: '4–10 Players', sub: '$25 Base • Requires 10 Characters' },
    { max: 16, label: 'Grand Package', range: '4–16 Players', sub: '$33 Base • Requires 16 Characters' },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-brand-blue text-white rounded-2xl font-bold hover:bg-brand-pink transition-all shadow-lg shadow-brand-blue/10 active:scale-95 flex items-center gap-2 group"
      >
        <span className="text-xl group-hover:rotate-90 transition-transform">+</span>
        Create New Mystery
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl shadow-slate-900/20 border border-white animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-slate-900 mb-2">New Mystery Project</h2>
            <p className="text-slate-500 font-medium text-sm mb-6">Choose the package tier, name, and theme for your new mystery.</p>
            
            <form action={async (formData) => {
              setIsPending(true);
              try {
                await createMysteryAction(formData);
                // Next.js redirect() throws a special object — this won't run on success
              } catch (e: any) {
                // Re-throw Next.js redirect objects so navigation works
                if (e?.digest?.startsWith('NEXT_REDIRECT')) {
                  throw e;
                }
                console.error('Mystery creation error:', e);
                setIsPending(false);
              }
            }} className="space-y-6">
              <input type="hidden" name="isAdmin" value="false" />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="max_players" value={selectedMaxPlayers} />

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Select Package Tier
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {packageOptions.map((pkg) => {
                    const isSelected = selectedMaxPlayers === pkg.max;
                    return (
                      <button
                        key={pkg.max}
                        type="button"
                        onClick={() => setSelectedMaxPlayers(pkg.max)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                            : 'border-slate-100 bg-slate-50/70 hover:border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-brand-pink' : 'text-slate-900'}`}>
                              {pkg.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-900/5 text-[10px] font-black text-slate-600 uppercase">
                              {pkg.range}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-400 mt-0.5">{pkg.sub}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                          isSelected ? 'border-brand-pink bg-brand-pink text-white' : 'border-slate-300 text-transparent'
                        }`}>
                          ✓
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mystery Title</label>
                <input 
                  name="title"
                  required
                  placeholder="e.g. The Gatsby Gala"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all font-bold placeholder:text-slate-300"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Theme / Setting</label>
                <input 
                  name="theme"
                  required
                  placeholder="e.g. 1920s Art Deco Lounge"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all font-bold placeholder:text-slate-300"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="flex-grow py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-100 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex-grow py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-pink transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? `Seeding ${selectedMaxPlayers} roles...` : `Create Studio (${selectedMaxPlayers} Roles) →`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
