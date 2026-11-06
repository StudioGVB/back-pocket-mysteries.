'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMysteryGenerationStatusAction,
  finishMysteryGenerationNowAction,
} from '@/app/actions/customer-mystery';

interface MysteryGeneratingScreenProps {
  locale: string;
  mysteryId: string;
  slug: string;
  mysteryTitle: string;
  pin: string;
  customerEmail?: string | null;
  initialStatus?: 'generating' | 'ready';
  initialRemainingSeconds?: number;
  initialProgress?: number;
  initialStepLabel?: string;
  castCount?: number;
  onGenerationReady?: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function MysteryGeneratingScreen({
  locale,
  mysteryId,
  slug,
  mysteryTitle,
  pin,
  customerEmail,
  initialStatus = 'generating',
  initialRemainingSeconds = 20 * 60,
  initialProgress = 18,
  initialStepLabel = 'Locking cast & hydrating character dossiers with guest names...',
  castCount = 6,
  onGenerationReady,
}: MysteryGeneratingScreenProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'generating' | 'ready'>(initialStatus);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialRemainingSeconds);
  const [progress, setProgress] = useState<number>(initialProgress);
  const [stepLabel, setStepLabel] = useState<string>(initialStepLabel);
  const [emailAddress, setEmailAddress] = useState<string | null>(customerEmail || null);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [emailSentToast, setEmailSentToast] = useState(false);

  // Local 1-second countdown tick for smooth UI
  useEffect(() => {
    if (status === 'ready') return;
    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Poll server-side background job every 5 seconds
  useEffect(() => {
    if (status === 'ready') return;
    let active = true;

    const poll = async () => {
      try {
        const res = await getMysteryGenerationStatusAction({
          mysteryId,
          slug,
          mysteryTitle,
          locale,
        });
        if (!active) return;
        if (res.customerEmail) setEmailAddress(res.customerEmail);
        if (res.status === 'ready') {
          setStatus('ready');
          setRemainingSeconds(0);
          setProgress(100);
          setStepLabel('Package complete & ready in My Mysteries (Stories)!');
          setEmailSentToast(true);
          if (onGenerationReady) onGenerationReady();
        } else if (res.status === 'generating') {
          setRemainingSeconds(res.remainingSeconds);
          setProgress(res.progress);
          setStepLabel(res.stepLabel);
        }
      } catch {
        // ignore transient network errors
      }
    };

    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [status, mysteryId, slug, mysteryTitle, locale, onGenerationReady]);

  const handleFinishNow = async () => {
    setIsFastForwarding(true);
    try {
      await finishMysteryGenerationNowAction({
        mysteryId,
        slug,
        mysteryTitle,
        pin,
        locale,
      });
      setStatus('ready');
      setRemainingSeconds(0);
      setProgress(100);
      setStepLabel('Package complete & ready in My Mysteries (Stories)!');
      setEmailSentToast(true);
      if (onGenerationReady) {
        onGenerationReady();
      }
      router.refresh();
    } catch {
      // ignore
    } finally {
      setIsFastForwarding(false);
    }
  };

  const stages = [
    {
      title: '1. Cast Locked & Guest Profiles Hydrated',
      desc: `All ${castCount} guest names, pronouns, accents, and traits locked into the story.`,
      done: true,
      active: false,
    },
    {
      title: '2. Standard Character Reference Portraits',
      desc: 'Generating consistent character reference photos from each guest’s character description.',
      done: status === 'ready' || progress >= 45,
      active: status !== 'ready' && progress < 45,
    },
    {
      title: '3. Scene Clues, CCTV & Voice Memos',
      desc: 'Placing characters into crime scene evidence, leaked group chats, and audio clues.',
      done: status === 'ready' || progress >= 80,
      active: status !== 'ready' && progress >= 45 && progress < 80,
    },
    {
      title: '4. Email Notification & Unlock in My Mysteries (Stories)',
      desc: `Sending your ready email${emailAddress ? ` to ${emailAddress}` : ''} and unlocking your Pre-Party Host Hub.`,
      done: status === 'ready',
      active: status !== 'ready' && progress >= 80,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Linear Workflow Progress Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] font-black uppercase tracking-widest">
        <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          1. Select Guests ✓
        </span>
        <span className="text-slate-300">→</span>
        <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          2. Lock In Cast ✓
        </span>
        <span className="text-slate-300">→</span>
        <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          3. Paid ✓
        </span>
        <span className="text-slate-300">→</span>
        <span
          className={`px-4 py-1.5 rounded-full shadow-sm ${
            status === 'ready'
              ? 'bg-emerald-600 text-white'
              : 'bg-brand-pink text-white animate-pulse'
          }`}
        >
          {status === 'ready'
            ? '4. Ready in My Mysteries (Stories) ✓'
            : '4. Generating Package (~20 Mins) ☕'}
        </span>
      </div>

      {/* Main Coffee / Generation Screen Card */}
      <div className="relative overflow-hidden rounded-[2.75rem] bg-gradient-to-br from-[#0f0a19] via-[#171126] to-[#0f0a19] text-white p-8 sm:p-12 shadow-2xl border border-white/10">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-pink/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Top Status Pill & Coffee Icon */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/15 flex items-center justify-center text-4xl shadow-xl">
              {status === 'ready' ? '🎉' : '☕'}
            </div>

            <span
              className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border ${
                status === 'ready'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-brand-pink/20 text-brand-pink border-brand-pink/40'
              }`}
            >
              {status === 'ready'
                ? '✓ Custom Package Complete & Email Sent!'
                : '🎉 Payment Confirmed • Custom Package Brewing'}
            </span>

            {status === 'ready' ? (
              <>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-2xl leading-tight">
                  Your Mystery Package is Ready!
                </h1>
                <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl leading-relaxed">
                  Your personalized cast for <strong className="text-white">{mysteryTitle}</strong> is ready to go in{' '}
                  <strong className="text-emerald-300">My Mysteries (Stories)</strong>
                  {emailAddress ? (
                    <>
                      , and we&apos;ve sent a notification email to{' '}
                      <strong className="text-white underline">{emailAddress}</strong>
                    </>
                  ) : null}
                  !
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-2xl leading-tight">
                  Your Package Will Be Ready in 20 Minutes — Go Get a Coffee! ☕
                </h1>
                <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl leading-relaxed">
                  Your cast for <strong className="text-white">{mysteryTitle}</strong> is locked in! Our AI studio is now generating your standard character portraits, scene clues, and audio evidence.{' '}
                  <strong className="text-white">
                    We will email you{emailAddress ? ` at ${emailAddress}` : ''} the moment it&apos;s ready.
                  </strong>
                </p>
              </>
            )}
          </div>

          {/* Safe to Close Browser Reassurance Box */}
          <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-400/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl shrink-0">
              ✅
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-300">
                Safe to Close This Browser Window Anytime
              </p>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                You don&apos;t need to keep this tab open! Our site generates your entire mystery package on our servers in the background. When you come back (or click the link in your email), your mystery will be ready to go in{' '}
                <strong className="text-white">My Mysteries (Stories)</strong>.
              </p>
            </div>
          </div>

          {/* Countdown & Progress Bar */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                  Live Server Generation Status
                </span>
                <p className="text-base sm:text-lg font-black text-white">{stepLabel}</p>
              </div>
              <div className="px-5 py-3 rounded-2xl bg-black/40 border border-white/10 text-center shrink-0">
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {status === 'ready' ? 'Status' : 'Estimated Time Left'}
                </span>
                <span className="text-2xl font-mono font-black text-emerald-400">
                  {status === 'ready' ? 'READY ✓' : formatCountdown(remainingSeconds)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3.5 rounded-full bg-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background:
                    status === 'ready'
                      ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                      : 'linear-gradient(90deg, #fe04c6 0%, #c026d3 50%, #38bdf8 100%)',
                }}
              />
            </div>

            {/* 4-Step Pipeline Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {stages.map((st, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    st.done
                      ? 'bg-emerald-500/10 border-emerald-400/30'
                      : st.active
                      ? 'bg-brand-pink/15 border-brand-pink/40'
                      : 'bg-white/5 border-white/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-sm">
                      {st.done ? '✅' : st.active ? '⚙️' : '⏳'}
                    </span>
                    <p className="text-xs font-black text-white">{st.title}</p>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium leading-snug pl-6">
                    {st.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {emailSentToast && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center">
              📧 &ldquo;Your Murder Mystery Package is Ready!&rdquo; email has been sent{emailAddress ? ` to ${emailAddress}` : ''}, and your mystery is now unlocked in My Mysteries (Stories)!
            </div>
          )}

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            {status === 'ready' ? (
              <>
                <Link
                  href={`/${locale}/mysteries/${slug}/ready`}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white text-center transition-all shadow-xl hover:opacity-95"
                  style={{
                    background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                    boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                  }}
                >
                  🎉 Open Your Mystery Ready Hub →
                </Link>
                <Link
                  href={`/${locale}/account/orders`}
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-black text-xs uppercase tracking-widest text-center transition-all"
                >
                  📖 View in My Mysteries (Stories) →
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/account/orders`}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white text-center transition-all shadow-xl hover:opacity-95"
                  style={{
                    background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                    boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                  }}
                >
                  📖 Go to My Mysteries (Stories) →
                </Link>

                <button
                  type="button"
                  disabled={isFastForwarding}
                  onClick={handleFinishNow}
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 font-black text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                >
                  {isFastForwarding
                    ? 'Finishing Generation & Sending Email...'
                    : '⚡ Skip 20-Min Wait (Finish & Send Email Now)'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
