'use client';

import React, { useState } from 'react';
import { Database } from '@/types/database';
import { updateMysteryAction } from '../../actions';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface MainMurderConfigProps {
  mystery: Mystery;
  characters: Character[];
}

export function MainMurderConfig({ mystery, characters }: MainMurderConfigProps) {
  const [isEditing, setIsEditing] = useState(false);
  const victim = characters.find(c => c.is_victim);

  return (
    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm mb-12 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl animate-pulse">
          🩸
        </div>
      </div>

      <div className="relative z-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 mb-2">Primary Incident</h2>
        <h3 className="text-2xl font-black text-slate-900 mb-6">The Main Murder Details</h3>
        
        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Victim</span>
                <p className="font-bold text-slate-900">{victim?.name || 'No victim assigned yet'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estimated Time of Death</span>
                <p className="font-bold text-slate-900">Between 10:00 PM and 11:30 PM</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">The "Truth" Summary</span>
              <p className="text-slate-600 font-medium leading-relaxed">
                {mystery.description || "Provide the secret truth of the murder here. This won't be revealed to players until the end."}
              </p>
            </div>

            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-slate-50 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
            >
              Update Murder Details
            </button>
          </div>
        ) : (
          <form 
            action={async (formData) => {
              await updateMysteryAction.bind(null, mystery.id)(formData);
              setIsEditing(false);
            }} 
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">The Secret Truth</label>
              <textarea 
                name="description"
                defaultValue={mystery.description || ''}
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all resize-none"
                placeholder="Write out exactly what happened. Who did it? How? Why?"
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-pink transition-all shadow-xl shadow-slate-900/10 active:scale-95">
                Save Truth
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
