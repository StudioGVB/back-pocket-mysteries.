"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface BuilderSidebarProps {
  children?: React.ReactNode;
  isAdmin?: boolean;
}

export function BuilderSidebar({ children, isAdmin = false }: BuilderSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const dashboardHref = isAdmin ? `/${locale}/admin` : `/${locale}/account`;
  const dashboardLabel = isAdmin ? 'Admin Dashboard' : 'My Account';

  const mysteryIdMatch = pathname.match(/\/builder\/mysteries\/([^\/]+)/);
  const activeMysteryId =
    mysteryIdMatch && mysteryIdMatch[1] !== 'create' ? mysteryIdMatch[1] : null;

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    router.push(`/${locale}/login`);
  };

  const sectionTitleClass =
    'px-3 text-[9px] font-black uppercase tracking-[0.2em] text-brand-pink mb-1.5';

  const getLinkClass = (isActive: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px] font-bold ${
      isActive
        ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  const storyAndCastItems = activeMysteryId
    ? [
        {
          label: 'Overview & Theme',
          href: `/${locale}/builder/mysteries/${activeMysteryId}`,
          exact: true,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="15" rx="1" />
            </svg>
          ),
        },
        {
          label: 'Characters & Cast',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/characters`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
        {
          label: 'Relationships',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/relationships`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
            </svg>
          ),
        },
        {
          label: 'Motives & Secrets',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/motives`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ),
        },
      ]
    : [];

  const plotAndEvidenceItems = activeMysteryId
    ? [
        {
          label: 'Plot Timeline',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/timeline`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ),
        },
        {
          label: 'Subplots',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/subplots`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" x2="6" y1="3" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          ),
        },
        {
          label: 'Clues & Evidence',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/clues`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          ),
        },
      ]
    : [];

  const digitalLaunchItems = activeMysteryId
    ? [
        {
          label: 'Live Playroom & Host',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/compile`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
              <path d="M12 18h.01" />
            </svg>
          ),
        },
        {
          label: 'Publishing & Sales',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/status`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          ),
        },
      ]
    : [];

  const studioItems = [
    {
      label: 'All Mysteries',
      href: `/${locale}/builder/mysteries`,
      exact: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      ),
    },
    {
      label: 'Support & Tickets',
      href: activeMysteryId
        ? `/${locale}/builder/support?mysteryId=${activeMysteryId}`
        : `/${locale}/builder/support`,
      exact: false,
      matchPrefix: `/${locale}/builder/support`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  const isItemActive = (item: { href: string; exact?: boolean; matchPrefix?: string }) => {
    const cleanHref = item.href.split('?')[0];
    if (item.exact) {
      return pathname === cleanHref;
    }
    if (item.matchPrefix) {
      return pathname.startsWith(item.matchPrefix);
    }
    return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
  };

  return (
    <aside className="w-64 bg-brand-dark border-r border-white/10 text-white flex-shrink-0 flex flex-col h-full z-30">
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-3 border-b border-white/5">
        <Link href={dashboardHref} className="block">
          <Image
            src="/logo-horizontal-white.png"
            alt="Back Pocket Mysteries Studio"
            width={155}
            height={30}
            className="h-7 w-auto object-contain"
          />
        </Link>
        <div className="mt-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
          Mystery Builder Studio
        </div>
      </div>

      {/* Compact Mystery Switcher */}
      {children && <div className="px-4 pt-3.5 pb-2">{children}</div>}

      {/* Unified Sidebar Navigation */}
      <nav className="flex-grow px-3 py-3 space-y-5 overflow-y-auto custom-scrollbar">
        {activeMysteryId && (
          <>
            {/* 1. Story & Cast */}
            <div>
              <h3 className={sectionTitleClass}>Story &amp; Cast</h3>
              <ul className="space-y-0.5">
                {storyAndCastItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={getLinkClass(isItemActive(item))}>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Plot & Evidence */}
            <div>
              <h3 className={sectionTitleClass}>Plot &amp; Evidence</h3>
              <ul className="space-y-0.5">
                {plotAndEvidenceItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={getLinkClass(isItemActive(item))}>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Digital Play & Launch */}
            <div>
              <h3 className={sectionTitleClass}>Digital Play &amp; Launch</h3>
              <ul className="space-y-0.5">
                {digitalLaunchItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={getLinkClass(isItemActive(item))}>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* 4. Studio */}
        <div>
          <h3 className={sectionTitleClass}>Studio</h3>
          <ul className="space-y-0.5">
            {studioItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={getLinkClass(isItemActive(item))}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-white/10 space-y-1 bg-black/20">
        <Link
          href={dashboardHref}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-xs font-bold text-slate-300 hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{dashboardLabel}</span>
        </Link>

        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-xs font-bold text-slate-400 hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span>Public Website</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-colors text-xs font-bold cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
