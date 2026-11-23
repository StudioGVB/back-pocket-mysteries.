'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HubTab {
  label: string;
  href: string;
  exact?: boolean;
  matchPrefixes?: string[];
  badge?: string;
}

interface HubGroup {
  id: string;
  title: string;
  tabs: HubTab[];
}

const HUB_GROUPS: HubGroup[] = [
  {
    id: 'customers',
    title: 'Customers & VIP Leads',
    tabs: [
      {
        label: '👥 Customers & Hosts',
        href: '/admin/users',
        matchPrefixes: ['/admin/users'],
      },
      {
        label: '🎟️ VIP Waitlist & Newsletter Leads',
        href: '/admin/leads',
        matchPrefixes: ['/admin/leads'],
      },
    ],
  },
  {
    id: 'inbox',
    title: 'Support Inbox & Reviews',
    tabs: [
      {
        label: '💬 Support Tickets',
        href: '/admin/tickets',
        matchPrefixes: ['/admin/tickets'],
      },
      {
        label: '✉️ Custom Enquiries',
        href: '/admin/enquiries',
        matchPrefixes: ['/admin/enquiries'],
      },
      {
        label: '⭐ Customer Reviews',
        href: '/admin/reviews',
        matchPrefixes: ['/admin/reviews'],
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing Command Center',
    tabs: [
      {
        label: '📅 Campaign Calendar',
        href: '/admin/social',
        exact: true,
      },
      {
        label: '✍️ Blog Posts',
        href: '/admin/blog',
        matchPrefixes: ['/admin/blog'],
      },
      {
        label: '💼 LinkedIn Queue',
        href: '/admin/social/linkedin',
        matchPrefixes: ['/admin/social/linkedin'],
      },
      {
        label: '📸 IG & FB Queue',
        href: '/admin/social/instagram-facebook',
        matchPrefixes: ['/admin/social/instagram-facebook'],
      },
      {
        label: '📧 EDM Campaigns',
        href: '/admin/edm',
        matchPrefixes: ['/admin/edm'],
      },
      {
        label: '🏷️ Promo & Discount Codes',
        href: '/admin/discounts',
        matchPrefixes: ['/admin/discounts'],
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & AI Spend',
    tabs: [
      {
        label: '📊 Balance Sheet & Tax Ledger',
        href: '/admin/balance-sheet',
        matchPrefixes: ['/admin/balance-sheet'],
      },
      {
        label: '🤖 AI Usage & API Costs',
        href: '/admin/costs',
        matchPrefixes: ['/admin/costs'],
      },
    ],
  },
  {
    id: 'analytics_system',
    title: 'Analytics & System Settings',
    tabs: [
      {
        label: '📈 Traffic & SEO Analytics',
        href: '/admin/analytics',
        matchPrefixes: ['/admin/analytics'],
      },
      {
        label: '🛡️ Super Admins',
        href: '/admin/admins',
        matchPrefixes: ['/admin/admins'],
      },
      {
        label: '⚙️ Platform Settings',
        href: '/admin/settings',
        matchPrefixes: ['/admin/settings'],
      },
    ],
  },
];

export function AdminHubTabs() {
  const pathname = usePathname() || '';
  const localeMatch = pathname.match(/^\/(en|fr)(?=\/|$)/);
  const localePrefix = `/${localeMatch ? localeMatch[1] : 'en'}`;
  const cleanPath = pathname.replace(/^\/(en|fr)(?=\/admin)/, '');

  const isTabActive = (tab: HubTab) => {
    if (tab.exact) {
      return cleanPath === tab.href;
    }
    if (tab.matchPrefixes && tab.matchPrefixes.length > 0) {
      return tab.matchPrefixes.some(
        (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`)
      );
    }
    return cleanPath === tab.href || cleanPath.startsWith(`${tab.href}/`);
  };

  const activeGroup = HUB_GROUPS.find((group) =>
    group.tabs.some((tab) => isTabActive(tab))
  );

  if (!activeGroup) {
    return null;
  }

  return (
    <div className="mb-8 bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-xs flex flex-wrap items-center gap-1.5">
      {activeGroup.tabs.map((tab) => {
        const active = isTabActive(tab);
        return (
          <Link
            key={tab.href}
            href={`${localePrefix}${tab.href}`}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              active
                ? 'bg-brand-dark text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-brand-dark'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
