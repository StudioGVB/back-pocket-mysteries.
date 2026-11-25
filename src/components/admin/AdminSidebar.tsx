'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  AdminNotificationSection,
  getAdminSidebarNotificationCountsAction,
  markAdminSectionSeenAction,
} from '@/app/[locale]/(admin)/admin/admin-data';

interface NavItem {
  id: string;
  label: string;
  href: string;
  exact?: boolean;
  matchPrefixes?: string[];
  icon: React.ReactNode;
  badgeCount?: number;
  onSelectSection?: () => void;
}

const SECTION_STORAGE_KEYS: Record<
  AdminNotificationSection,
  { cookie: string; storage: string }
> = {
  dashboard: {
    cookie: 'admin_dashboard_last_view',
    storage: 'bpm_admin_dashboard_last_view',
  },
  transactions: {
    cookie: 'admin_transactions_last_seen',
    storage: 'bpm_admin_transactions_last_seen',
  },
  customers: {
    cookie: 'admin_users_last_seen',
    storage: 'bpm_admin_users_last_seen',
  },
  leads: {
    cookie: 'admin_leads_last_seen',
    storage: 'bpm_admin_leads_last_seen',
  },
  enquiries: {
    cookie: 'admin_enquiries_last_seen',
    storage: 'bpm_admin_enquiries_last_seen',
  },
  reviews: {
    cookie: 'admin_reviews_last_seen',
    storage: 'bpm_admin_reviews_last_seen',
  },
  tickets: {
    cookie: 'admin_tickets_last_seen',
    storage: 'bpm_admin_tickets_last_seen',
  },
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeSeenTimestamp(section: AdminNotificationSection, iso: string) {
  if (typeof window === 'undefined') return;
  const { cookie, storage } = SECTION_STORAGE_KEYS[section];
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${cookie}=${encodeURIComponent(iso)};expires=${expires};path=/`;
  try {
    window.localStorage.setItem(storage, iso);
  } catch {}
}

function readSeenTimestamp(section: AdminNotificationSection): string | null {
  if (typeof window === 'undefined') return null;
  const { cookie, storage } = SECTION_STORAGE_KEYS[section];
  const fromCookie = readCookie(cookie);
  let fromStorage: string | null = null;
  try {
    fromStorage = window.localStorage.getItem(storage);
  } catch {}
  if (fromCookie && fromStorage) {
    const cookieMs = Date.parse(fromCookie) || 0;
    const storageMs = Date.parse(fromStorage) || 0;
    return cookieMs >= storageMs ? fromCookie : fromStorage;
  }
  return fromCookie || fromStorage || null;
}

export function AdminSidebar() {
  const pathname = usePathname() || '';
  const localeMatch = pathname.match(/^\/(en|fr)(?=\/|$)/);
  const localePrefix = `/${localeMatch ? localeMatch[1] : 'en'}`;
  // Normalize locale prefix (e.g. /en/admin/... -> /admin/...)
  const cleanPath = pathname.replace(/^\/(en|fr)(?=\/admin)/, '');
  const cleanPathRef = React.useRef(cleanPath);
  cleanPathRef.current = cleanPath;

  const [counts, setCounts] = useState({
    transactions: 0,
    customers: 0,
    leads: 0,
    enquiries: 0,
    reviews: 0,
    tickets: 0,
    dashboard: 0,
  });

  const markSectionSeen = useCallback((section: AdminNotificationSection) => {
    const nowIso = new Date().toISOString();
    setCounts((prev) => ({ ...prev, [section]: 0 }));
    writeSeenTimestamp(section, nowIso);
    // Defer the background server action slightly so it never contends with Next.js route transitions
    setTimeout(() => {
      markAdminSectionSeenAction(section, nowIso)
        .then((res) => {
          if (res?.timestamp) {
            writeSeenTimestamp(section, res.timestamp);
          }
        })
        .catch(() => {});
    }, 600);
  }, []);

  const refreshCounts = useCallback(async () => {
    const res = await getAdminSidebarNotificationCountsAction({
      dashboard: readSeenTimestamp('dashboard'),
      transactions: readSeenTimestamp('transactions'),
      customers: readSeenTimestamp('customers'),
      leads: readSeenTimestamp('leads'),
      enquiries: readSeenTimestamp('enquiries'),
      reviews: readSeenTimestamp('reviews'),
      tickets: readSeenTimestamp('tickets'),
    });

    const activeCleanPath = cleanPathRef.current;
    const isAt = (prefix: string) =>
      activeCleanPath === prefix || activeCleanPath.startsWith(`${prefix}/`);

    setCounts({
      transactions: isAt('/admin/transactions') ? 0 : res.unseenTransactionsCount,
      customers: isAt('/admin/users') ? 0 : res.unseenCustomersCount,
      leads: isAt('/admin/leads') ? 0 : res.unseenLeadsCount,
      enquiries: isAt('/admin/enquiries') ? 0 : res.unseenEnquiriesCount,
      reviews: isAt('/admin/reviews') ? 0 : res.unseenReviewsCount,
      tickets: isAt('/admin/tickets') ? 0 : res.unseenTicketsCount,
      dashboard: activeCleanPath === '/admin' ? 0 : res.unseenDashboardCount,
    });
  }, []);

  // Auto-clear section badge locally as soon as the admin lands on that page (without re-fetching all counts on every click)
  useEffect(() => {
    const isAt = (prefix: string) =>
      cleanPath === prefix || cleanPath.startsWith(`${prefix}/`);

    if (isAt('/admin/transactions')) markSectionSeen('transactions');
    else if (isAt('/admin/users')) markSectionSeen('customers');
    else if (isAt('/admin/leads')) markSectionSeen('leads');
    else if (isAt('/admin/enquiries')) markSectionSeen('enquiries');
    else if (isAt('/admin/reviews')) markSectionSeen('reviews');
    else if (isAt('/admin/tickets')) markSectionSeen('tickets');
  }, [cleanPath, markSectionSeen]);

  // Fetch initial counts after initial page paint + poll every 45s
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      refreshCounts();
    }, 350);

    const handleCustomSeen = (e: Event) => {
      const ev = e as CustomEvent<{ section?: AdminNotificationSection }>;
      const sec = ev.detail?.section;
      if (sec) {
        setCounts((prev) => ({ ...prev, [sec]: 0 }));
      }
    };
    window.addEventListener('bpm:admin-section-seen', handleCustomSeen);
    const interval = setInterval(refreshCounts, 45000);
    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('bpm:admin-section-seen', handleCustomSeen);
      clearInterval(interval);
    };
  }, [refreshCounts]);

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
    badgeCount: counts.dashboard,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="15" rx="1"/></svg>
    ),
  };

  const basesItems: NavItem[] = [
    {
      id: 'mysteries',
      label: 'Mystery Bases',
      href: '/admin/mysteries',
      exact: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      ),
    },
    {
      id: 'base-architect',
      label: 'OG Base Builder',
      href: '/admin/mysteries/architect',
      matchPrefixes: ['/admin/mysteries/architect'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3m6.36-.36-2.12 2.12M21 12h-3m.36 6.36-2.12-2.12M12 21v-3m-6.36.36 2.12-2.12M3 12h3m-.36-6.36 2.12 2.12"/><circle cx="12" cy="12" r="3"/></svg>
      ),
    },
  ];

  const ordersItems: NavItem[] = [
    {
      id: 'transactions',
      label: 'Transactions',
      href: '/admin/transactions',
      matchPrefixes: ['/admin/transactions'],
      badgeCount: counts.transactions,
      onSelectSection: () => markSectionSeen('transactions'),
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
      badgeCount: counts.customers,
      onSelectSection: () => markSectionSeen('customers'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ),
    },
    {
      id: 'leads',
      label: 'Leads',
      href: '/admin/leads',
      matchPrefixes: ['/admin/leads'],
      badgeCount: counts.leads,
      onSelectSection: () => markSectionSeen('leads'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
      ),
    },
    {
      id: 'enquiries',
      label: 'Enquiries',
      href: '/admin/enquiries',
      matchPrefixes: ['/admin/enquiries'],
      badgeCount: counts.enquiries,
      onSelectSection: () => markSectionSeen('enquiries'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      ),
    },
    {
      id: 'reviews',
      label: 'Reviews',
      href: '/admin/reviews',
      matchPrefixes: ['/admin/reviews'],
      badgeCount: counts.reviews,
      onSelectSection: () => markSectionSeen('reviews'),
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Automatically close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close on Escape key & lock background scroll when mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

  const allNavItems: NavItem[] = [
    dashboardItem,
    ...basesItems,
    ...ordersItems,
    ...customerItems,
    ...marketingItems,
    ...analyticsItems,
  ];
  const activeNavItem = allNavItems.find((item) => isItemActive(item));
  const activeMobileLabel = isSettingsActive
    ? 'Settings'
    : isTicketsActive
    ? 'Support Tickets'
    : activeNavItem?.label || 'Admin';

  const totalUnseenBadges =
    counts.transactions +
    counts.customers +
    counts.leads +
    counts.enquiries +
    counts.reviews +
    counts.tickets;

  const renderNavItem = (item: NavItem, onNavigate?: () => void) => {
    const active = isItemActive(item);
    const hasBadge = !active && typeof item.badgeCount === 'number' && item.badgeCount > 0;
    return (
      <li key={item.id}>
        <Link
          href={`${localePrefix}${item.href}`}
          onClick={() => {
            item.onSelectSection?.();
            onNavigate?.();
          }}
          className={`flex items-center justify-between gap-2 px-3.5 py-2.5 md:py-2 rounded-xl transition-all text-[13px] font-bold ${
            active
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/25'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </span>
          {hasBadge && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm shadow-brand-pink/40">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              +{item.badgeCount}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const renderSection = (title: string, items: NavItem[], onNavigate?: () => void) => (
    <div>
      <h3 className={sectionTitleClass}>{title}</h3>
      <ul className="space-y-1">{items.map((item) => renderNavItem(item, onNavigate))}</ul>
    </div>
  );

  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      <div className="px-5 pt-4 pb-3.5 border-b border-white/10 flex items-center justify-between gap-2">
        <div>
          <Link href={`${localePrefix}/admin`} onClick={onNavigate}>
            <Image
              src="/logo-horizontal-white.png"
              alt="Back Pocket Mysteries Admin"
              width={150}
              height={30}
              className="h-6 sm:h-7 w-auto object-contain"
            />
          </Link>
          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
            Internal Admin
          </div>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close admin menu"
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-brand-pink text-white text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0"
          >
            <span>✕</span>
            <span>Close</span>
          </button>
        )}
      </div>

      <nav className="flex-grow px-3 py-3.5 overflow-y-auto custom-scrollbar">
        <div className="space-y-4 pb-4">
          {/* Standalone Dashboard at Top (No Section Header) */}
          <ul className="space-y-1">{renderNavItem(dashboardItem, onNavigate)}</ul>

          {renderSection('Bases', basesItems, onNavigate)}
          {renderSection('Orders', ordersItems, onNavigate)}
          {renderSection('Customers', customerItems, onNavigate)}
          {renderSection('Marketing Suite', marketingItems, onNavigate)}
          {renderSection('Analytics', analyticsItems, onNavigate)}
        </div>
      </nav>

      {/* Bottom 3 Side-by-Side Icon Buttons: Settings (incl. Super Admins), Guest Portal, Ticketing */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`${localePrefix}/admin/settings`}
            onClick={onNavigate}
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
            onClick={onNavigate}
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
            onClick={() => {
              markSectionSeen('tickets');
              onNavigate?.();
            }}
            title="Support & Ticketing"
            aria-label="Support & Ticketing"
            className={`relative flex items-center justify-center h-10 rounded-xl border transition-all ${
              isTicketsActive
                ? 'bg-brand-pink border-brand-pink text-white shadow-md shadow-brand-pink/25'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {!isTicketsActive && counts.tickets > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-pink text-white text-[9px] font-black flex items-center justify-center shadow-sm shadow-brand-pink/50">
                +{counts.tickets}
              </span>
            )}
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 bg-brand-dark text-white flex-col fixed inset-y-0 left-0 z-30 border-r border-white/10">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sticky Top Header Bar */}
      <div className="md:hidden sticky top-0 z-40 h-14 bg-brand-dark text-white px-3.5 flex items-center justify-between border-b border-white/10 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`${localePrefix}/admin`} onClick={closeMobileMenu} className="shrink-0">
            <Image
              src="/logo-horizontal-white.png"
              alt="Back Pocket Mysteries Admin"
              width={124}
              height={24}
              className="h-5 w-auto object-contain"
            />
          </Link>
          <span className="px-2 py-0.5 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[9px] font-black uppercase tracking-widest truncate max-w-[130px]">
            {activeMobileLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close admin navigation menu' : 'Open admin navigation menu'}
          aria-expanded={mobileMenuOpen}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-black uppercase tracking-wider shrink-0 cursor-pointer"
        >
          {mobileMenuOpen ? (
            <>
              <span>✕</span>
              <span>Close</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span>Menu</span>
              {totalUnseenBadges > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black leading-none shadow-sm">
                  +{totalUnseenBadges}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={closeMobileMenu}
            aria-label="Close menu backdrop"
          />
          <aside className="relative w-72 max-w-[82vw] bg-brand-dark text-white flex flex-col h-full z-10 shadow-2xl border-r border-white/10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(closeMobileMenu)}
          </aside>
        </div>
      )}
    </>
  );
}
