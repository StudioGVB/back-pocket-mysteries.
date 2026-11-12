'use client';

import React, { useState } from 'react';
import { createMysteryAction } from '../../../../(builder)/builder/mysteries/actions';
import { useParams, useRouter } from 'next/navigation';
import { ThemeCombobox } from '@/components/ui/ThemeCombobox';

export function CreateMysteryBaseButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState<number>(6);
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';

  const packageOptions = [
    { max: 6, label: 'Basic Package', range: '4–6 Players', sub: '$19 Base • Requires 6 Characters' },
    { max: 10, label: 'Premium Package', range: '4–10 Players', sub: '$25 Base • Requires 10 Characters' },
    { max: 16, label: 'Grand Package', range: '4–16 Players', sub: '$33 Base • Requires 16 Characters' },
  ];

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
      setError(null);
    }
  };

  return (
    <>
      <button
        id="create-mystery-base-btn"
        onClick={() => { setIsOpen(true); setError(null); }}
        className="px-8 py-4 bg-brand-pink text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-brand-dark transition-all duration-300 shadow-xl shadow-brand-pink/10 hover:shadow-brand-pink/20"
      >
        + New Mystery Base
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl shadow-slate-900/20 border border-white animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-slate-900 mb-2">New Mystery Base</h2>
            <p className="text-slate-500 font-medium text-sm mb-6">
              Select a package tier, name, and theme to seed your mystery template with the exact number of characters required for that package.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-red-600 text-sm font-bold">⚠️ Seeding failed</p>
                <p className="text-red-500 text-xs mt-1 font-mono break-all">{error}</p>
              </div>
            )}

            <form
              action={async (formData) => {
                setIsPending(true);
                setError(null);
                try {
                  await createMysteryAction(formData);
                  // On success, Next.js redirect() throws a special error, this won't run
                } catch (e: any) {
                  // Next.js redirect throws a special non-error object, rethrow it
                  if (e?.digest?.startsWith('NEXT_REDIRECT')) {
                    throw e;
                  }
                  console.error('Mystery creation failed:', e);
                  setError(e?.message || 'An unexpected error occurred. Please try again.');
                  setIsPending(false);
                }
              }}
              className="space-y-6"
            >
              <input type="hidden" name="isAdmin" value="true" />
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Mystery Title
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Murder at the Manor"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all font-bold placeholder:text-slate-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Theme / Setting
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    Pick from list or type any custom theme
                  </span>
                </div>
                <ThemeCombobox
                  name="theme"
                  required
                  variant="boxed"
                  placeholder="Select a preset or type your own theme..."
                />
                <p className="mt-2 text-[10px] text-slate-400 font-medium">
                  💡 Tip: You can pick any preset from the list or type any custom theme directly into the box.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
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
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Seeding {selectedMaxPlayers} roles...
                    </span>
                  ) : (
                    `Create & Seed (${selectedMaxPlayers} Roles) →`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
