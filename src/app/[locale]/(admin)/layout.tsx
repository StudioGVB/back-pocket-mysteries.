import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Toaster } from 'sonner';

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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Suspense fallback={<aside className="w-64 bg-brand-dark text-white min-h-screen fixed left-0 top-0" />}>
        <AdminSidebar />
      </Suspense>
      <Toaster richColors position="top-right" />

      {/* Main Content */}
      <main className="flex-grow ml-64 p-8">
        <Suspense fallback={<div className="py-12" />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
