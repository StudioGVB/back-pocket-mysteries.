"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MysteryStudioSidebarProps {
  mysteryId: string;
  mysteryTitle?: string;
}

export function MysteryStudioSidebar({ mysteryId, mysteryTitle }: MysteryStudioSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: `/builder/mysteries/${mysteryId}`, icon: '📊' },
    { label: 'Story & Core', href: `/builder/mysteries/${mysteryId}/core`, icon: '📝' },
    { label: 'Characters', href: `/builder/mysteries/${mysteryId}/characters`, icon: '👥' },
    { label: 'Relationships', href: `/builder/mysteries/${mysteryId}/relationships`, icon: '🔗' },
    { label: 'Plot Timeline', href: `/builder/mysteries/${mysteryId}/timeline`, icon: '⏳' },
    { label: 'Clue Board', href: `/builder/mysteries/${mysteryId}/clues`, icon: '🔍' },
    { label: 'Subplots', href: `/builder/mysteries/${mysteryId}/subplots`, icon: '🎭' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-100 flex flex-col h-full overflow-hidden self-stretch">
      <div className="p-6 border-b border-slate-50">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Currently Editing</h2>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-pink/10 rounded-lg flex items-center justify-center text-lg">✨</div>
          <span className="font-black text-slate-900 truncate text-sm">{mysteryTitle || 'Loading...'}</span>
        </div>
      </div>
      
      <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                isActive 
                  ? 'bg-brand-pink text-white shadow-lg shadow-brand-pink/20' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-50 space-y-3">
        <div className="bg-slate-50 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">Readiness</span>
            <span className="text-[10px] font-black text-brand-pink tracking-tight">45%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-pink w-[45%] rounded-full shadow-[0_0_8px_rgba(255,51,102,0.4)]"></div>
          </div>
        </div>
        
        <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-blue transition-all shadow-xl shadow-slate-900/10 active:scale-95">
          Publish Mystery
        </button>
      </div>
    </div>
  );
}
