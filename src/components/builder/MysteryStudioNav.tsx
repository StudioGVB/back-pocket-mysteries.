"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MysteryStudioNavProps {
  mysteryId: string;
}

export function MysteryStudioNav({ mysteryId }: MysteryStudioNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: `/builder/mysteries/${mysteryId}` },
    { label: 'Characters', href: `/builder/mysteries/${mysteryId}/characters` },
    { label: 'Relationships & Motives', href: `/builder/mysteries/${mysteryId}/relationships` },
    { label: 'Plot Timeline', href: `/builder/mysteries/${mysteryId}/timeline` },
    { label: 'Subplots', href: `/builder/mysteries/${mysteryId}/subplots` },
    { label: 'Clues', href: `/builder/mysteries/${mysteryId}/clues` },
    { label: 'Compile', href: `/builder/mysteries/${mysteryId}/compile` },
  ];

  return (
    <nav className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-2xl w-fit">
      {navItems.map((item) => {
        // Handle Overview being the root path specifically for active state
        const isActive = item.href === `/builder/mysteries/${mysteryId}` 
          ? pathname === item.href 
          : pathname.startsWith(item.href);

        return (
          <Link 
            key={item.href}
            href={item.href}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              isActive 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
