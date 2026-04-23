'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { submitEmailLead } from '@/app/actions/marketing';

export default function ComingSoonPage() {
  const params = useParams();
  const locale = params?.locale || 'en';
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);
  
  // Email Form State
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [discountCode, setDiscountCode] = useState('');

  useEffect(() => {
    setMounted(true);
    // May 1st, 2026 00:00:00 UTC
    const targetDate = new Date('2026-05-01T00:00:00Z').getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage('');

    const result = await submitEmailLead(email);

    if (result.success && result.uniqueCode) {
      setStatus('success');
      setDiscountCode(result.uniqueCode);
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-brand-dark text-white p-6 relative overflow-hidden">
      {/* Background styling elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-pink/5 skew-x-12 translate-x-1/2"></div>
      <div className="absolute -inset-4 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:24px_24px] pointer-events-none"></div>

      <div className="max-w-4xl w-full text-center relative z-10 py-24">
        <div className="inline-flex items-center gap-2 px-6 py-2 mb-8 text-xs font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full border border-brand-pink/20">
          <span className="w-2 h-2 bg-brand-pink rounded-full animate-pulse"></span>
          Launching May 1st, 2026
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tighter uppercase leading-[0.9]">
          The Studio is <br />
          <span className="text-brand-pink italic">Preparing</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-400 font-bold mb-16 max-w-2xl mx-auto leading-relaxed border-l-4 border-brand-pink pl-6 text-left">
          We&apos;re putting the final touches on our AI-powered mystery generator. Sign up now and get <strong className="text-white">20% off</strong> your first purchase when we launch.
        </p>

        {mounted ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto mb-16">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds },
            ].map((unit, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm group hover:border-brand-pink transition-colors">
                <div className="text-4xl md:text-6xl font-black text-white group-hover:text-brand-pink transition-colors mb-2 tabular-nums">
                  {unit.value.toString().padStart(2, '0')}
                </div>
                <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto mb-16 opacity-0">
             {/* Placeholder to prevent layout shift */}
            {[1,2,3,4].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
                 <div className="text-4xl md:text-6xl font-black mb-2">00</div>
                 <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">Unit</div>
              </div>
            ))}
          </div>
        )}

        {/* Email Signup Form */}
        <div className="max-w-md mx-auto mb-16">
          {status === 'success' ? (
            <div className="bg-green-950/40 border border-green-500/30 rounded-3xl p-8 backdrop-blur-md animate-in fade-in zoom-in duration-500 text-left">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">You're on the list!</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-green-400">20% Off Claimed</p>
                </div>
              </div>
              
              <div className="bg-black/50 border border-white/10 p-6 rounded-2xl">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Your Unique Code</p>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-black text-brand-pink tracking-widest">{discountCode}</p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(discountCode)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white"
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  disabled={status === 'loading'}
                  className="w-full bg-white/5 border border-white/10 focus:border-brand-pink focus:ring-1 focus:ring-brand-pink rounded-full px-6 py-4 text-white placeholder-gray-500 outline-none transition-all font-bold disabled:opacity-50"
                />
              </div>
              
              {status === 'error' && (
                <p className="text-brand-pink text-sm font-bold text-left px-4">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-brand-pink hover:bg-white hover:text-brand-pink text-white rounded-full px-6 py-4 font-black uppercase tracking-widest text-sm transition-all duration-300 shadow-xl shadow-brand-pink/20 hover:shadow-brand-pink/40 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:hover:bg-brand-pink disabled:hover:text-white disabled:hover:translate-y-0"
              >
                {status === 'loading' ? 'Generating Code...' : 'Claim 20% Off Code'}
              </button>
            </form>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link href={`/${locale}`} className="px-10 py-5 bg-white text-brand-dark rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-pink hover:text-white transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 text-center">
            ← Back to Home
          </Link>
          <Link href={`/${locale}/themes`} className="px-10 py-5 bg-transparent border-2 border-white/20 text-white rounded-full font-black uppercase tracking-widest text-sm hover:border-brand-pink hover:text-brand-pink transition-all text-center">
            Browse Themes
          </Link>
        </div>
      </div>
    </div>
  );
}
