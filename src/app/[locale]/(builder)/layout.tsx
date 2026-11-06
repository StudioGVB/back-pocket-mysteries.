import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { BuilderSidebar } from '@/components/builder/BuilderSidebar';
import { MysterySelectWrapper } from '@/components/builder/MysterySelectWrapper';
import { isUserAdmin } from '@/utils/admin-auth';
import { createClient } from '@/utils/supabase/server';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

async function BuilderSidebarWithAuth({ children }: { children?: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await isUserAdmin(supabase, user);
  return <BuilderSidebar isAdmin={isAdmin}>{children}</BuilderSidebar>;
}

export default async function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Suspense fallback={<div className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-2xl transition-all duration-300 relative z-20"></div>}>
        <BuilderSidebarWithAuth>
          <Suspense fallback={<div className="w-full h-[42px] bg-slate-800 border border-slate-700 rounded-lg animate-pulse"></div>}>
            <MysterySelectWrapper />
          </Suspense>
        </BuilderSidebarWithAuth>
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
