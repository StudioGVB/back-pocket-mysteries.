'use client';

import React, { useState } from 'react';
import { createMysteryAction } from '../../../../(builder)/builder/mysteries/actions';
import { useParams, useRouter } from 'next/navigation';

export function CreateMysteryBaseButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';

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
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl shadow-slate-900/20 border border-white animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-slate-900 mb-2">New Mystery Base</h2>
            <p className="text-slate-500 font-medium text-sm mb-8">
              Create a new mystery template with 12 fully seeded characters, relationships, clues, and plot beats.
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
                  // On success, Next.js redirect() throws a special error — this won't run
                } catch (e: any) {
                  // Next.js redirect throws a special non-error object — rethrow it
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Theme / Setting
                </label>
                <input
                  name="theme"
                  required
                  placeholder="e.g. Victorian London, Spooky Carnival"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink transition-all font-bold placeholder:text-slate-300"
                />
                <p className="mt-2 text-[10px] text-slate-400 font-medium">
                  💡 Tip: Include &quot;circus&quot; or &quot;carnival&quot; in the title or theme to get the full curated Circus mystery seeded instantly.
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
                      Seeding mystery...
                    </span>
                  ) : (
                    'Create & Seed →'
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
