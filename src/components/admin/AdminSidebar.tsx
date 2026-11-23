'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  subtitle?: string;
  href: string;
  exact?: boolean;
  matchPrefixes?: string[];
  icon: React.ReactNode;
}

export function AdminSidebar() {
  const pathname = usePathname() || '';
  const localeMatch = pathname.match(/^\/(en|fr)(?=\/|$)/);
  const localePrefix = `/${localeMatch ? localeMatch[1] : 'en'}`;
  // Normalize locale prefix (e.g. /en/admin/... -> /admin/...)
  const cleanPath = pathname.replace(/^\/(en|fr)(?=\/admin)/, '');

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return cleanPath === item.href;
    }
    if (item.matchPrefixes && item.matchPrefixes.length > 0) {
      return item.matchPrefixes.some(
        (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`)
      );
    }
    return cleanPath === item.href || cleanPath.startsWith(`${item.href}/`);
  };

  const getLinkClass = (active: boolean) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[13px] font-bold ${
      active
        ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/25'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  const sectionTitleClass =
    'px-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-pink mb-1.5';

  const studioItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      exact: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="15" rx="1"/></svg>
      ),
    },
    {
      label: 'Mystery Bases',
      href: '/admin/mysteries',
      matchPrefixes: ['/admin/mysteries'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      ),
    },
  ];

  const customerItems: NavItem[] = [
    {
      label: 'Customers & VIP Leads',
      href: '/admin/users',
      matchPrefixes: ['/admin/users', '/admin/leads'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ),
    },
    {
      label: 'Support & Reviews',
      href: '/admin/tickets',
      matchPrefixes: ['/admin/tickets', '/admin/enquiries', '/admin/reviews'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      ),
    },
  ];

  const marketingItems: NavItem[] = [
    {
      label: 'Marketing Hub',
      subtitle: 'Calendar, Blogs, Socials & EDM',
      href: '/admin/social',
      matchPrefixes: [
        '/admin/social',
        '/admin/blog',
        '/admin/edm',
        '/admin/discounts',
      ],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
      ),
    },
  ];

  const financeAndOpsItems: NavItem[] = [
    {
      label: 'Orders & QA Inspector',
      href: '/admin/transactions',
      matchPrefixes: ['/admin/transactions'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
      ),
    },
    {
      label: 'Finance & AI Spend',
      href: '/admin/balance-sheet',
      matchPrefixes: ['/admin/balance-sheet', '/admin/costs'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      ),
    },
    {
      label: 'Analytics & Settings',
      href: '/admin/analytics',
      matchPrefixes: ['/admin/analytics', '/admin/admins', '/admin/settings'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      ),
    },
  ];

  const renderSection = (title: string, items: NavItem[]) => (
    <div>
      <h3 className={sectionTitleClass}>{title}</h3>
      <ul className="space-y-1">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link href={`${localePrefix}${item.href}`} className={getLinkClass(active)}>
                <span className="shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <div className="leading-tight truncate">{item.label}</div>
                  {item.subtitle && (
                    <div
                      className={`text-[10px] font-medium truncate mt-0.5 ${
                        active ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <aside className="w-64 bg-brand-dark text-white flex flex-col fixed h-full z-30 border-r border-white/10">
      <div className="px-6 pt-5 pb-4 border-b border-white/5">
        <Link href={`${localePrefix}/admin`}>
          <Image
            src="/logo-horizontal-white.png"
            alt="Back Pocket Mysteries Admin"
            width={160}
            height={32}
            className="h-7 w-auto object-contain"
          />
        </Link>
        <div className="mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
          Internal Admin
        </div>
      </div>

      <nav className="flex-grow px-3 py-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-5 pb-4">
          {renderSection('Studio & Mysteries', studioItems)}
          {renderSection('Customers & Support', customerItems)}
          {renderSection('Marketing Suite', marketingItems)}
          {renderSection('Finance & Operations', financeAndOpsItems)}
        </div>
      </nav>

      <div className="p-3 border-t border-white/10 bg-black/20">
        <Link
          href={`${localePrefix}/account/orders`}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Customer Portal
        </Link>
      </div>
    </aside>
  );
}
