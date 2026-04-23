"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MysteryStudioNavProps {
  mysteryId: string;
}

export function MysteryStudioNav({ mysteryId }: MysteryStudioNavProps) {
  const pathname = usePathname();

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
        { label: 'Clue Organisor', href: `/builder/mysteries/${mysteryId}/clues` },
      ]
    },
    { 
      label: 'Compile', 
      href: `/builder/mysteries/${mysteryId}/compile`,
      exact: true
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
      <nav className="w-full bg-slate-900">
        <div className="max-w-[1600px] mx-auto w-full px-12 flex items-center">
          {navigation.map((item) => {
            const isActive = activeMainItem === item;
            return (
              <Link 
                key={item.label}
                href={item.href}
                className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-colors ${
                  isActive 
                    ? 'bg-[#f8fafc] text-slate-900' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
        <nav className="w-full bg-[#f8fafc]">
          <div className="max-w-[1600px] mx-auto w-full px-12 py-3 flex items-center gap-6">
            <div className="px-6 flex items-center gap-6 w-full">
              {activeMainItem.subItems.map(sub => {
                // Match sub items accounting for locale prefix in pathname
                const baseSubHref = sub.href.split('?')[0];
                const isSubActive = pathname.endsWith(baseSubHref) && 
                                    (sub.href.includes('?') ? true : !pathname.includes('?'));
                
                return (
                  <Link
                    key={sub.label}
                    href={sub.href}
                    className={`text-[13px] font-bold transition-colors ${
                      isSubActive 
                        ? 'text-slate-900' 
                        : 'text-slate-400 hover:text-slate-600'
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
        <div className="w-full bg-[#f8fafc] h-3"></div>
      )}
    </div>
  );
}
