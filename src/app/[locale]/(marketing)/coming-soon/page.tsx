'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ComingSoonPage() {
  const params = useParams();
  const locale = params?.locale || 'en';
  const [copied, setCopied] = useState(false);
  
  const discountCode = 'LAUNCH20';

  const handleCopy = () => {
    navigator.clipboard.writeText(discountCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-brand-dark text-white p-6 relative overflow-hidden">
      {/* Dynamic spotlight glow background */}
      <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-brand-pink/20 via-slate-950 to-brand-dark opacity-50 blur-[130px] rounded-full" />
      </div>
      <div className="absolute -inset-4 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.03)_1px,transparent_0)] [background-size:24px_24px] pointer-events-none"></div>

      <div className="max-w-4xl w-full text-center relative z-10 py-16">
        {/* Pulsing Live Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-2 mb-8 text-xs font-black tracking-[0.25em] uppercase text-brand-pink bg-brand-pink/10 rounded-full border border-brand-pink/30 shadow-lg shadow-brand-pink/5">
          <span className="w-2.5 h-2.5 bg-brand-pink rounded-full animate-ping"></span>
          WE ARE OFFICIALLY LIVE!
        </div>
        
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-8 tracking-tighter uppercase leading-[0.95]">
          The Studio is <br />
          <span className="text-brand-pink italic">Now Open</span>
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-gray-400 font-bold mb-16 max-w-2xl mx-auto leading-relaxed border-l-4 border-brand-pink pl-6 text-left">
          Our state-of-the-art AI-powered murder mystery engine is fully operational. To celebrate our launch, take <strong className="text-white">20% off</strong> your first game pack.
        </p>

        {/* Promo Code Celebration Card */}
        <div className="max-w-xl mx-auto bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 md:p-12 mb-16 shadow-2xl relative overflow-hidden group hover:border-brand-pink/30 transition-all duration-500">
          <div className="absolute top-0 right-12 transform -translate-y-1/2 px-6 py-2 bg-brand-pink text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
            LAUNCH DISCOUNT
          </div>
          
          <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Claim Your Launch Discount</h3>
          <p className="text-sm font-semibold text-gray-400 mb-8">Copy the coupon code below and apply it at checkout to get 20% off any premium mystery pack.</p>
          
          <div className="bg-black/40 border border-white/5 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-brand-pink/20 transition-all duration-300">
            <div className="text-left w-full sm:w-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">PROMO CODE</p>
              <p className="text-4xl font-black text-brand-pink tracking-wider font-mono">{discountCode}</p>
            </div>
            
            <button 
              onClick={handleCopy}
              className={`w-full sm:w-auto px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${copied ? 'bg-green-500 text-white' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Dynamic Launch CTAs */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link href={`/${locale}/themes`} className="px-12 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 text-center w-full sm:w-auto">
            Choose a Theme
          </Link>
          <Link href={`/${locale}/create`} className="px-12 py-5 bg-white text-brand-dark rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-pink hover:text-white transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 text-center w-full sm:w-auto">
            Build your Mystery
          </Link>
        </div>
      </div>
    </div>
  );
}
