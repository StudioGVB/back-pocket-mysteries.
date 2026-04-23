"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function BuilderSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: 'Mysteries', href: '/builder/mysteries', icon: '🔍' },
    { label: 'Content Assets', href: '/builder/content', icon: '📁' },
    { label: 'Publishing', href: '/builder/publishing', icon: '🚀' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-2xl transition-all duration-300 relative z-20`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-lg z-30 transition-all"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      <div className={`p-8 h-28 flex items-center ${isCollapsed ? 'justify-center px-4' : ''}`}>
        {!isCollapsed ? (
          <Link href="/builder" className="group flex flex-col gap-2 overflow-hidden">
            <Image 
              src="/logo-horizontal-white.png" 
              alt="Back Pocket Mysteries Builder" 
              width={160} 
              height={32} 
              className="h-8 w-auto object-contain group-hover:scale-105 transition-transform origin-left"
            />
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] pl-1 whitespace-nowrap">Builder</span>
          </Link>
        ) : (
          <Link href="/builder" className="font-black text-brand-pink text-2xl" title="Builder Portal">
            BP
          </Link>
        )}
      </div>
      
      <nav className={`flex-grow ${isCollapsed ? 'px-2' : 'px-4'} space-y-2 mt-4`}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-6'} py-4 hover:bg-white/10 rounded-2xl transition-all group ${isActive ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white'} font-bold text-sm relative`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`text-xl group-hover:scale-110 transition-transform ${isActive ? 'text-brand-pink' : 'group-hover:text-brand-pink'}`}>{item.icon}</span>
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      
      <div className={`p-6 border-t border-white/5 bg-slate-950/50 flex flex-col gap-4`}>
        <Link href="/admin" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} text-xs text-slate-400 hover:text-brand-pink font-bold transition-all`} title={isCollapsed ? "Admin Dashboard" : undefined}>
          <span className={isCollapsed ? "text-xl" : "text-sm"}>{isCollapsed ? "⚙️" : "←"}</span>
          {!isCollapsed && <span className="whitespace-nowrap">Admin Dashboard</span>}
        </Link>
        
        <Link href="/" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} text-xs text-slate-400 hover:text-brand-pink font-bold transition-all`} title={isCollapsed ? "Back to Public Site" : undefined}>
          <span className={isCollapsed ? "text-xl" : "text-sm"}>{isCollapsed ? "🌍" : "←"}</span>
          {!isCollapsed && <span className="whitespace-nowrap">Back to Public Site</span>}
        </Link>
        
        <button className={`w-full py-4 bg-white/5 hover:bg-red-500/10 text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isCollapsed ? 'px-0 flex justify-center items-center' : ''}`} title={isCollapsed ? "Logout" : undefined}>
          {isCollapsed ? <span className="text-xl">🚪</span> : "Logout"}
        </button>
      </div>
    </aside>
  );
}
