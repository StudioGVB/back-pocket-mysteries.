'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GuestModal } from '@/components/account/GuestModal';
import { OnboardingWizard } from '@/components/account/OnboardingWizard';
import { getEffectiveCoverUrl } from '@/utils/moodboard';

const HOST_TIPS = [
  "Assign the loudest guest as the red herring character — they'll commit to the bit.",
  'Print character sheets double-sided. Save a tree, save a clue.',
  'Dim the lights and put on a jazz playlist before guests arrive. Atmosphere is everything.',
  'Tell guests to stay in character until the big reveal — even at dinner.',
  'The killer should be the last person anyone suspects. Cast accordingly.',
  "Have a 'game cheat sheet' ready for yourself — you'll thank yourself later.",
  "Take a group photo before the mystery starts. They'll love it afterwards.",
];


const FALLBACK_POPULAR_THEMES = [
  {
    id: 'love-on-the-rocks',
    title: 'Love On The Rocks',
    theme: 'Reality TV Reunion',
    description: 'Glitzy penthouse drama, secret alliances, and a poisoned champagne toast while the cameras roll.',
    image_url: null,
    min_players: 4,
    max_players: 12,
    complexity: 'medium',
    spice_level: 'Spicy',
    emoji: '🥂',
    gradient: 'from-pink-600 to-rose-900',
  },
  {
    id: 'the-gala-heist',
    title: 'The Gala Heist',
    theme: 'High-Society Black Tie',
    description: 'Priceless diamonds, black-tie suspects, and a locked-room mystery inside the museum vault.',
    image_url: null,
    min_players: 8,
    max_players: 14,
    complexity: 'hard',
    spice_level: 'Mild',
    emoji: '💎',
    gradient: 'from-amber-800 to-slate-900',
  },
  {
    id: 'the-inheritance',
    title: 'The Inheritance',
    theme: '1920s Manor Mystery',
    description: 'The patriarch is dead, the storm has washed out the bridge, and the inheritance is up for grabs.',
    image_url: null,
    min_players: 6,
    max_players: 10,
    complexity: 'easy',
    spice_level: 'Mild',
    emoji: '🕯️',
    gradient: 'from-purple-900 to-slate-900',
  },
];

interface Guest {
  id: string;
  name: string;
  gender?: string;
  avatar_url?: string;
  traits?: string[];
}

interface PopularMystery {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  image_url: string | null;
  min_players: number;
  max_players: number;
  complexity?: string | null;
  spice_level?: string | null;
  emoji?: string;
  gradient?: string;
}

interface DashboardClientProps {
  user: { name: string; email: string; emailVerified: boolean };
  guestCount: number;
  orderCount: number;
  guests: Guest[];
  popularMysteries?: PopularMystery[];
  locale: string;
  onboardingCompleted?: boolean;
  giftPassState?: {
    isSubscribed: boolean;
    currentMonthKey: string;
    currentMonthPass: {
      monthKey: string;
      code: string;
      recipientEmail?: string | null;
      recipientName?: string | null;
      personalMessage?: string | null;
      createdAt: string;
    } | null;
  };
}

export default function DashboardClient({
  user,
  guestCount,
  orderCount,
  guests,
  popularMysteries = [],
  locale,
  onboardingCompleted = true,
  giftPassState,
}: DashboardClientProps) {
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [giftPass, setGiftPass] = useState(giftPassState?.currentMonthPass || null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState('');
  const [giftRecipientEmail, setGiftRecipientEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [isClaimingGift, setIsClaimingGift] = useState(false);
  const [giftStatusMsg, setGiftStatusMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tip = HOST_TIPS[new Date().getDate() % HOST_TIPS.length];

  const firstName = user.name?.split(' ')[0] || 'there';

  const accountHealth = (() => {
    let score = 0;
    if (user.name) score += 50;
    if (user.emailVerified) score += 50;
    return score;
  })();

  const displayedThemes: PopularMystery[] =
    popularMysteries.length > 0 ? popularMysteries : FALLBACK_POPULAR_THEMES;

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

      {/* Welcome Header directly on page */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: '#fe04c6' }}>{today}</p>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Welcome back, {firstName} 👋</h1>
        <p className="text-slate-500 font-medium mt-1">Pick one of our most popular themes below and build it for your group — ready in ~30 minutes.</p>
      </div>

      {/* Most Popular Selling Themes OR Mysteries Coming Soon Banner */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
              {popularMysteries.length > 0 ? 'Most Popular Themes' : 'Mystery Releases'}
            </h2>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
              style={{ background: 'rgba(254,4,198,0.1)', color: '#fe04c6' }}
            >
              {popularMysteries.length > 0 ? '🔥 Best Sellers' : '✨ Coming Soon'}
            </span>
          </div>
          {popularMysteries.length > 0 && (
            <Link href={`/${locale}/mysteries`} className="text-xs font-black" style={{ color: '#fe04c6' }}>
              Browse All →
            </Link>
          )}
        </div>

        {popularMysteries.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-900 via-brand-dark to-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-brand-pink/30 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2 max-w-xl relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pink/15 border border-brand-pink/35 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
                Dropping Shortly
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                Mysteries Coming Soon — Check Back Shortly!
              </h3>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                We&apos;re putting the final touches on our inaugural murder mystery packages. Check back shortly to pick your theme and cast your friends — or add your guests below right now so you&apos;re ready to play!
              </p>
            </div>
            <button
              onClick={() => setIsGuestModalOpen(true)}
              className="px-7 py-4 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shrink-0 relative z-10 cursor-pointer"
            >
              + Pre-Add Guests Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {displayedThemes.map((item, idx) => {
              const playersLabel =
                item.min_players === item.max_players
                  ? `${item.min_players} Players`
                  : `${item.min_players}–${item.max_players} Players`;
              const complexityLabel = (item.complexity || 'medium').toUpperCase();
              const spiceLabel = (item.spice_level || 'Mild').toUpperCase();
              const gameTimeLabel =
                item.complexity === 'easy'
                  ? '1–2 Hours'
                  : item.complexity === 'hard'
                  ? '3–4 Hours'
                  : '2–3 Hours';
              const targetHref = `/${locale}/mysteries/${item.id}`;
              const fallbackGrad =
                item.gradient ||
                ['from-pink-600 to-rose-900', 'from-amber-800 to-slate-900', 'from-purple-900 to-slate-900'][idx % 3];
              const coverUrl = getEffectiveCoverUrl(item.image_url, item.theme, item.title);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border border-slate-100 group"
                >
                  <Link
                    href={targetHref}
                    className={`relative h-36 bg-gradient-to-br ${fallbackGrad} flex items-center justify-center overflow-hidden block`}
                  >
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
                        {item.emoji || '🕵️‍♀️'}
                      </span>
                    )}
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white">
                      {item.theme || 'Mystery'}
                    </div>
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-50/95 text-[9px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-200">
                      ~30 Min Build
                    </div>
                  </Link>

                  <div className="p-6 flex flex-col flex-grow justify-between gap-4">
                    <div>
                      <Link href={targetHref}>
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-brand-pink transition-colors leading-snug">
                          {item.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5 line-clamp-2">
                        {item.description || 'Customize this mystery around your real-life guest list.'}
                      </p>
                    </div>

                    {/* 2x2 Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Players</p>
                        <p className="text-[11px] font-black text-slate-900">{playersLabel}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Difficulty</p>
                        <p className="text-[11px] font-black text-slate-900">{complexityLabel}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Vibe / Spice</p>
                        <p className="text-[11px] font-black text-slate-900">{spiceLabel}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Game Time</p>
                        <p className="text-[11px] font-black text-slate-900">{gameTimeLabel}</p>
                      </div>
                    </div>

                    <Link
                      href={targetHref}
                      className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest text-white text-center transition-all hover:opacity-95 active:scale-95 flex items-center justify-center gap-2"
                      style={{ background: '#fe04c6' }}
                    >
                      Build This Mystery
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            href: `/${locale}/account/profile`,
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
          <Link href={`/${locale}/account/profile`} className="text-xs font-black" style={{ color: '#fe04c6' }}>View All →</Link>
        </div>
        <div className="flex flex-wrap gap-3 pb-2">
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

      {/* Subscriber Monthly Gift Pass OR Upgrade CTA */}
      {giftPassState?.isSubscribed ? (
        <div
          className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e191c 0%, #2d1f2b 100%)',
            border: '1px solid rgba(254,4,198,0.28)',
          }}
        >
          <div className="flex items-start sm:items-center gap-4 relative z-10">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(254,4,198,0.16)', border: '1px solid rgba(254,4,198,0.35)' }}
            >
              <span className="text-2xl">🎁</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg text-white">Your Monthly Gift Pass</h3>
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{
                    background: giftPass ? 'rgba(16,185,129,0.2)' : 'rgba(254,4,198,0.2)',
                    color: giftPass ? '#34d399' : '#fe04c6',
                  }}
                >
                  {giftPass ? `Claimed (${giftPass.monthKey})` : '1 Free Mystery Available This Month'}
                </span>
              </div>
              {giftPass ? (
                <p className="text-sm text-slate-300 font-medium leading-snug mt-1">
                  100%-Off Gift Code:{' '}
                  <span className="font-mono font-black text-white bg-white/10 px-2.5 py-0.5 rounded-lg">
                    {giftPass.code}
                  </span>
                  {giftPass.recipientEmail ? ` • Sent to ${giftPass.recipientEmail}` : ' • Share with any friend'}
                </p>
              ) : (
                <p className="text-sm text-slate-300 font-medium leading-snug mt-1">
                  As an Unlimited member, you get 1 free mystery gift pass every month to send any mystery (up to 16 players) to a friend!
                </p>
              )}
              {giftStatusMsg && (
                <p className="text-xs font-bold text-emerald-400 mt-1.5">{giftStatusMsg}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto relative z-10">
            {giftPass ? (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(giftPass.code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all w-full sm:w-auto cursor-pointer"
                style={{ background: '#fe04c6' }}
              >
                {copiedCode ? 'Copied Code! ✓' : `Copy Gift Code (${giftPass.code})`}
              </button>
            ) : (
              <button
                onClick={() => setIsGiftModalOpen(true)}
                className="text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 text-center w-full sm:w-auto cursor-pointer"
                style={{ background: '#fe04c6', boxShadow: '0 4px 14px 0 rgba(254, 4, 198, 0.35)' }}
              >
                🎁 Send Monthly Gift Pass
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
              <span className="text-2xl">🎁</span>
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Upgrade to Unlimited + Get 1 Free Monthly Gift Pass</h3>
              <p className="text-sm text-slate-300 font-medium leading-snug mt-1">
                Host unlimited mysteries every month for up to 16 players — plus get 1 Free Monthly Gift Pass to send any mystery to a friend!
              </p>
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
      )}

      {/* Host Tip */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Hosting Tip</h2>
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'linear-gradient(135deg, #1e191c, #2d1f2b)' }}>
          <div className="flex items-start sm:items-center gap-4">
            <svg className="flex-shrink-0 mt-0.5 sm:mt-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm font-bold leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              &ldquo;{tip}&rdquo;
            </p>
          </div>
          <p className="text-xs font-black uppercase tracking-widest whitespace-nowrap" style={{ color: '#fe04c6' }}>
            Tip of the Day
          </p>
        </div>
      </div>

      <GuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSave={() => setIsGuestModalOpen(false)}
      />

      {isGiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎁</span>
                <h3 className="text-lg font-black text-slate-900">Send Your Monthly Gift Pass</h3>
              </div>
              <button
                onClick={() => setIsGiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Generate your 100%-off Monthly Gift Pass (good for 1 full mystery up to 16 players). Enter a friend&apos;s email to send it directly to their inbox, or leave email blank to copy the code yourself.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Friend&apos;s Name (Optional)
                </label>
                <input
                  type="text"
                  value={giftRecipientName}
                  onChange={(e) => setGiftRecipientName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Friend&apos;s Email (Optional — emails them the gift code)
                </label>
                <input
                  type="email"
                  value={giftRecipientEmail}
                  onChange={(e) => setGiftRecipientEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Personal Note (Optional)
                </label>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  rows={2}
                  placeholder="Can't wait to play your murder mystery party!"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-900"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsGiftModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isClaimingGift}
                onClick={async () => {
                  setIsClaimingGift(true);
                  try {
                    const { claimSubscriberMonthlyGiftPassAction } = await import(
                      '@/app/actions/subscriber-perks'
                    );
                    const res = await claimSubscriberMonthlyGiftPassAction({
                      recipientName: giftRecipientName,
                      recipientEmail: giftRecipientEmail,
                      personalMessage: giftMessage,
                    });
                    if (res.success && res.pass) {
                      setGiftPass(res.pass);
                      setGiftStatusMsg(
                        res.emailSent
                          ? `Gift Pass (${res.pass.code}) emailed to ${res.pass.recipientEmail}!`
                          : `Gift Pass (${res.pass.code}) created! Share it with your friend.`
                      );
                      setIsGiftModalOpen(false);
                    } else if (res.error) {
                      setGiftStatusMsg(res.error);
                    }
                  } finally {
                    setIsClaimingGift(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white cursor-pointer disabled:opacity-50"
                style={{ background: '#fe04c6' }}
              >
                {isClaimingGift
                  ? 'Creating Gift Pass...'
                  : giftRecipientEmail.trim()
                  ? 'Send Gift Pass Email'
                  : 'Generate Gift Pass Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
