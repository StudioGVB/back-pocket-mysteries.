'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AnalyticsNav({ locale }: { locale: string }) {
  const pathname = usePathname() || '';

  const tabs = [
    {
      label: 'Traffic & SEO',
      href: `/${locale}/admin/analytics`,
      exact: true,
    },
    {
      label: 'Mysteries & Packages',
      href: `/${locale}/admin/analytics/packages`,
      exact: false,
    },
    {
      label: 'Gameplay & Parties',
      href: `/${locale}/admin/analytics/gameplay`,
      exact: false,
    },
    {
      label: 'Conversions & Promos',
      href: `/${locale}/admin/analytics/conversions`,
      exact: false,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href || pathname.endsWith('/admin/analytics')
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isActive
                ? 'bg-brand-dark text-white shadow-sm'
                : 'text-gray-500 hover:text-brand-dark hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
