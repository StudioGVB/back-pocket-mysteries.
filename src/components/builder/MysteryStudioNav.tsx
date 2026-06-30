"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface MysteryStudioNavProps {
  mysteryId: string;
}

export function MysteryStudioNav({ mysteryId }: MysteryStudioNavProps) {
  return (
    <Suspense fallback={<div className="h-[90px] bg-[#0b0f19] animate-pulse w-full" />}>
      <MysteryStudioNavContent mysteryId={mysteryId} />
    </Suspense>
  );
}

function MysteryStudioNavContent({ mysteryId }: { mysteryId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const navigation = [
    { 
      label: 'Overview', 
      href: `/builder/mysteries/${mysteryId}`,
      exact: true
    },
    { 
      label: 'Characters', 
      href: `/builder/mysteries/${mysteryId}/characters`,
      matchPatterns: [
        `/builder/mysteries/${mysteryId}/characters`, 
        `/builder/mysteries/${mysteryId}/relationships`,
        `/builder/mysteries/${mysteryId}/motives`
      ],
      subItems: [
        { label: 'Character Builder', href: `/builder/mysteries/${mysteryId}/characters` },
        { label: 'Character Relations', href: `/builder/mysteries/${mysteryId}/relationships` },
        { label: 'Character Motives', href: `/builder/mysteries/${mysteryId}/motives` },
      ]
    },
    { 
      label: 'Plot', 
      href: `/builder/mysteries/${mysteryId}/timeline`,
      matchPatterns: [`/builder/mysteries/${mysteryId}/timeline`, `/builder/mysteries/${mysteryId}/subplots`],
      subItems: [
        { label: 'Main Plot', href: `/builder/mysteries/${mysteryId}/timeline` },
        { label: 'Sub Plots', href: `/builder/mysteries/${mysteryId}/subplots` },
      ]
    },
    { 
      label: 'Clues', 
      href: `/builder/mysteries/${mysteryId}/clues`,
      matchPatterns: [`/builder/mysteries/${mysteryId}/clues`],
      subItems: [
        { label: 'Clue Generator', href: `/builder/mysteries/${mysteryId}/clues?tab=generator` },
        { label: 'Clue Organiser', href: `/builder/mysteries/${mysteryId}/clues` },
      ]
    },
  ];

  const activeMainItem = navigation.find(item => {
    if (item.exact) {
      return pathname.endsWith(item.href);
    }
    if (item.matchPatterns) {
      return item.matchPatterns.some(pattern => pathname.includes(pattern));
    }
    return pathname.includes(item.href);
  });

  return (
    <div className="flex flex-col w-full">
      {/* Main Navigation Bar */}
      <nav className="w-full bg-[#0b0f19] border-b border-white/5 py-4">
        <div className="max-w-[1600px] mx-auto w-full px-12 flex items-center gap-3">
          {navigation.map((item) => {
            const isActive = activeMainItem === item;
            return (
              <Link 
                key={item.label}
                href={item.href}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
                  isActive 
                    ? 'bg-brand-pink/15 text-brand-pink border-brand-pink/30 shadow-[0_0_15px_rgba(254,4,198,0.15)] font-black' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sub Navigation Bar */}
      {activeMainItem && activeMainItem.subItems && activeMainItem.subItems.length > 0 ? (
        <nav className="w-full bg-[#f8fafc] border-b border-slate-100 py-3.5 relative z-10">
          <div className="max-w-[1600px] mx-auto w-full px-12 flex items-center">
            <div className="flex items-center gap-1.5 bg-slate-200/40 p-1 rounded-full border border-slate-200/30">
              {activeMainItem.subItems.map(sub => {
                const baseSubHref = sub.href.split('?')[0];
                const isSubActive = activeMainItem.label === 'Clues'
                  ? (sub.href.includes('tab=generator') ? tab === 'generator' : !tab)
                  : pathname.endsWith(baseSubHref);
                
                return (
                  <Link
                    key={sub.label}
                    href={sub.href}
                    className={`text-[11px] font-black uppercase tracking-wider px-5 py-2 rounded-full transition-all duration-300 ${
                      isSubActive 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      ) : (
        <div className="w-full bg-[#f8fafc] h-3 border-b border-slate-100 relative z-10"></div>
      )}
    </div>
  );
}
