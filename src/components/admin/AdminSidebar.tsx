'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
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

  const isItemActive = (item: NavItem) => {
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

  const dashboardItem: NavItem = {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    exact: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="15" rx="1"/></svg>
    ),
  };

  const basesItems: NavItem[] = [
    {
      id: 'mysteries',
      label: 'Mystery Bases',
      href: '/admin/mysteries',
      matchPrefixes: ['/admin/mysteries'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      ),
    },
  ];

  const ordersItems: NavItem[] = [
    {
      id: 'transactions',
      label: 'Transactions',
      href: '/admin/transactions',
      matchPrefixes: ['/admin/transactions'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      ),
    },
    {
      id: 'discounts',
      label: 'Promo & Discount',
      href: '/admin/discounts',
      matchPrefixes: ['/admin/discounts'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      ),
    },
  ];

  const customerItems: NavItem[] = [
    {
      id: 'customers',
      label: 'Customers',
      href: '/admin/users',
      matchPrefixes: ['/admin/users'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ),
    },
    {
      id: 'leads',
      label: 'Leads',
      href: '/admin/leads',
      matchPrefixes: ['/admin/leads'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
      ),
    },
    {
      id: 'enquiries',
      label: 'Enquiries',
      href: '/admin/enquiries',
      matchPrefixes: ['/admin/enquiries'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      ),
    },
    {
      id: 'reviews',
      label: 'Reviews',
      href: '/admin/reviews',
      matchPrefixes: ['/admin/reviews'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      ),
    },
  ];

  const marketingItems: NavItem[] = [
    {
      id: 'calendar',
      label: 'Campaign Calendar',
      href: '/admin/social',
      exact: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
      ),
    },
    {
      id: 'blog',
      label: 'Blog Posts',
      href: '/admin/blog',
      matchPrefixes: ['/admin/blog'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
      ),
    },
    {
      id: 'linkedin',
      label: 'LinkedIn Queue',
      href: '/admin/social/linkedin',
      matchPrefixes: ['/admin/social/linkedin'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
      ),
    },
    {
      id: 'ig_fb',
      label: 'IG & FB Queue',
      href: '/admin/social/instagram-facebook',
      matchPrefixes: ['/admin/social/instagram-facebook'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
      ),
    },
    {
      id: 'edm',
      label: 'EDM Campaigns',
      href: '/admin/edm',
      matchPrefixes: ['/admin/edm'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      ),
    },
  ];

  const analyticsItems: NavItem[] = [
    {
      id: 'analytics_seo',
      label: 'Analytics & SEO',
      href: '/admin/analytics',
      matchPrefixes: ['/admin/analytics'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      ),
    },
    {
      id: 'ai_balance_sheet',
      label: 'AI / Balance Sheet',
      href: '/admin/balance-sheet',
      matchPrefixes: ['/admin/balance-sheet', '/admin/costs'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
      ),
    },
  ];

  const isSettingsActive =
    cleanPath === '/admin/settings' ||
    cleanPath.startsWith('/admin/settings/') ||
    cleanPath === '/admin/admins' ||
    cleanPath.startsWith('/admin/admins/');

  const isTicketsActive =
    cleanPath === '/admin/tickets' || cleanPath.startsWith('/admin/tickets/');

  const sectionTitleClass =
    'px-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-pink mb-1.5';

  const renderNavItem = (item: NavItem) => {
    const active = isItemActive(item);
    return (
      <li key={item.id}>
        <Link
          href={`${localePrefix}${item.href}`}
          className={`flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all text-[13px] font-bold ${
            active
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/25'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </Link>
      </li>
    );
  };

  const renderSection = (title: string, items: NavItem[]) => (
    <div>
      <h3 className={sectionTitleClass}>{title}</h3>
      <ul className="space-y-1">{items.map(renderNavItem)}</ul>
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
        <div className="space-y-4 pb-4">
          {/* Standalone Dashboard at Top (No Section Header) */}
          <ul className="space-y-1">{renderNavItem(dashboardItem)}</ul>

          {renderSection('Bases', basesItems)}
          {renderSection('Orders', ordersItems)}
          {renderSection('Customers', customerItems)}
          {renderSection('Marketing Suite', marketingItems)}
          {renderSection('Analytics', analyticsItems)}
        </div>
      </nav>

      {/* Bottom 3 Side-by-Side Icon Buttons: Settings (incl. Super Admins), Guest Portal, Ticketing */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`${localePrefix}/admin/settings`}
            title="Settings & Super Admins"
            aria-label="Settings & Super Admins"
            className={`flex items-center justify-center h-10 rounded-xl border transition-all ${
              isSettingsActive
                ? 'bg-brand-pink border-brand-pink text-white shadow-md shadow-brand-pink/25'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          <Link
            href={`${localePrefix}/account/orders`}
            title="Guest Portal"
            aria-label="Guest Portal"
            className="flex items-center justify-center h-10 rounded-xl border bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>

          <Link
            href={`${localePrefix}/admin/tickets`}
            title="Support & Ticketing"
            aria-label="Support & Ticketing"
            className={`flex items-center justify-center h-10 rounded-xl border transition-all ${
              isTicketsActive
                ? 'bg-brand-pink border-brand-pink text-white shadow-md shadow-brand-pink/25'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
}

