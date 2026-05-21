"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

interface Mystery {
  id: string;
  title: string;
  [key: string]: any;
}

interface BuilderSidebarProps {
  mysteries?: Mystery[];
  locale?: string;
}

export function BuilderSidebar({ mysteries = [], locale = 'en' }: BuilderSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Extract the current mystery ID from the URL if we are inside a mystery
  const mysteryIdMatch = pathname.match(/\/builder\/mysteries\/([^\/]+)/);
  // Need to make sure it's not matching 'create' or other static routes if they exist
  let activeMysteryId = mysteryIdMatch ? mysteryIdMatch[1] : null;

  // Global nav items
  const globalNavItems = [
    { label: 'All Mysteries', href: `/${locale}/builder/mysteries`, icon: '🔍' },
  ];

  // Context-aware nav items (shown when a mystery is selected)
  const mysteryNavItems = activeMysteryId ? [
    { label: 'Build', href: `/${locale}/builder/mysteries/${activeMysteryId}`, icon: '🛠️', exact: true },
    { label: 'Compile', href: `/${locale}/builder/mysteries/${activeMysteryId}/compile`, icon: '📦', exact: true },
    { label: 'Status', href: `/${locale}/builder/mysteries/${activeMysteryId}/status`, icon: '📊', exact: true },
  ] : [];

  const handleMysteryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId) {
      router.push(`/${locale}/builder/mysteries/${selectedId}`);
    } else {
      router.push(`/${locale}/builder/mysteries`);
    }
  };

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
          <Link href={`/${locale}/builder`} className="group flex flex-col gap-2 overflow-hidden">
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
          <Link href={`/${locale}/builder`} className="font-black text-brand-pink text-2xl" title="Builder Portal">
            BP
          </Link>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-6 mb-4">
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
        </div>
      )}
      
      <nav className={`flex-grow ${isCollapsed ? 'px-2' : 'px-4'} space-y-6 mt-2 overflow-y-auto custom-scrollbar`}>
        {/* Mystery Context Navigation */}
        {activeMysteryId && (
          <div className="space-y-1">
            {!isCollapsed && <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink mb-2">Current Mystery</h3>}
            {mysteryNavItems.map((item) => {
              // Since 'Build' href is exactly the base URL, we need to be careful with isActive logic
              // If it's exact, it should only match exactly.
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              
              // Special case: if we are deeper in the build path (e.g. /characters), "Build" should still be active
              const isBuildDeep = item.label === 'Build' && pathname.startsWith(item.href) && !pathname.includes('/compile') && !pathname.includes('/status');
              const finalIsActive = isActive || isBuildDeep;

              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3 hover:bg-white/10 rounded-xl transition-all group ${finalIsActive ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white'} font-bold text-sm relative`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={`text-xl group-hover:scale-110 transition-transform ${finalIsActive ? 'text-brand-pink' : 'group-hover:text-brand-pink'}`}>{item.icon}</span>
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Global Navigation */}
        <div className="space-y-1">
          {!isCollapsed && <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Platform</h3>}
          {globalNavItems.map((item) => {
            const isActive = pathname === item.href || (item.label !== 'All Mysteries' && pathname.startsWith(item.href));
            
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3 hover:bg-white/10 rounded-xl transition-all group ${isActive ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white'} font-bold text-sm relative`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={`text-xl group-hover:scale-110 transition-transform ${isActive ? 'text-brand-pink' : 'group-hover:text-brand-pink'}`}>{item.icon}</span>
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
      
      <div className={`p-6 border-t border-white/5 bg-slate-950/50 flex flex-col gap-4`}>
        <Link href={`/${locale}/admin`} className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} text-xs text-slate-400 hover:text-brand-pink font-bold transition-all`} title={isCollapsed ? "Admin Dashboard" : undefined}>
          <span className={isCollapsed ? "text-xl" : "text-sm"}>{isCollapsed ? "⚙️" : "←"}</span>
          {!isCollapsed && <span className="whitespace-nowrap">Admin Dashboard</span>}
        </Link>
        
        <Link href={`/${locale}`} className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} text-xs text-slate-400 hover:text-brand-pink font-bold transition-all`} title={isCollapsed ? "Back to Public Site" : undefined}>
          <span className={isCollapsed ? "text-xl" : "text-sm"}>{isCollapsed ? "🌍" : "←"}</span>
          {!isCollapsed && <span className="whitespace-nowrap">Back to Public Site</span>}
        </Link>
        
        <button className={`w-full py-4 bg-white/5 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isCollapsed ? 'px-0 flex justify-center items-center' : ''}`} title={isCollapsed ? "Logout" : undefined}>
          {isCollapsed ? <span className="text-xl">🚪</span> : "Logout"}
        </button>
      </div>
    </aside>
  );
}
