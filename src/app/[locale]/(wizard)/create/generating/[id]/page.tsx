import React from 'react';
import { Locale } from '@/lib/i18n-config';
import Link from 'next/link';

export default async function GeneratingPage(props: {
  params: Promise<{ locale: Locale, id: string }>
}) {
  const { locale, id } = await props.params;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-12 rounded-[3rem] text-center shadow-2xl">
        
        {/* Animated Icon */}
        <div className="w-32 h-32 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-8 border border-slate-700 relative">
          <div className="absolute inset-0 rounded-full border-t-4 border-brand-pink animate-spin"></div>
          <span className="text-5xl animate-bounce">🕵️‍♀️</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter mb-4">
          Generating Your <span className="text-brand-pink italic">Mystery</span>
        </h1>
        
        <p className="text-slate-400 text-lg font-medium mb-10 max-w-lg mx-auto">
          Our AI detectives are currently piecing together your clues, forging motives, and hiding secrets. 
          <br/><br/>
          <strong className="text-white">This process takes approximately 20 minutes.</strong>
        </p>

        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 mb-10 text-left space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span className="text-sm font-bold text-slate-300">Payment Processed Successfully</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span className="text-sm font-bold text-slate-300">Inside Jokes Integrated</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-brand-pink/20 text-brand-pink flex items-center justify-center border border-brand-pink/30 animate-pulse">
              <div className="w-2 h-2 bg-brand-pink rounded-full"></div>
            </div>
            <span className="text-sm font-bold text-white">Weaving character motives...</span>
          </div>
          <div className="flex items-center gap-4 opacity-50">
            <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700"></div>
            <span className="text-sm font-bold text-slate-500">Generating AI evidence photos</span>
          </div>
          <div className="flex items-center gap-4 opacity-50">
            <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700"></div>
            <span className="text-sm font-bold text-slate-500">Packaging printable PDF</span>
          </div>
        </div>

        <p className="text-sm font-bold text-brand-pink uppercase tracking-widest mb-8">
          You can close this window. We will email you when it's ready!
        </p>

        <Link 
          href={`/${locale}/dashboard`}
          className="inline-block px-8 py-4 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>

    </div>
  );
}
