'use client';

import React, { useState } from 'react';
import { submitEmailLead } from '@/app/actions/marketing';

export default function FooterMarketingForm({ placeholder }: { placeholder: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [vipRank, setVipRank] = useState<number | null>(null);
  const [qualifies, setQualifies] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMsg('');

    const result = await submitEmailLead(email, undefined, 'footer_vip_form');

    if (result.success) {
      setStatus('success');
      setVipRank(result.vipRank || 1);
      setQualifies(result.qualifiesForFreeMystery ?? true);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('bpm_first50_lead_joined', 'true');
      }
    } else {
      setStatus('error');
      setErrorMsg(result.error || 'Could not join.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-2xl p-4 text-center space-y-1.5">
        <p className="text-xs font-black uppercase tracking-wider text-brand-pink">
          {qualifies ? `🎉 VIP Spot #${vipRank} of 50 Locked In!` : `✓ You're on the Launch List!`}
        </p>
        <p className="text-xs font-medium text-slate-300 leading-relaxed">
          {qualifies
            ? "You're in the First 50! We'll email your FREE Mystery code when we launch."
            : "We'll email your exclusive launch perks as soon as we go live!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-pink">
        <span>🎁 First 50 Sign-Ups Get a Free Mystery</span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          disabled={status === 'loading'}
          required
          className={`bg-white/5 border rounded-full px-4 py-3 text-sm focus:outline-none focus:border-brand-pink w-full text-white placeholder-gray-500 transition-colors ${
            status === 'error' ? 'border-red-500' : 'border-white/10'
          }`}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-brand-pink p-3 rounded-full hover:bg-white hover:text-brand-pink transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {status === 'loading' ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </form>
      {status === 'error' && errorMsg && (
        <p className="text-[11px] font-bold text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
