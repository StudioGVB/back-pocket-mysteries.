import React from 'react';
import Link from 'next/link';
import { AccountSidebar } from '@/components/account/AccountSidebar';

export default async function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <div className="flex min-h-screen bg-slate-50/30">
      {/* Fixed Sidebar */}
      <div className="hidden md:block w-72 flex-shrink-0">
        <AccountSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header (placeholder for now) */}
        <div className="md:hidden border-b border-slate-100 bg-white p-4 flex justify-between items-center sticky top-0 z-50">
          <Link href="/" className="font-black text-slate-900">
            Back Pocket Mysteries
          </Link>
          <button className="p-2 text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </button>
        </div>

        <main className="flex-grow p-6 lg:p-12 w-full max-w-6xl mx-auto">{children}</main>
        
        <footer className="border-t border-slate-100 bg-white py-12">
          <div className="container mx-auto px-6 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} Back Pocket Games. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
