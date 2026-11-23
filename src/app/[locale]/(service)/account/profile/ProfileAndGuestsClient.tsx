'use client';

import React, { useState, useEffect } from 'react';
import ProfileClient from './ProfileClient';
import GuestsClient from '../guests/GuestsClient';
import { ProfileCard } from '@/components/account/ProfileCard';

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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [liveProfile, setLiveProfile] = useState(profile);
  const [liveUserName, setLiveUserName] = useState(user.name);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('welcome') === '1') {
        setIsEditingProfile(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('welcome');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto w-full px-0 sm:px-4 py-2 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1.5 sm:mb-2">My Roster</h1>
        <p className="text-sm sm:text-base text-slate-500 font-medium">Manage your own profile or invite your friends to join your cast.</p>
      </div>

      {/* User's Profile Card (Hero) */}
      <ProfileCard 
        user={{ ...user, name: liveUserName }} 
        profile={liveProfile} 
        onEdit={() => setIsEditingProfile(true)} 
      />

      {/* Guests Grid */}
      <GuestsClient 
        initialGuests={initialGuests}
        linkedGuests={linkedGuests}
        pendingInvites={pendingInvites}
        locale={locale}
      />

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <ProfileClient 
          user={{ ...user, name: liveUserName }} 
          profile={liveProfile} 
          onClose={() => setIsEditingProfile(false)}
          onSaved={updated => {
            if (updated.full_name) {
              setLiveUserName(updated.full_name);
            }
            setLiveProfile((prev: any) => ({
              ...(prev || {}),
              ...updated,
            }));
          }}
        />
      )}
    </div>
  );
}
