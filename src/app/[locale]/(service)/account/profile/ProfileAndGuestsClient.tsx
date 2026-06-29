'use client';

import React, { useState } from 'react';
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

  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Roster</h1>
        <p className="text-slate-500 font-medium">Manage your own profile or invite your friends to join your cast.</p>
      </div>

      {/* User's Profile Card (Hero) */}
      <ProfileCard 
        user={user} 
        profile={profile} 
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
          user={user} 
          profile={profile} 
          onClose={() => setIsEditingProfile(false)} 
        />
      )}
    </div>
  );
}
