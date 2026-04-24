import React from 'react';
import { AccountSidebar } from '@/components/account/AccountSidebar';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <div className="container mx-auto px-6 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-12 items-start">
        {/* Sidebar */}
        <aside className="w-full md:w-72 flex-shrink-0 md:sticky md:top-32">
          <div className="bg-slate-50/50 backdrop-blur-md border border-slate-100 p-6 rounded-[2.5rem]">
            <div className="mb-8 px-4">
              <h2 className="text-xl font-black text-slate-900">My Account</h2>
              <p className="text-sm font-bold text-slate-400 mt-1">Manage your mysteries</p>
            </div>
            <AccountSidebar />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
