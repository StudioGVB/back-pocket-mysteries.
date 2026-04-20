'use client';

import React, { useRef, useState } from 'react';
import { addCharacterAction } from '../actions';
import { Archetype, PlotRole } from '@/types/database';

interface AddCharacterQuickFormProps {
  mysteryId: string;
}

export function AddCharacterQuickForm({ mysteryId }: AddCharacterQuickFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="bg-white p-1 rounded-[2.4rem] shadow-sm">
      <div className="flex items-center gap-4 px-8 pt-6 pb-2">
        <div className="w-8 h-8 rounded-full bg-brand-pink/10 flex items-center justify-center">
          <span className="text-brand-pink text-xs">🎭</span>
        </div>
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Enroll New Cast Member</h3>
      </div>

      <form 
        ref={formRef}
        action={async (formData) => {
          setIsPending(true);
          try {
            await addCharacterAction(mysteryId, formData);
            formRef.current?.reset();
          } finally {
            setIsPending(false);
          }
        }}
        className="p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-50/50 p-6 rounded-[1.8rem] border border-slate-100">
          {/* Name Field */}
          <div className="md:col-span-4">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
            <input 
              name="name"
              required
              placeholder="e.g. Professor Plum"
              className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-pink/10 focus:border-brand-pink outline-none font-bold transition-all text-sm placeholder:text-slate-300 shadow-sm"
            />
          </div>
          
          {/* Importance Field */}
          <div className="md:col-span-3">
             <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Importance</label>
             <div className="relative">
               <select 
                 name="importance"
                 required
                 className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-pink/10 focus:border-brand-pink outline-none font-bold transition-all appearance-none text-sm cursor-pointer shadow-sm"
               >
                 <option value="mandatory">Mandatory</option>
                 <option value="optional">Optional</option>
               </select>
               <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
               </div>
             </div>
          </div>

          {/* Plot Role Field */}
          <div className="md:col-span-3">
             <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Plot Role</label>
             <div className="relative">
               <select 
                 name="plot_role"
                 required
                 className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-pink/10 focus:border-brand-pink outline-none font-bold transition-all appearance-none text-sm cursor-pointer shadow-sm"
               >
                 <option value="innocent">Innocent</option>
                 <option value="killer">Killer</option>
                 <option value="assistant">Assistant</option>
                 <option value="victim">Victim (Not Playable)</option>
               </select>
               <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
               </div>
             </div>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2 flex items-end">
            <button 
              disabled={isPending}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-pink transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 h-[56px]"
            >
              {isPending ? 'Working...' : 'Create profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
