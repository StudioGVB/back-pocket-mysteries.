'use client';

import React, { useState } from 'react';
import { createMysteryAction } from '../actions';

export function CreateMysteryButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

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
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl shadow-slate-900/20 border border-white animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-slate-900 mb-2">New Mystery Project</h2>
            <p className="text-slate-500 font-medium text-sm mb-8">Let's start by giving your interactive experience a name and theme.</p>
            
            <form action={async (formData) => {
              setIsPending(true);
              try {
                await createMysteryAction(formData);
              } catch (e) {
                console.error(e);
                setIsPending(false);
              }
            }} className="space-y-6">
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
                  className="flex-grow py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-100"
                >
                  Cancel
                </button>
                <button 
                  disabled={isPending}
                  className="flex-grow py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-pink transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Initializing...' : 'Create Studio →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
