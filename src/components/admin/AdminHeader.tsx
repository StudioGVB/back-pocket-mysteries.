import React from 'react';
import { getUserDisplayAvatarUrl } from '@/utils/avatar';

export function AdminHeader() {
  const adminAvatarUrl = getUserDisplayAvatarUrl({
    id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
    full_name: 'Gabriella Blyth',
    avatar_config: {
      seed: 'Gabriella Blyth',
      top: 'straight01',
      hairColor: '282828',
      skinColor: 'ffcd94',
    },
  });

  return (
    <header className="flex justify-between items-center mb-10">
      <div>
        <h1 className="text-2xl font-black text-brand-dark tracking-tight">Admin Portal</h1>
        <p className="text-gray-500 text-sm font-medium">Welcome back, Admin</p>
      </div>
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={adminAvatarUrl}
          alt="Admin"
          className="w-10 h-10 rounded-full object-cover border-2 border-brand-pink/30 bg-white shadow-sm"
        />
      </div>
    </header>
  );
}
