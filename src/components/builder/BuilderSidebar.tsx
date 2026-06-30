"use client";

import React, { useState, Suspense, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useParams } from 'next/navigation';

interface Mystery {
  id: string;
  title: string;
  [key: string]: any;
}

interface BuilderSidebarProps {
  children?: React.ReactNode;
}

export function BuilderSidebar({ children }: BuilderSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

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

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#070b13] border-r border-white/5 text-slate-300 flex-shrink-0 flex flex-col shadow-2xl transition-all duration-300 relative z-20`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-[#0c1322] hover:bg-brand-pink hover:text-white border border-white/10 text-slate-400 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-xl z-30 transition-all duration-300"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      <div className={`p-8 h-28 flex items-center ${isCollapsed ? 'justify-center px-4' : ''}`}>
        {!isCollapsed ? (
          <a href={`/${locale}/admin`} className="group flex flex-col gap-1 overflow-hidden">
            <Image 
              src="/logo-horizontal-white.png" 
              alt="Back Pocket Mysteries Builder" 
              width={160} 
              height={32} 
              className="h-8 w-auto object-contain group-hover:scale-105 transition-transform origin-left duration-300"
            />
            <span className="text-[9px] text-brand-pink font-black uppercase tracking-[0.25em] pl-1 whitespace-nowrap">Builder Studio</span>
          </a>
        ) : (
          <a href={`/${locale}/admin`} className="font-black text-brand-pink text-2xl hover:scale-110 transition-transform duration-300" title="Admin Dashboard">
            BP
          </a>
        )}
      </div>

      {!isCollapsed && children && (
        <div className="px-6 mb-6">
          {children}
        </div>
      )}
      
      <nav className={`flex-grow ${isCollapsed ? 'px-2' : 'px-4'} space-y-6 mt-2 overflow-y-auto custom-scrollbar`}>
        {/* Mystery Context Navigation */}
        {activeMysteryId && (
          <div className="space-y-1.5">
            {!isCollapsed && <h3 className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Current Mystery</h3>}
            {mysteryNavItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const isBuildDeep = item.label === 'Build' && pathname.startsWith(item.href) && !pathname.includes('/compile') && !pathname.includes('/status');
              const finalIsActive = isActive || isBuildDeep;

              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-xl transition-all duration-300 group ${
                    finalIsActive 
                      ? 'bg-white/5 text-white border border-white/5 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                  } font-bold text-sm relative overflow-hidden`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {finalIsActive && !isCollapsed && (
                    <span className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-brand-pink rounded-r-md" />
                  )}
                  <span className={`text-lg group-hover:scale-110 transition-transform duration-300 ${finalIsActive ? 'text-brand-pink' : 'group-hover:text-brand-pink text-slate-500'}`}>{item.icon}</span>
                  {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Global Navigation */}
        <div className="space-y-1.5">
          {!isCollapsed && <h3 className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Platform</h3>}
          {globalNavItems.map((item) => {
            const isActive = pathname === item.href || (item.label !== 'All Mysteries' && pathname.startsWith(item.href));
            
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-white/5 text-white border border-white/5 shadow-inner' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                } font-bold text-sm relative overflow-hidden`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && !isCollapsed && (
                  <span className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-brand-pink rounded-r-md" />
                )}
                <span className={`text-lg group-hover:scale-110 transition-transform duration-300 ${isActive ? 'text-brand-pink' : 'group-hover:text-brand-pink text-slate-500'}`}>{item.icon}</span>
                {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
      
      <div className={`p-6 border-t border-white/5 bg-[#05080e]/40 flex flex-col gap-4`}>
        <a href={`/${locale}/admin`} className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} text-xs text-slate-400 hover:text-brand-pink font-bold transition-all duration-300`} title={isCollapsed ? "Admin Dashboard" : undefined}>
          <span className={isCollapsed ? "text-xl" : "text-sm text-slate-500 group-hover:text-brand-pink"}>{isCollapsed ? "⚙️" : "←"}</span>
          {!isCollapsed && <span className="whitespace-nowrap">Admin Dashboard</span>}
        </a>
        
        <a href={`/${locale}`} className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} text-xs text-slate-400 hover:text-brand-pink font-bold transition-all duration-300`} title={isCollapsed ? "Back to Public Site" : undefined}>
          <span className={isCollapsed ? "text-xl" : "text-sm text-slate-500 group-hover:text-brand-pink"}>{isCollapsed ? "🌍" : "←"}</span>
          {!isCollapsed && <span className="whitespace-nowrap">Back to Public Site</span>}
        </a>
        
        <button className={`w-full py-3.5 bg-white/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${isCollapsed ? 'px-0 flex justify-center items-center' : ''}`} title={isCollapsed ? "Logout" : undefined}>
          {isCollapsed ? <span className="text-lg">🚪</span> : "Logout"}
        </button>
      </div>
    </aside>
  );
}
