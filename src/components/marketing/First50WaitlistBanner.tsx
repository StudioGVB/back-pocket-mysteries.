'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Gift, Sparkles, ArrowRight, CheckCircle2, X } from 'lucide-react';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import {
  getLaunchWaitlistStatusAction,
  submitEmailLead,
} from '@/app/actions/marketing';

const POPUP_DISMISSED_KEY = 'bpm_first50_popup_dismissed';
const LEAD_JOINED_KEY = 'bpm_first50_lead_joined';
const STATUS_CACHE_KEY = 'bpm_first50_status_cache';

type WaitlistStatus = {
  totalLeads: number;
  vipCap: number;
  spotsRemaining: number;
  isFirst50Open: boolean;
};

const DEFAULT_STATUS: WaitlistStatus = {
  totalLeads: 2,
  vipCap: 50,
  spotsRemaining: 48,
  isFirst50Open: true,
};

export default function First50WaitlistBanner({
  initialStatus = null,
}: {
  initialStatus?: WaitlistStatus | null;
} = {}) {
  const [status, setStatus] = useState<WaitlistStatus>(initialStatus || DEFAULT_STATUS);

  // Two-phase modal state for buttery-smooth 60fps entrance & exit animations
  const [isModalMounted, setIsModalMounted] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resultInfo, setResultInfo] = useState<{
    vipRank: number;
    qualifiesForFreeMystery: boolean;
    spotsRemaining: number;
    alreadyRegistered?: boolean;
  } | null>(null);

  const openModalSmooth = useCallback(() => {
    setIsModalMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsModalVisible(true);
      });
    });
  }, []);

  const closeModalSmooth = useCallback(() => {
    setIsModalVisible(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(POPUP_DISMISSED_KEY, 'true');
    }
    setTimeout(() => {
      setIsModalMounted(false);
    }, 240);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isModalMounted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModalSmooth();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalMounted, closeModalSmooth]);

  useEffect(() => {
    let mounted = true;
    const joined =
      typeof window !== 'undefined' &&
      window.localStorage.getItem(LEAD_JOINED_KEY) === 'true';
    const dismissed =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem(POPUP_DISMISSED_KEY) === 'true';

    if (joined) {
      setHasJoined(true);
    }

    // Hydrate last known real count immediately from localStorage so repeat page views have zero delay
    if (typeof window !== 'undefined' && !initialStatus) {
      try {
        const cachedRaw = window.localStorage.getItem(STATUS_CACHE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as WaitlistStatus;
          if (
            parsed &&
            typeof parsed.spotsRemaining === 'number' &&
            typeof parsed.vipCap === 'number'
          ) {
            setStatus(parsed);
          }
        }
      } catch {
        // ignore invalid cache
      }
    }

    getLaunchWaitlistStatusAction()
      .then((res) => {
        if (!mounted || !res) return;
        setStatus(res);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(res));
          } catch {
            // ignore storage quota errors
          }
        }
      })
      .catch(() => {
        // ignore
      });

    // Auto-open the First 50 VIP modal only AFTER lights are ON, and with a 10s delay on mobile
    if (!joined && !dismissed) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let wasLightsOff =
        typeof document !== 'undefined' &&
        document.documentElement.dataset.lightsOff === 'true';

      const scheduleOpen = (delayMs: number) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (!mounted) return;
          if (document.documentElement.dataset.lightsOff === 'true') return;
          openModalSmooth();
        }, delayMs);
      };

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      if (isMobile) {
        // Mobile starts with lights ON — wait 10 seconds so visitors enjoy the hero first
        scheduleOpen(10000);
      } else if (!wasLightsOff) {
        // Desktop non-homepage (where lights start ON) — wait 6 seconds
        scheduleOpen(6000);
      }

      const handleLightsChange = (e: Event) => {
        const customEv = e as CustomEvent<{ lightsOff: boolean }>;
        const nowOff = Boolean(customEv.detail?.lightsOff);
        if (nowOff) {
          wasLightsOff = true;
          if (timer) clearTimeout(timer);
        } else if (wasLightsOff) {
          // Lights just transitioned from OFF -> ON on desktop — open modal 4s later
          wasLightsOff = false;
          scheduleOpen(4000);
        }
      };

      window.addEventListener('bpm:lights-change', handleLightsChange);

      return () => {
        mounted = false;
        if (timer) clearTimeout(timer);
        window.removeEventListener('bpm:lights-change', handleLightsChange);
      };
    }

    return () => {
      mounted = false;
    };
  }, [initialStatus, openModalSmooth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await submitEmailLead(
        email.trim(),
        fullName.trim() || undefined,
        'first_50_vip_modal'
      );
      if (res.success) {
        const currentTotal = status?.totalLeads ?? 2;
        const vipCap = status?.vipCap ?? 50;
        const rank = res.vipRank || currentTotal + 1;
        const qualifies = res.qualifiesForFreeMystery ?? rank <= vipCap;
        const remaining =
          res.spotsRemaining ?? Math.max(0, vipCap - rank);

        setResultInfo({
          vipRank: rank,
          qualifiesForFreeMystery: qualifies,
          spotsRemaining: remaining,
          alreadyRegistered: res.alreadyRegistered,
        });
        const nextStatus: WaitlistStatus = {
          vipCap,
          totalLeads: Math.max(currentTotal, rank),
          spotsRemaining: remaining,
          isFirst50Open: remaining > 0,
        };
        setStatus(nextStatus);
        setHasJoined(true);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LEAD_JOINED_KEY, 'true');
          try {
            window.localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(nextStatus));
          } catch {
            // ignore
          }
        }
      } else {
        setError(res.error || 'Could not join waitlist. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFirst50Open = status.isFirst50Open;
  const claimedCount = Math.max(1, status.vipCap - status.spotsRemaining);
  const progressPercent = Math.min(
    100,
    Math.max(6, Math.round((claimedCount / status.vipCap) * 100))
  );

  return (
    <>
      {/* Top Announcement Bar across Marketing Site (Compact 1-Line on Mobile) */}
      <div className="bg-brand-dark text-white border-b border-brand-pink/30 relative z-[60]">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between sm:justify-center gap-2 sm:gap-4 text-left sm:text-center">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Giveaway
            </span>

            {/* Compact Mobile Copy (<640px) */}
            <p className="sm:hidden text-[11px] font-bold text-slate-200 whitespace-nowrap">
              {isFirst50Open ? (
                <>
                  First 50 get a <strong className="text-brand-pink font-black">FREE Mystery</strong>
                </>
              ) : (
                <>Join the <strong className="text-white font-black">VIP Launch List</strong></>
              )}
            </p>

            {/* Full Desktop Copy (>=640px) */}
            <p className="hidden sm:block text-xs font-bold text-slate-200">
              {isFirst50Open ? (
                <>
                  First <strong className="text-white font-black">50 email sign-ups</strong> before launch get a{' '}
                  <Link
                    href="/en/free-murder-mystery-game"
                    className="text-brand-pink hover:text-white font-black underline decoration-brand-pink/50 transition-colors"
                  >
                    FREE Custom Murder Mystery
                  </Link>
                  <span className="text-slate-400 font-semibold ml-1">
                    ({status.spotsRemaining} of {status.vipCap} spots left!)
                  </span>
                </>
              ) : (
                <>
                  Join the <strong className="text-white font-black">VIP Launch Waitlist</strong> for early access &amp; exclusive launch perks!
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openModalSmooth}
              className="px-2.5 sm:px-3.5 py-1 rounded-full bg-white text-brand-dark hover:bg-brand-pink hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer shrink-0"
            >
              {hasJoined ? (
                'VIP Status →'
              ) : (
                <>
                  <span className="sm:hidden">Claim →</span>
                  <span className="hidden sm:inline">Claim Free Spot →</span>
                </>
              )}
            </button>
            <Link
              href="/en/free-murder-mystery-game"
              className="hidden md:inline-flex px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              How It Works
            </Link>
          </div>
        </div>
      </div>

      {/* Sleek 60fps Spring Pop-Up Modal */}
      {isModalMounted && (
        <div
          onClick={closeModalSmooth}
          className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${
            isModalVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: 'rgba(12, 7, 15, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:
                'radial-gradient(120% 75% at 50% 0%, rgba(254, 4, 198, 0.18) 0%, rgba(20, 13, 24, 0) 70%), #140d18',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform, opacity',
            }}
            className={`relative w-full max-w-[420px] rounded-3xl text-white border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.65)] overflow-hidden transition-all duration-300 ${
              isModalVisible
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-5 scale-[0.96]'
            }`}
          >
            {/* Top Neon Pink Accent Line */}
            <div className="h-1 w-full bg-gradient-to-r from-brand-pink via-fuchsia-400 to-brand-pink" />

            {/* Clean Top Bar inside Card: Badge + Close Button */}
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                <Gift className="w-3 h-3" />
                Founding Host Offer
              </span>

              <button
                type="button"
                onClick={closeModalSmooth}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6 pt-2">
              {resultInfo ? (
                <div className="text-center space-y-4 py-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-pink/20 border border-brand-pink text-brand-pink flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" />
                    {resultInfo.qualifiesForFreeMystery
                      ? `VIP Spot #${resultInfo.vipRank} of 50 Locked`
                      : `Waitlist Member #${resultInfo.vipRank}`}
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">
                    {resultInfo.alreadyRegistered
                      ? "You're on the VIP List!"
                      : resultInfo.qualifiesForFreeMystery
                      ? 'Free Mystery Locked In!'
                      : "You're on the Launch List!"}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {resultInfo.qualifiesForFreeMystery ? (
                      <>
                        You secured <strong className="text-white">Spot #{resultInfo.vipRank} of 50</strong>. We&apos;ll email your{' '}
                        <strong className="text-brand-pink">100% Free 6-Player Custom Murder Mystery code</strong> on launch day.
                      </>
                    ) : (
                      <>
                        We&apos;ve added you to the VIP Launch List for our biggest early-bird launch discount!
                      </>
                    )}
                  </p>

                  <div className="pt-1 flex flex-col gap-2">
                    <Link
                      href="/en/free-murder-mystery-game"
                      onClick={closeModalSmooth}
                      className="w-full py-3.5 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      See What&apos;s Included
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={closeModalSmooth}
                      className="w-full py-2.5 text-slate-400 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Continue Browsing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Headline & Concise Hook */}
                  <div className="space-y-1.5">
                    <h2 className="text-2xl sm:text-[28px] font-black uppercase tracking-tight leading-[1.08]">
                      First 50 Sign-Ups Get a{' '}
                      <span className="text-brand-pink italic">Free 6-Player Mystery</span>
                    </h2>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      Join our founding host list and get a{' '}
                      <strong className="text-white font-bold">100% Free 6-Player Custom Murder Mystery Pack</strong>{' '}
                      (Basic Tier • valued at <PriceDisplay tier="basic" locale="en" />) when we launch.
                    </p>
                  </div>

                  {/* Compact Live Spots Pill Bar */}
                  <div className="bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                      <span className="text-brand-pink flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />
                        {status.spotsRemaining} of {status.vipCap} Free Spots Left
                      </span>
                      <span className="text-slate-400">
                        {claimedCount}/{status.vipCap} Claimed
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-pink to-fuchsia-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold text-center">
                      {error}
                    </div>
                  )}

                  {/* Sleek Form Inputs */}
                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="First name"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/15 text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-brand-pink focus:bg-white/[0.1] transition-colors"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/15 text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-brand-pink focus:bg-white/[0.1] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-xl text-xs font-black uppercase tracking-[0.16em] shadow-lg shadow-brand-pink/25 transition-all duration-200 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {submitting
                        ? 'Locking In Your Spot...'
                        : isFirst50Open
                        ? 'Claim My Free Mystery'
                        : 'Join the VIP Waitlist'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-0.5 text-[11px]">
                    <Link
                      href="/en/free-murder-mystery-game"
                      onClick={closeModalSmooth}
                      className="font-bold text-slate-400 hover:text-brand-pink transition-colors underline decoration-white/20"
                    >
                      What&apos;s included?
                    </Link>
                    <button
                      type="button"
                      onClick={closeModalSmooth}
                      className="font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

