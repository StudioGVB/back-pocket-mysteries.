import React, { Suspense } from 'react';
import { BuilderSidebar } from '@/components/builder/BuilderSidebar';
import { MysterySelectWrapper } from '@/components/builder/MysterySelectWrapper';

export default async function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Suspense fallback={<div className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-2xl transition-all duration-300 relative z-20"></div>}>
        <BuilderSidebar>
          <Suspense fallback={<div className="w-full h-[42px] bg-slate-800 border border-slate-700 rounded-lg animate-pulse"></div>}>
            <MysterySelectWrapper />
          </Suspense>
        </BuilderSidebar>
      </Suspense>


      {/* Main Content */}
      <div className="flex-grow flex flex-col overflow-hidden">
        <main className="flex-grow overflow-auto custom-scrollbar bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
