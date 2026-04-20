import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-pink/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-blue/5 rounded-full blur-3xl"></div>
      </div>
      
      <header className="p-8">
        <Link href="/" className="group inline-flex items-center gap-3">
          <Image 
            src="/logo-horizontal.png" 
            alt="Back Pocket Mysteries" 
            width={240} 
            height={48} 
            className="h-10 w-auto object-contain group-hover:scale-105 transition-transform origin-left"
          />
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
