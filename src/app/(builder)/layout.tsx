import React from 'react';
import Link from 'next/link';

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { label: 'Mysteries', href: '/builder/mysteries', icon: '🔍' },
    { label: 'Content Assets', href: '/builder/content', icon: '📁' },
    { label: 'Publishing', href: '/builder/publishing', icon: '🚀' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-2xl">
        <div className="p-8">
          <Link href="/builder" className="group flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-blue/20 group-hover:scale-105 transition-transform">
              B
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block group-hover:text-brand-pink transition-colors">Back Pocket</span>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] group-hover:text-brand-blue transition-colors">Games Builder</span>
            </div>
          </Link>
        </div>
        
        <nav className="flex-grow px-4 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 rounded-2xl transition-all group text-slate-400 hover:text-white font-bold text-sm"
            >
              <span className="text-xl group-hover:scale-110 transition-transform group-hover:text-brand-pink">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="p-8 border-t border-white/5 bg-slate-950/50">
          <Link href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-brand-pink mb-6 font-bold transition-all">
            <span>←</span> Back to Public Site
          </Link>
          <button className="w-full py-4 bg-white/5 hover:bg-red-500/10 text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-12 flex-shrink-0">
          <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
            <span className="hover:text-brand-pink cursor-pointer">Builder Portal</span>
            <span className="text-slate-200">/</span>
            <span className="text-slate-900">Partner Dashboard</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center text-white font-black text-xs shadow-lg shadow-brand-blue/10">
              GB
            </div>
          </div>
        </header>
        
        <main className="flex-grow p-12 overflow-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
