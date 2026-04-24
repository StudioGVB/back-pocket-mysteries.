'use client';

import React, { useState } from 'react';
import { GuestModal } from '@/components/account/GuestModal';

interface GuestsClientProps {
  initialGuests: any[];
  locale: string;
}

export default function GuestsClient({ initialGuests, locale }: GuestsClientProps) {
  const [guests, setGuests] = useState<any[]>(initialGuests);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveGuest = (newGuest: any) => {
    setGuests([...guests, newGuest]);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">My Guests</h1>
          <p className="text-slate-500 font-medium text-lg">Save friends and family for quick casting in your mysteries.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-brand-pink transition-all shadow-lg active:scale-95 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add New Guest
        </button>
      </div>

      {guests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guests.map((guest) => (
            <div key={guest.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden">
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  {guest.avatarUrl ? (
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={guest.avatarUrl} alt={guest.name} className="w-[120%] h-[120%] object-cover mt-2" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-brand-pink/5 rounded-2xl flex items-center justify-center text-xl text-brand-pink font-black border-2 border-white shadow-md">
                      {guest.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{guest.name}</h3>
                    <p className="text-xs font-bold text-slate-400">{guest.gender || 'Unspecified'}</p>
                  </div>
                </div>
                <button className="text-slate-300 hover:text-brand-pink transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-50 flex flex-wrap gap-2 relative z-10">
                {guest.traits && guest.traits.map((trait: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm">
                    {trait}
                  </span>
                ))}
                {(!guest.traits || guest.traits.length === 0) && (
                  <span className="text-xs text-slate-400 italic">No traits added.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-16 md:p-24 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-brand-pink/5 text-brand-pink rounded-3xl flex items-center justify-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">No guests saved yet!</h3>
          <p className="text-slate-500 font-medium max-w-md mb-10">
            Save your friends, family, and coworkers here so you can quickly cast them in your next murder mystery without re-entering their details.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-10 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-dark transition-all shadow-2xl shadow-brand-pink/20 hover:translate-y-[-4px] active:scale-95 flex items-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Your First Guest
          </button>
        </div>
      )}

      {/* The Avatar Builder Modal */}
      <GuestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveGuest} 
      />
    </div>
  );
}
