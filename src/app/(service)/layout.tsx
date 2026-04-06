import React from 'react';
import Link from 'next/link';

export default function ServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center text-white font-black text-sm group-hover:scale-105 transition-transform">
              B
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-brand-pink transition-colors">
              Back Pocket <span className="text-brand-blue group-hover:text-slate-900 transition-colors uppercase tracking-tighter">Games</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex gap-10 text-sm font-bold text-slate-600 mr-auto ml-12">
            <Link href="/mysteries" className="hover:text-brand-pink transition-all hover:translate-y-[-1px]">Browse Stories</Link>
            <Link href="/account/orders" className="hover:text-brand-pink transition-all hover:translate-y-[-1px]">Purchases</Link>
          </nav>
          
          <div className="flex gap-6 items-center">
            <Link href="/account/settings" className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 text-xs font-black shadow-sm hover:scale-105 hover:bg-white hover:shadow-xl transition-all hover:border-brand-pink">
              GB
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow py-12 lg:py-20 bg-slate-50/30">{children}</main>
      
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Back Pocket Games. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
