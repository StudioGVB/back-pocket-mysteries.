'use client';

import React, { useState } from 'react';
import ProfileClient from './ProfileClient';
import GuestsClient from '../guests/GuestsClient';

interface ProfileAndGuestsClientProps {
  user: { name: string; email: string };
  profile: any;
  initialGuests: any[];
  linkedGuests: any[];
  pendingInvites: any[];
  locale: string;
}

export default function ProfileAndGuestsClient({
  user,
  profile,
  initialGuests,
  linkedGuests,
  pendingInvites,
  locale
}: ProfileAndGuestsClientProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'guests'>('profile');

  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-12">
      {/* Header and Tabs */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Roster</h1>
        <p className="text-slate-500 font-medium mb-8">Manage your own profile or invite your friends to join your cast.</p>
        
        <div className="flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-2 font-bold text-sm transition-colors relative ${
              activeTab === 'profile' ? 'text-brand-pink' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            My Profile
            {activeTab === 'profile' && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-brand-pink rounded-t-full" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('guests')}
            className={`pb-4 px-2 font-bold text-sm transition-colors relative ${
              activeTab === 'guests' ? 'text-brand-pink' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            My Guests
            {activeTab === 'guests' && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-brand-pink rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
        <ProfileClient user={user} profile={profile} />
      </div>
      
      <div className={activeTab === 'guests' ? 'block' : 'hidden'}>
        <GuestsClient 
          initialGuests={initialGuests}
          linkedGuests={linkedGuests}
          pendingInvites={pendingInvites}
          locale={locale}
        />
      </div>
    </div>
  );
}
