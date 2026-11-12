'use client';

import React from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { CustomSelect } from '@/components/ui/CustomSelect';

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
      <label htmlFor="mystery-select" className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 px-1">
        Active Mystery
      </label>
      <CustomSelect
        id="mystery-select"
        variant="dark"
        value={activeMysteryId || ''}
        onChange={handleMysteryChange}
        className="w-full bg-white/[0.04] border border-white/10 text-white text-xs font-bold rounded-lg focus:border-brand-pink focus:ring-1 focus:ring-brand-pink/50 py-2 px-3 outline-none hover:bg-white/[0.07] transition-all"
      >
        <option value="">All Mysteries...</option>
        {mysteries.map(mystery => (
          <option key={mystery.id} value={mystery.id}>
            {mystery.title || 'Untitled Mystery'}
          </option>
        ))}
      </CustomSelect>
    </div>
  );
}
