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
    <div className="relative w-full">
      <label htmlFor="mystery-select" className="sr-only">Select Mystery</label>
      <select 
        id="mystery-select"
        value={activeMysteryId || ''}
        onChange={handleMysteryChange}
        className="w-full bg-[#05080e] border border-white/10 text-slate-100 text-xs font-black uppercase tracking-widest rounded-xl focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/50 block py-3.5 pl-4 pr-10 outline-none appearance-none cursor-pointer hover:bg-slate-900/60 transition-all duration-300"
      >
        <option value="" className="bg-[#0c1322] text-slate-400">Select Mystery</option>
        {mysteries.map(mystery => (
          <option key={mystery.id} value={mystery.id} className="bg-[#0c1322] text-slate-100 font-medium normal-case tracking-normal">
            {mystery.title || 'Untitled Mystery'}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
