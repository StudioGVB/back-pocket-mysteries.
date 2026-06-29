'use client';

import React from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';

interface Mystery {
  id: string;
  title: string;
  [key: string]: any;
}

export function MysterySelectClient({
  mysteries,
}: {
  mysteries: Mystery[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  // Extract the current mystery ID from the URL if we are inside a mystery
  const mysteryIdMatch = pathname.match(/\/builder\/mysteries\/([^\/]+)/);
  const activeMysteryId = mysteryIdMatch ? mysteryIdMatch[1] : null;

  const handleMysteryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId) {
      router.push(`/${locale}/builder/mysteries/${selectedId}`);
    } else {
      router.push(`/${locale}/builder/mysteries`);
    }
  };

  return (
    <>
      <label htmlFor="mystery-select" className="sr-only">Select Mystery</label>
      <select 
        id="mystery-select"
        value={activeMysteryId || ''}
        onChange={handleMysteryChange}
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-brand-pink focus:border-brand-pink block p-2.5 outline-none appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
      >
        <option value="">-- Select a Mystery --</option>
        {mysteries.map(mystery => (
          <option key={mystery.id} value={mystery.id}>
            {mystery.title || 'Untitled Mystery'}
          </option>
        ))}
      </select>
    </>
  );
}
