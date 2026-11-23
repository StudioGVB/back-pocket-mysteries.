'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BrainstormWorksheetButton } from '@/components/builder/BrainstormWorksheetModal';

interface SubNavItem {
  label: string;
  href: string;
  exact?: boolean;
  matchPrefixes?: string[];
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  exact?: boolean;
  matchPrefixes?: string[];
  icon: React.ReactNode;
  children?: SubNavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname() || '';
  const localeMatch = pathname.match(/^\/(en|fr)(?=\/|$)/);
  const localePrefix = `/${localeMatch ? localeMatch[1] : 'en'}`;
  // Normalize locale prefix (e.g. /en/admin/... -> /admin/...)
  const cleanPath = pathname.replace(/^\/(en|fr)(?=\/admin)/, '');

  const isSubActive = (sub: SubNavItem) => {
    if (sub.exact) {
      return cleanPath === sub.href;
    }
    if (sub.matchPrefixes && sub.matchPrefixes.length > 0) {
      return sub.matchPrefixes.some(
        (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`)
      );
    }
    return cleanPath === sub.href || cleanPath.startsWith(`${sub.href}/`);
  };

  const isParentActive = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      return item.children.some((sub) => isSubActive(sub));
    }
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

  const studioItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/admin',
      exact: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="15" rx="1"/></svg>
      ),
    },
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

  const customerItems: NavItem[] = [
    {
      id: 'customers',
      label: 'Customers & Leads',
      href: '/admin/users',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ),
      children: [
        {
          label: 'Customers & Hosts',
          href: '/admin/users',
          matchPrefixes: ['/admin/users'],
        },
        {
          label: 'Newsletter & VIP Leads',
          href: '/admin/leads',
          matchPrefixes: ['/admin/leads'],
        },
      ],
    },
    {
      id: 'support',
      label: 'Support & Reviews',
      href: '/admin/tickets',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      ),
      children: [
        {
          label: 'Support & Tickets',
          href: '/admin/tickets',
          matchPrefixes: ['/admin/tickets'],
        },
        {
          label: 'Enquiries',
          href: '/admin/enquiries',
          matchPrefixes: ['/admin/enquiries'],
        },
        {
          label: 'Reviews',
          href: '/admin/reviews',
          matchPrefixes: ['/admin/reviews'],
        },
      ],
    },
  ];

  const marketingItems: NavItem[] = [
    {
      id: 'marketing',
      label: 'Marketing Hub',
      href: '/admin/social',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
      ),
      children: [
        {
          label: 'Campaign Calendar',
          href: '/admin/social',
          exact: true,
        },
        {
          label: 'Blog Posts',
          href: '/admin/blog',
          matchPrefixes: ['/admin/blog'],
        },
        {
          label: 'LinkedIn Queue',
          href: '/admin/social/linkedin',
          matchPrefixes: ['/admin/social/linkedin'],
        },
        {
          label: 'IG & FB Queue',
          href: '/admin/social/instagram-facebook',
          matchPrefixes: ['/admin/social/instagram-facebook'],
        },
        {
          label: 'EDM Campaigns',
          href: '/admin/edm',
          matchPrefixes: ['/admin/edm'],
        },
        {
          label: 'Promo & Discount Codes',
          href: '/admin/discounts',
          matchPrefixes: ['/admin/discounts'],
        },
      ],
    },
  ];

  const financeAndOpsItems: NavItem[] = [
    {
      id: 'orders',
      label: 'Orders & QA Inspector',
      href: '/admin/transactions',
      matchPrefixes: ['/admin/transactions'],
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
      ),
    },
    {
      id: 'finance',
      label: 'Finance & AI Spend',
      href: '/admin/balance-sheet',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      ),
      children: [
        {
          label: 'Balance Sheet',
          href: '/admin/balance-sheet',
          matchPrefixes: ['/admin/balance-sheet'],
        },
        {
          label: 'AI Costs',
          href: '/admin/costs',
          matchPrefixes: ['/admin/costs'],
        },
      ],
    },
    {
      id: 'analytics_settings',
      label: 'Analytics & Settings',
      href: '/admin/analytics',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      ),
      children: [
        {
          label: 'Analytics & SEO',
          href: '/admin/analytics',
          matchPrefixes: ['/admin/analytics'],
        },
        {
          label: 'Super Admins',
          href: '/admin/admins',
          matchPrefixes: ['/admin/admins'],
        },
        {
          label: 'Settings',
          href: '/admin/settings',
          matchPrefixes: ['/admin/settings'],
        },
      ],
    },
  ];

  const allCollapsibleItems = [
    ...customerItems,
    ...marketingItems,
    ...financeAndOpsItems,
  ].filter((item) => item.children && item.children.length > 0);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of allCollapsibleItems) {
      if (isParentActive(item)) {
        initial[item.id] = true;
      }
    }
    return initial;
  });

  // Automatically expand a side-menu group whenever the user navigates to one of its child routes
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of allCollapsibleItems) {
        if (isParentActive(item) && !next[item.id]) {
          next[item.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanPath]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sectionTitleClass =
    'px-3.5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-pink mb-1.5';

  const renderSection = (title: string, items: NavItem[], extra?: React.ReactNode) => (
    <div>
      <h3 className={sectionTitleClass}>{title}</h3>
      <ul className="space-y-1">
        {items.map((item) => {
          const hasChildren = Boolean(item.children && item.children.length > 0);
          const activeParent = isParentActive(item);
          const isOpen = Boolean(openGroups[item.id]);

          if (!hasChildren) {
            return (
              <li key={item.id}>
                <Link
                  href={`${localePrefix}${item.href}`}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all text-[13px] font-bold ${
                    activeParent
                      ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/25'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggleGroup(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl transition-all text-[13px] font-bold cursor-pointer ${
                  activeParent
                    ? 'bg-white/12 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 ${activeParent ? 'text-brand-pink' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-white' : ''
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isOpen && item.children && (
                <ul className="mt-1 ml-5 pl-3 border-l border-white/15 space-y-0.5">
                  {item.children.map((sub) => {
                    const subActive = isSubActive(sub);
                    return (
                      <li key={sub.href}>
                        <Link
                          href={`${localePrefix}${sub.href}`}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                            subActive
                              ? 'bg-brand-pink text-white shadow-sm shadow-brand-pink/25'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              subActive ? 'bg-white' : 'bg-slate-600'
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
        {extra}
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
        <div className="space-y-4 pb-4">
          {renderSection(
            'Studio & Mysteries',
            studioItems,
            <li>
              <BrainstormWorksheetButton variant="sidebar-item" />
            </li>
          )}
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
