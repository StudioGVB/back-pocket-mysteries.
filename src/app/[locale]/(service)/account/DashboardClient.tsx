'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GuestModal } from '@/components/account/GuestModal';
import { OnboardingWizard } from '@/components/account/OnboardingWizard';

const HOST_TIPS = [
  "Assign the loudest guest as the red herring character — they'll commit to the bit.",
  'Print character sheets double-sided. Save a tree, save a clue.',
  'Dim the lights and put on a jazz playlist before guests arrive. Atmosphere is everything.',
  'Tell guests to stay in character until the big reveal — even at dinner.',
  'The killer should be the last person anyone suspects. Cast accordingly.',
  "Have a 'game cheat sheet' ready for yourself — you'll thank yourself later.",
  "Take a group photo before the mystery starts. They'll love it afterwards.",
];


const FEATURED_THEMES = [
  { emoji: '🥂', name: '1920s Speakeasy', vibe: 'Jazz, glamour & bootleg secrets', gradient: 'from-amber-900 to-yellow-700' },
  { emoji: '🏚️', name: 'Haunted Manor', vibe: 'Gothic mystery & candlelight drama', gradient: 'from-slate-800 to-purple-900' },
  { emoji: '🚀', name: 'Space Station Alpha', vibe: 'Sci-fi intrigue among the stars', gradient: 'from-blue-900 to-cyan-800' },
];

interface Guest {
  id: string;
  name: string;
  gender?: string;
  avatar_url?: string;
  traits?: string[];
}

interface DashboardClientProps {
  user: { name: string; email: string; emailVerified: boolean };
  guestCount: number;
  orderCount: number;
  guests: Guest[];
  locale: string;
  onboardingCompleted?: boolean;
}

export default function DashboardClient({ user, guestCount, orderCount, guests, locale, onboardingCompleted = true }: DashboardClientProps) {
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tip = HOST_TIPS[new Date().getDate() % HOST_TIPS.length];

  const firstName = user.name?.split(' ')[0] || 'there';

  const accountHealth = (() => {
    let score = 0;
    if (user.name) score += 50;
    if (user.emailVerified) score += 50;
    return score;
  })();

  return (
    <div className="w-full space-y-8">
      {/* Account incomplete nudge */}
      {accountHealth < 100 && (
        <div className="rounded-2xl px-6 py-4 flex items-center justify-between gap-4" style={{ background: 'rgba(254,4,198,0.08)', border: '1px solid rgba(254,4,198,0.2)' }}>
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm font-bold text-slate-700">
              {!user.emailVerified && !user.name
                ? 'Add your name and verify your email to complete your profile.'
                : !user.emailVerified
                ? 'Verify your email to unlock purchases.'
                : 'Add your name to complete your profile.'}
            </p>
          </div>
          <Link href={`/${locale}/account/settings`} className="text-xs font-black px-4 py-2 rounded-xl whitespace-nowrap" style={{ background: '#fe04c6', color: '#fff' }}>
            Complete Profile
          </Link>
        </div>
      )}

      {/* Welcome Hero */}
      <div className="rounded-3xl p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e191c 0%, #2d1f2b 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #fe04c6 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#fe04c6' }}>{today}</p>
          <h1 className="text-3xl font-black text-white mb-2">Welcome back, {firstName} 👋</h1>
          <p className="font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Ready to plan your next mystery?</p>
          <Link
            href={`/${locale}/mysteries`}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95"
            style={{ background: '#fe04c6', color: '#fff' }}
          >
            Browse Mysteries
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Mysteries', value: orderCount, sub: 'purchased',
            href: `/${locale}/account/orders`,
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
          },
          {
            label: 'Guests Saved', value: guestCount, sub: 'in your roster',
            href: `/${locale}/account/guests`,
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          },
          {
            label: 'Next Event', value: '—', sub: 'no date set yet',
            href: null,
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
          },
          {
            label: 'Profile', value: `${accountHealth}%`, sub: accountHealth === 100 ? 'complete' : 'needs attention',
            href: `/${locale}/account/settings`,
            icon: accountHealth === 100
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{stat.icon}</span>
              {stat.href && (
                <Link href={stat.href} className="text-xs font-bold" style={{ color: '#fe04c6' }}>View →</Link>
              )}
            </div>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-xs text-slate-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href={`/${locale}/mysteries`} className="bg-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0" style={{ background: 'rgba(254,4,198,0.08)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <div>
              <p className="font-black text-sm text-slate-900">Browse Mysteries</p>
              <p className="text-xs text-slate-400">Find your next adventure</p>
            </div>
            <svg className="ml-auto text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <button onClick={() => setIsGuestModalOpen(true)} className="bg-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all group text-left w-full">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(254,4,198,0.08)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </div>
            <div>
              <p className="font-black text-sm text-slate-900">Add a Guest</p>
              <p className="text-xs text-slate-400">Build your roster</p>
            </div>
            <svg className="ml-auto text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <Link href={`/${locale}/account/orders`} className="bg-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(254,4,198,0.08)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <div>
              <p className="font-black text-sm text-slate-900">My Stories</p>
              <p className="text-xs text-slate-400">View your mysteries</p>
            </div>
            <svg className="ml-auto text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>

      {/* Refer a Friend */}
      <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6" style={{ background: 'linear-gradient(135deg, #fe04c6 0%, #b8008e 100%)', color: 'white' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🎁</span>
          </div>
          <div>
            <h3 className="font-black text-lg">Give 20%, Get 20%</h3>
            <p className="text-sm text-white/80 font-medium leading-snug mt-1">Share your unique link. When a friend buys a mystery, you both get a 20% off voucher!</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto bg-black/20 p-2 rounded-xl border border-white/10">
          <code className="text-xs font-bold px-3 py-1 opacity-90 truncate max-w-[200px] sm:max-w-[250px]">
            https://backpocketmysteries.com/refer?c={user.name?.replace(/\s+/g, '').toLowerCase() || 'guest'}
          </code>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`https://backpocketmysteries.com/refer?c=${user.name?.replace(/\s+/g, '').toLowerCase() || 'guest'}`);
              const btn = document.getElementById('copy-referral-btn');
              if (btn) {
                btn.innerText = 'Copied! ✅';
                setTimeout(() => btn.innerText = 'Copy', 2000);
              }
            }}
            id="copy-referral-btn"
            className="bg-white text-pink-600 text-xs font-black px-4 py-2 rounded-lg hover:scale-105 active:scale-95 transition-all flex-shrink-0"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Guests Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Your Guests</h2>
          <Link href={`/${locale}/account/guests`} className="text-xs font-black" style={{ color: '#fe04c6' }}>View All →</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {guests.map((guest) => (
            <div key={guest.id} className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 flex-shrink-0 w-28 shadow-sm">
              {guest.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={guest.avatar_url} alt={guest.name} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black text-white" style={{ background: '#fe04c6' }}>
                  {guest.name.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-xs font-black text-slate-900 text-center leading-tight">{guest.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{guest.gender || ''}</p>
            </div>
          ))}
          <button
            onClick={() => setIsGuestModalOpen(true)}
            className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 flex-shrink-0 w-28 hover:border-pink-300 transition-colors"
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(254,4,198,0.08)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <p className="text-xs font-black text-center" style={{ color: '#fe04c6' }}>Add Guest</p>
          </button>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h3 className="font-black text-lg text-white">Upgrade to Unlimited</h3>
            <p className="text-sm text-slate-300 font-medium leading-snug mt-1">Host as many mysteries as you want for one flat monthly price. Unlock exclusive premium stories!</p>
          </div>
        </div>
        <Link
          href={`/${locale}/pricing`}
          className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-black px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 relative z-10 text-center w-full sm:w-auto"
          style={{ boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' }}
        >
          View Plans
        </Link>
      </div>

      {/* Get Inspired + Host Tip — side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Get Inspired — takes 2 cols */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Get Inspired</h2>
          <div className="grid grid-cols-3 gap-3">
            {FEATURED_THEMES.map((theme) => (
              <Link
                key={theme.name}
                href={`/${locale}/mysteries`}
                className={`bg-gradient-to-br ${theme.gradient} rounded-2xl p-5 flex flex-col gap-2 hover:scale-105 transition-transform active:scale-95`}
              >
                <span className="text-3xl">{theme.emoji}</span>
                <p className="font-black text-white text-sm leading-tight">{theme.name}</p>
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{theme.vibe}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Host Tip — takes 1 col */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Hosting Tip</h2>
          <div className="rounded-2xl p-6 h-full flex flex-col gap-4" style={{ background: 'linear-gradient(135deg, #1e191c, #2d1f2b)', minHeight: '140px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm font-bold leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              &ldquo;{tip}&rdquo;
            </p>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#fe04c6' }}>
              Tip of the Day
            </p>
          </div>
        </div>
      </div>

      <GuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSave={() => setIsGuestModalOpen(false)}
      />
    </div>
  );
}
