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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const locale = (params?.locale as string) || 'en';
  const dashboardHref = isAdmin ? `/${locale}/admin` : `/${locale}/account`;
  const dashboardLabel = isAdmin ? 'Admin Dashboard' : 'My Account';

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
          label: 'Screen Pack (Playtest)',
          href: `/${locale}/builder/mysteries/${activeMysteryId}/screen`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ),
        },
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

  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-3 border-b border-white/5 flex items-center justify-between">
        <div>
          <Link href={dashboardHref} onClick={onNavigate} className="block">
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
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close builder menu"
            className="md:hidden w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-black cursor-pointer"
          >
            ✕
          </button>
        )}
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
                    <Link href={item.href} onClick={onNavigate} className={getLinkClass(isItemActive(item))}>
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
                    <Link href={item.href} onClick={onNavigate} className={getLinkClass(isItemActive(item))}>
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
                    <Link href={item.href} onClick={onNavigate} className={getLinkClass(isItemActive(item))}>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-white/10 space-y-1 bg-black/20">
        <Link
          href={dashboardHref}
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-xs font-bold text-slate-300 hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{dashboardLabel}</span>
        </Link>

        <Link
          href={`/${locale}`}
          onClick={onNavigate}
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-brand-dark border-r border-white/10 text-white flex-shrink-0 flex-col h-full z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sticky Top Header Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-brand-dark text-white px-4 py-3 flex items-center justify-between border-b border-white/10 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={dashboardHref} className="shrink-0">
            <Image
              src="/logo-horizontal-white.png"
              alt="Back Pocket Mysteries Studio"
              width={132}
              height={26}
              className="h-6 w-auto object-contain"
            />
          </Link>
          <span className="px-2 py-0.5 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[9px] font-black uppercase tracking-widest truncate">
            Builder Studio
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open builder navigation menu"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-black uppercase tracking-wider shrink-0 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-brand-dark text-white flex flex-col h-full z-10 shadow-2xl border-r border-white/10">
            {renderSidebarContent(() => setMobileMenuOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
}
