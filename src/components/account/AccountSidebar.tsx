'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams } from 'next/navigation';
import { signOut } from '@/app/[locale]/(auth)/actions';
import { buildAvatarUrl } from '@/utils/avatar';

interface AccountSidebarProps {
  user?: {
    name: string;
    email: string;
    avatar_config?: any;
  };
}

export function AccountSidebar({ user }: AccountSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const links = [
    {
      name: 'Home',
      href: '/account',
      exact: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      ),
    },
    {
      name: 'Profile & Guests',
      href: '/account/profile',
      exact: false,
      id: 'tour-step-roster',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ),
    },
    {
      name: 'Browse Mysteries',
      href: '/mysteries',
      exact: false,
      id: 'tour-step-mysteries',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      ),
    },
    {
      name: 'My Mysteries (Stories)',
      href: '/account/orders',
      exact: false,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      ),
    },
  ];

  const isSupportActive = pathname.includes('/account/support');
  const isSettingsActive = pathname.includes('/account/settings');

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const avatarUrl = user?.avatar_config ? buildAvatarUrl(user.avatar_config, user.name) : undefined;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile drawer automatically when route changes
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const renderSidebarContents = (onNavigate?: () => void) => (
    <>
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <Link href="/" onClick={onNavigate} className="group flex items-center">
          <Image
            src="/logo-horizontal-white.png"
            alt="Back Pocket Mysteries"
            width={180}
            height={36}
            className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
          />
        </Link>
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation menu"
            className="md:hidden w-8 h-8 rounded-full bg-white/10 text-white/80 hover:text-white flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-grow px-3 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-black uppercase tracking-widest px-3 mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
          My Account
        </p>

        {links.map((link) => {
          const localizedHref = link.href.startsWith('/account') || link.href === '/mysteries'
            ? `/${locale}${link.href}`
            : link.href;

          const isMyMysteryRoute =
            pathname.includes('/account/orders') ||
            pathname.endsWith('/ready') ||
            pathname.includes('/ready/');

          const isActive = link.exact
            ? pathname === `/${locale}${link.href}` || pathname === `/${locale}/account`
            : link.href === '/account/orders'
            ? isMyMysteryRoute
            : link.href === '/mysteries'
            ? pathname.includes('/mysteries') && !isMyMysteryRoute
            : pathname.includes(link.href);

          return (
            <Link
              key={link.name}
              href={localizedHref}
              id={onNavigate ? undefined : (link as any).id}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 font-bold text-[13px] ${
                isActive
                  ? 'text-white'
                  : 'hover:text-white'
              }`}
              style={{
                background: isActive ? 'rgba(254,4,198,0.15)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
              }}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ background: '#fe04c6' }} />
              )}
              <span style={{ color: isActive ? '#fe04c6' : 'inherit' }}>{link.icon}</span>
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: user card + 3 icon bar (Support, Settings, Sign Out) */}
      <div className="p-4 mt-auto space-y-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href={`/${locale}/account/profile`}
          id={onNavigate ? undefined : 'tour-step-profile'}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/5 group"
        >
          {avatarUrl ? (
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-white flex items-center justify-center overflow-hidden shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt={user?.name || 'Avatar'} className="w-9 h-9 object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: '#fe04c6', color: '#fff' }}>
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white truncate">{user?.name || 'Guest'}</p>
            <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email || ''}</p>
          </div>
        </Link>

        {/* 3 Bottom Action Icons: Support, Settings, Sign Out (icon-only until hovered) */}
        <div className="flex items-center justify-between gap-1.5 px-1 pt-1">
          {/* Support */}
          <Link
            href={`/${locale}/account/support`}
            onClick={onNavigate}
            aria-label="Support"
            className="group relative flex-1 hover:flex-[1.8] flex items-center justify-center gap-0 hover:gap-2 h-10 px-2.5 rounded-xl transition-all duration-200"
            style={{
              background: isSupportActive ? 'rgba(254,4,198,0.16)' : 'rgba(255,255,255,0.04)',
              color: isSupportActive ? '#fe04c6' : 'rgba(255,255,255,0.55)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 group-hover:text-white transition-colors"
              style={{ color: isSupportActive ? '#fe04c6' : undefined }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[72px] group-hover:opacity-100 whitespace-nowrap text-xs font-bold text-white transition-all duration-200">
              Support
            </span>
          </Link>

          {/* Settings */}
          <Link
            href={`/${locale}/account/settings`}
            onClick={onNavigate}
            aria-label="Settings"
            className="group relative flex-1 hover:flex-[1.8] flex items-center justify-center gap-0 hover:gap-2 h-10 px-2.5 rounded-xl transition-all duration-200"
            style={{
              background: isSettingsActive ? 'rgba(254,4,198,0.16)' : 'rgba(255,255,255,0.04)',
              color: isSettingsActive ? '#fe04c6' : 'rgba(255,255,255,0.55)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 group-hover:text-white transition-colors"
              style={{ color: isSettingsActive ? '#fe04c6' : undefined }}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[72px] group-hover:opacity-100 whitespace-nowrap text-xs font-bold text-white transition-all duration-200">
              Settings
            </span>
          </Link>

          {/* Sign Out */}
          <form action={signOut} className="flex-1 hover:flex-[1.8] transition-all duration-200">
            <button
              type="submit"
              aria-label="Sign Out"
              className="group relative w-full flex items-center justify-center gap-0 hover:gap-2 h-10 px-2.5 rounded-xl transition-all duration-200 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.55)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[72px] group-hover:opacity-100 whitespace-nowrap text-xs font-bold transition-all duration-200">
                Sign Out
              </span>
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:block w-72 flex-shrink-0">
        <aside className="w-72 flex flex-col fixed h-full z-30" style={{ background: '#1e191c' }}>
          {renderSidebarContents()}
        </aside>
      </div>

      {/* Mobile Sticky Top Header Bar */}
      <div className="md:hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 flex justify-between items-center sticky top-0 z-40">
        <Link href={`/${locale}/account`} className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-pink inline-block" />
          <span>Back Pocket Mysteries</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/account/profile`}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
          >
            My Roster
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl bg-slate-900 text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[90] flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            className="relative w-72 max-w-[82vw] flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200"
            style={{ background: '#1e191c' }}
          >
            {renderSidebarContents(() => setMobileMenuOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
}
