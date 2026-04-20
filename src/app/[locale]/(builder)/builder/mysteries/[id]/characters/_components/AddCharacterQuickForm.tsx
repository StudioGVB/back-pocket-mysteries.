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
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 border-b-4 border-b-slate-100 w-full">
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
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Name Field */}
          <div className="md:col-span-4">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
            <input 
              name="name"
              required
              placeholder="e.g. Professor Plum"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all text-sm placeholder:text-slate-300"
            />
          </div>
          
          {/* Importance Field */}
          <div className="md:col-span-3">
             <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Importance</label>
             <select 
               name="importance"
               required
               className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all appearance-none text-sm cursor-pointer"
             >
               <option value="mandatory">Mandatory</option>
               <option value="optional">Optional</option>
             </select>
          </div>

          {/* Plot Role Field */}
          <div className="md:col-span-3">
             <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Plot Role</label>
             <select 
               name="plot_role"
               required
               className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all appearance-none text-sm cursor-pointer"
             >
               <option value="innocent">Innocent</option>
               <option value="killer">Killer</option>
               <option value="assistant">Assistant</option>
               <option value="victim">Victim (Not Playable)</option>
             </select>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2 flex items-end">
            <button 
              disabled={isPending}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-pink transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isPending ? '...' : 'Add Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
