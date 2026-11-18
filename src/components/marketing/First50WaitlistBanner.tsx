'use client';

import React, { useState, useEffect } from 'react';
import {
  getLaunchWaitlistStatusAction,
  submitEmailLead,
} from '@/app/actions/marketing';

const POPUP_DISMISSED_KEY = 'bpm_first50_popup_dismissed';
const LEAD_JOINED_KEY = 'bpm_first50_lead_joined';

export default function First50WaitlistBanner() {
  const [status, setStatus] = useState<{
    totalLeads: number;
    vipCap: number;
    spotsRemaining: number;
    isFirst50Open: boolean;
  }>({
    totalLeads: 0,
    vipCap: 50,
    spotsRemaining: 50,
    isFirst50Open: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
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

    getLaunchWaitlistStatusAction()
      .then((res) => {
        if (!mounted) return;
        setStatus(res);
      })
      .catch(() => {
        // ignore
      });

    // Auto-open the First 50 VIP modal after 3 seconds for new visitors who haven't joined or dismissed
    if (!joined && !dismissed) {
      const timer = setTimeout(() => {
        if (mounted) setIsModalOpen(true);
      }, 3000);
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(POPUP_DISMISSED_KEY, 'true');
    }
  };

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
        const rank = res.vipRank || status.totalLeads + 1;
        const qualifies = res.qualifiesForFreeMystery ?? rank <= 50;
        const remaining =
          res.spotsRemaining ?? Math.max(0, 50 - rank);

        setResultInfo({
          vipRank: rank,
          qualifiesForFreeMystery: qualifies,
          spotsRemaining: remaining,
          alreadyRegistered: res.alreadyRegistered,
        });
        setStatus((prev) => ({
          ...prev,
          totalLeads: Math.max(prev.totalLeads, rank),
          spotsRemaining: remaining,
          isFirst50Open: remaining > 0,
        }));
        setHasJoined(true);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LEAD_JOINED_KEY, 'true');
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

  const progressPercent = Math.min(
    100,
    Math.max(8, Math.round(((status.vipCap - status.spotsRemaining) / status.vipCap) * 100))
  );

  return (
    <>
      {/* Top Announcement Bar across Marketing Site */}
      <div className="bg-brand-dark text-white border-b border-brand-pink/30 relative z-[60]">
        <div className="container mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            Launch Giveaway
          </span>

          <p className="text-xs font-bold text-slate-200">
            {status.isFirst50Open ? (
              <>
                First <strong className="text-white font-black">50 email sign-ups</strong> before launch get a{' '}
                <span className="text-brand-pink font-black underline decoration-brand-pink/50">
                  FREE Custom Murder Mystery
                </span>{' '}
                <span className="text-slate-400 font-semibold">
                  ({status.spotsRemaining} of {status.vipCap} spots left!)
                </span>
              </>
            ) : (
              <>
                Join the <strong className="text-white font-black">VIP Launch Waitlist</strong> for early access & exclusive launch perks!
              </>
            )}
          </p>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1 rounded-full bg-white text-brand-dark hover:bg-brand-pink hover:text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shrink-0"
          >
            {hasJoined ? 'View VIP Status →' : 'Claim Free Spot →'}
          </button>
        </div>
      </div>

      {/* Pop-Up Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-[2.5rem] bg-brand-dark text-white border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Ambient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-pink/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              aria-label="Close"
              className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="relative z-10 p-8 sm:p-10">
              {resultInfo ? (
                <div className="text-center space-y-5 py-4">
                  <div className="w-16 h-16 rounded-full bg-brand-pink/20 border-2 border-brand-pink text-brand-pink flex items-center justify-center text-3xl font-black mx-auto">
                    🎉
                  </div>

                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                    {resultInfo.qualifiesForFreeMystery
                      ? `VIP Founding Host • Spot #${resultInfo.vipRank} of 50`
                      : `Waitlist Member #${resultInfo.vipRank}`}
                  </div>

                  <h3 className="text-3xl font-black uppercase tracking-tight">
                    {resultInfo.alreadyRegistered
                      ? "You're Already on the VIP List!"
                      : resultInfo.qualifiesForFreeMystery
                      ? 'Your Free Mystery Spot is Locked In!'
                      : "You're on the Launch List!"}
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                    {resultInfo.qualifiesForFreeMystery ? (
                      <>
                        You secured <strong className="text-white">Spot #{resultInfo.vipRank} of 50</strong>! We&apos;ve saved your email to our Founding VIP list and will email your <strong className="text-brand-pink">100% Free Custom Murder Mystery code</strong> the moment we launch.
                      </>
                    ) : (
                      <>
                        The first 50 free mystery spots were claimed fast, but we&apos;ve added you to the VIP Launch List for our biggest early-bird launch discount!
                      </>
                    )}
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-8 py-4 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-full text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Explore Our Themes →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                      🎁 Pre-Launch Founding Host Offer
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none pt-1">
                      First 50 Sign-Ups Get a <br />
                      <span className="text-brand-pink italic">Free Mystery</span>
                    </h2>
                    <p className="text-sm text-slate-300 font-medium leading-relaxed pt-1">
                      Be one of the first 50 hosts on our launch list and we&apos;ll send you a <strong className="text-white">100% FREE Custom Murder Mystery Game Pack</strong> when we launch!
                    </p>
                  </div>

                  {/* Live Spots Counter Bar */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                      <span className="text-brand-pink">
                        🔥 {status.spotsRemaining} of {status.vipCap} Free Spots Left
                      </span>
                      <span className="text-slate-400">
                        {status.vipCap - status.spotsRemaining}/{status.vipCap} Claimed
                      </span>
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

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your First Name"
                      required
                      className="w-full px-5 py-4 rounded-full bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm font-semibold focus:outline-none focus:border-brand-pink transition-colors"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email Address"
                      required
                      className="w-full px-5 py-4 rounded-full bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm font-semibold focus:outline-none focus:border-brand-pink transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4.5 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-pink/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
                    >
                      {submitting
                        ? 'Locking In Your Spot...'
                        : status.isFirst50Open
                        ? 'Claim My Free Mystery Spot →'
                        : 'Join the VIP Waitlist →'}
                    </button>
                  </form>

                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    No spam, ever. We&apos;ll email your free mystery code on launch day.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
