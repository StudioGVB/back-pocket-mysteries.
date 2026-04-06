import React from 'react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-pink/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-blue/5 rounded-full blur-3xl"></div>
      </div>
      
      <header className="p-8">
        <Link href="/" className="group inline-flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg transition-transform group-hover:scale-110 group-active:scale-95 shadow-brand-blue/20">
            B
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-gradient transition-all">
            Back Pocket <span className="text-brand-blue uppercase tracking-tighter">Games</span>
          </span>
        </Link>
      </header>
      
      <main className="flex-grow flex items-center justify-center p-6 pb-20">
        <div className="w-full max-w-md">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-brand-blue/5 border border-slate-100 relative">
            {children}
          </div>
          
          <div className="mt-8 text-center">
            <Link href="/" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-pink transition-colors">
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
