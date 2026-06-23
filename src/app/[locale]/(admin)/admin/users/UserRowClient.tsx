'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function UserRowClient({ 
  user, 
  locale, 
  children 
}: { 
  user: any; 
  locale: string; 
  children: React.ReactNode;
}) {
  const router = useRouter();
  
  return (
    <tr 
      onClick={() => router.push(`/${locale}/admin/users/${user.id}`)}
      className="hover:bg-brand-pink/5 transition-colors group cursor-pointer"
    >
      {children}
    </tr>
  );
}
