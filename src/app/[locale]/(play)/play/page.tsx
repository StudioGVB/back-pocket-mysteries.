'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { findMysteryByPinAction } from '@/app/actions/customer-mystery';

export default function KahootPinJoinPage() {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale || 'en';

  const [pin, setPin] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsJoining(true);

    try {
      const res = await findMysteryByPinAction(pin);
      if (res.error || !res.mysteryId) {
        setError(res.error || 'Invalid Game PIN.');
      } else {
        router.push(`/${locale}/play/${res.mysteryId}`);
      }
    } catch {
      setError('Could not join game right now. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-white flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Glow accents */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-pink/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/60 border border-white/10 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl backdrop-blur-md text-center space-y-6 sm:space-y-8">
        <div>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-brand-pink/15 text-brand-pink border border-brand-pink/30">
              Back Pocket Mysteries
            </span>
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              🔓 No Login Needed
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Enter Game PIN
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-2">
            Enter the 6-digit code from your host&apos;s screen to join the lobby immediately, no account or sign-up required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={pin}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits);
            }}
            placeholder="000 000"
            className="w-full bg-slate-950/90 border-2 border-white/15 focus:border-brand-pink rounded-2xl px-4 py-4 sm:py-5 text-center text-2xl sm:text-3xl font-black tracking-[0.25em] text-white placeholder:text-slate-700 outline-none transition-all font-mono"
          />

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining || pin.replace(/\D/g, '').length < 6}
            className="w-full min-h-[52px] py-4 rounded-2xl bg-brand-pink hover:opacity-95 text-white font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {isJoining ? 'Joining Lobby...' : 'Enter Mystery Lobby →'}
          </button>
        </form>
      </div>
    </div>
  );
}

