import React from 'react';
import { BuilderSidebar } from '@/components/builder/BuilderSidebar';

export default async function BuilderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <BuilderSidebar />


      {/* Main Content */}
      <div className="flex-grow flex flex-col overflow-hidden">
        <main className="flex-grow overflow-auto custom-scrollbar bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
