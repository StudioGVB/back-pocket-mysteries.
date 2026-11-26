import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Toaster } from 'sonner';
import { requireAdminOrRedirect } from '@/utils/admin-auth';

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

async function AdminAuthGate({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminOrRedirect(locale || 'en');
  return <>{children}</>;
}

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AdminAuthGate params={params}>
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 overflow-x-hidden">
          <Suspense fallback={<aside className="hidden md:block w-64 bg-brand-dark text-white min-h-screen fixed left-0 top-0" />}>
            <AdminSidebar />
          </Suspense>
          <Toaster richColors position="top-right" />

          {/* Main Content */}
          <main className="flex-grow md:ml-64 p-3.5 sm:p-6 lg:p-8 min-w-0 w-full overflow-x-hidden">
            <Suspense fallback={<div className="py-12" />}>
              {children}
            </Suspense>
          </main>
        </div>
      </AdminAuthGate>
    </Suspense>
  );
}
