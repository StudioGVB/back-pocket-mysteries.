import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
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

async function AdminAuthGuard({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
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
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-grow ml-64 p-8">
        <AdminHeader />
        <Suspense fallback={<div className="h-96 animate-pulse bg-white/50 rounded-3xl" />}>
          <AdminAuthGuard params={params}>{children}</AdminAuthGuard>
        </Suspense>
      </main>
    </div>
  );
}
