'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams } from 'next/navigation';
import { signOut } from '@/app/[locale]/(auth)/actions';

interface AccountSidebarProps {
  user?: {
    name: string;
    email: string;
    avatar_config?: any;
  };
}

function buildAvatarUrl(config: any, name?: string) {
  if (!config) return null;
  const isBald = config.top === 'none';
  return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(name || config.seed)}${isBald ? '&topProbability=0' : `&top=${config.top}`}&hairColor=${config.hairColor}&hatColor=${config.hairColor}&facialHairColor=${config.hairColor}&skinColor=${config.skinColor}&eyes=default&eyebrows=default&mouth=smile&clothesColor=262e33&facialHairProbability=${config.facialHair ? '100' : '0'}${config.facialHair ? `&facialHair=${config.facialHair}` : ''}&backgroundColor=transparent`;
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
      name: 'My Profile',
      href: '/account/profile',
      exact: false,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ),
    },
    {
      name: 'Browse Mysteries',
      href: '/mysteries',
      exact: false,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      ),
    },
    {
      name: 'My Stories',
      href: '/account/orders',
      exact: false,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      ),
    },
    {
      name: 'My Guests',
      href: '/account/guests',
      exact: false,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ),
    },
    {
      name: 'Game Materials',
      href: '/account/downloads',
      exact: false,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      ),
    },
  ];

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const avatarUrl = user?.avatar_config ? buildAvatarUrl(user.avatar_config, user.name) : null;

  return (
    <aside className="w-72 flex flex-col fixed h-full z-30" style={{ background: '#1e191c' }}>
      {/* Logo */}
      <div className="px-8 pt-8 pb-6">
        <Link href="/" className="group flex items-center">
          <Image
            src="/logo-horizontal-white.png"
            alt="Back Pocket Mysteries"
            width={180}
            height={36}
            className="h-8 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-grow px-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-black uppercase tracking-widest px-3 mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          My Account
        </p>

        {links.map((link) => {
          const localizedHref = link.href.startsWith('/account') || link.href === '/mysteries'
            ? `/${locale}${link.href}`
            : link.href;

          const isActive = link.exact
            ? pathname === `/${locale}${link.href}` || pathname === `/${locale}/account`
            : pathname.includes(link.href);

          return (
            <Link
              key={link.name}
              href={localizedHref}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${
                isActive
                  ? 'text-white'
                  : 'hover:text-white'
              }`}
              style={{
                background: isActive ? 'rgba(254,4,198,0.15)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: '#fe04c6' }} />
              )}
              <span style={{ color: isActive ? '#fe04c6' : 'inherit' }}>{link.icon}</span>
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: user card + settings + sign out */}
      <div className="p-4 mt-auto space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* User card */}
        <Link href={`/${locale}/account/settings`} className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {avatarUrl ? (
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-white flex items-center justify-center overflow-hidden shadow-inner">
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

        {/* Settings */}
        {(() => {
          const isActive = pathname.includes('/account/settings');
          return (
            <Link
              href={`/${locale}/account/settings`}
              className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm"
              style={{
                background: isActive ? 'rgba(254,4,198,0.15)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: '#fe04c6' }} />}
              <span style={{ color: isActive ? '#fe04c6' : 'inherit' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </span>
              Settings
            </Link>
          );
        })()}

        {/* Sign out */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
