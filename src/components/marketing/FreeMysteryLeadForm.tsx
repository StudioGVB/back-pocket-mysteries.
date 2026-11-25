'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getLaunchWaitlistStatusAction,
  submitEmailLead,
} from '@/app/actions/marketing';

const STATUS_CACHE_KEY = 'bpm_first50_status_cache';

type WaitlistStatus = {
  totalLeads: number;
  vipCap: number;
  spotsRemaining: number;
  isFirst50Open: boolean;
};

export default function FreeMysteryLeadForm({ locale }: { locale: string }) {
  const [status, setStatus] = useState<WaitlistStatus | null>(null);

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

  useEffect(() => {
    let mounted = true;
    if (typeof window !== 'undefined') {
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
        // ignore
      }
    }

    getLaunchWaitlistStatusAction()
      .then((res) => {
        if (!mounted) return;
        setStatus(res);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(res));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

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
        'seo_free_mystery_page'
      );
      if (res.success) {
        const currentTotal = status?.totalLeads ?? 0;
        const vipCap = status?.vipCap ?? 50;
        const rank = res.vipRank || currentTotal + 1;
        const qualifies = res.qualifiesForFreeMystery ?? rank <= vipCap;
        const remaining = res.spotsRemaining ?? Math.max(0, vipCap - rank);

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
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('bpm_first50_lead_joined', 'true');
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

  const isFirst50Open = status ? status.isFirst50Open : true;
  const progressPercent = status
    ? Math.min(
        100,
        Math.max(0, Math.round(((status.vipCap - status.spotsRemaining) / status.vipCap) * 100))
      )
    : 0;

  if (resultInfo) {
    return (
      <div className="bg-brand-dark text-white rounded-[2.5rem] p-8 sm:p-12 border border-white/10 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-brand-pink/20 border-2 border-brand-pink text-brand-pink flex items-center justify-center text-3xl font-black mx-auto">
          🎉
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest">
          {resultInfo.qualifiesForFreeMystery
            ? `Founding VIP Host • Spot #${resultInfo.vipRank} of 50`
            : `Launch Waitlist Member #${resultInfo.vipRank}`}
        </div>

        <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
          {resultInfo.alreadyRegistered
            ? "You're Already on the VIP List!"
            : resultInfo.qualifiesForFreeMystery
            ? 'Your Free Mystery Spot is Reserved!'
            : "You're on the Launch List!"}
        </h3>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
          {resultInfo.qualifiesForFreeMystery ? (
            <>
              Congratulations! You locked in <strong className="text-white">Spot #{resultInfo.vipRank} of 50</strong>. We&apos;ve added you to our Founding VIP list and will email your <strong className="text-brand-pink">100% Free 6-Player Custom Murder Mystery Game Pack code</strong> as soon as we launch.
            </>
          ) : (
            <>
              We&apos;ve saved your email to our VIP Launch List and will send your exclusive early-bird launch discount as soon as we go live!
            </>
          )}
        </p>

        <div className="pt-2 flex flex-wrap justify-center gap-4">
          <Link
            href={`/${locale}/themes`}
            className="px-8 py-4 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-full text-xs font-black uppercase tracking-widest transition-all"
          >
            Browse Mystery Themes →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-dark text-white rounded-[2.5rem] p-8 sm:p-10 border border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
      <div className="absolute -top-24 right-0 w-72 h-72 bg-brand-pink/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
            Limited Founding Host Giveaway
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
            Claim Your <span className="text-brand-pink italic">Free 6-Player</span> Custom Murder Mystery
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            Sign up below to lock in one of the first 50 VIP spots. No credit card required—we&apos;ll email your single-use 100%-off 6-player game pack code on launch day.
          </p>
        </div>

        {/* Live Spots Progress Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
            {status ? (
              <>
                <span className="text-brand-pink">
                  🔥 {status.spotsRemaining} of {status.vipCap} Free Spots Remaining
                </span>
                <span className="text-slate-400">
                  {status.vipCap - status.spotsRemaining}/{status.vipCap} Claimed
                </span>
              </>
            ) : (
              <>
                <span className="text-brand-pink">
                  🔥 Checking Live VIP Spots...
                </span>
                <span className="inline-block w-16 h-3.5 rounded-full bg-white/10 animate-pulse" />
              </>
            )}
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-pink to-fuchsia-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="seo-lead-name"
              className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-4"
            >
              First Name
            </label>
            <input
              id="seo-lead-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your First Name"
              required
              className="w-full px-6 py-4 rounded-full bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm font-semibold focus:outline-none focus:border-brand-pink transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="seo-lead-email"
              className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-4"
            >
              Email Address
            </label>
            <input
              id="seo-lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full px-6 py-4 rounded-full bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm font-semibold focus:outline-none focus:border-brand-pink transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-5 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-pink/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {submitting
              ? 'Reserving Your VIP Spot...'
              : isFirst50Open
              ? 'Reserve My Free Mystery Spot →'
              : 'Join the VIP Launch List →'}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center font-medium">
          🔒 100% Free • No Credit Card Needed • Unsubscribe Anytime
        </p>
      </div>
    </div>
  );
}
