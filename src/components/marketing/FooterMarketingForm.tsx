'use client';

import React, { useState } from 'react';
import { submitEmailLead } from '@/app/actions/marketing';

export default function FooterMarketingForm({ placeholder }: { placeholder: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [discountCode, setDiscountCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    const result = await submitEmailLead(email);

    if (result.success && result.uniqueCode) {
      setStatus('success');
      setDiscountCode(result.uniqueCode);
    } else {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-brand-pink/10 border border-brand-pink/20 rounded-xl p-4 text-center">
        <p className="text-xs font-bold text-white mb-2">You're on the list!</p>
        <p className="text-[10px] uppercase tracking-widest text-brand-pink mb-1">Your 20% Off Code:</p>
        <div className="font-black tracking-widest text-white bg-black/30 rounded px-2 py-1 inline-block">
          {discountCode}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder} 
        disabled={status === 'loading'}
        required
        className={`bg-white/5 border rounded-full px-4 py-3 text-sm focus:outline-none focus:border-brand-pink w-full text-white placeholder-gray-500 transition-colors ${status === 'error' ? 'border-red-500' : 'border-white/10'}`} 
      />
      <button 
        type="submit"
        disabled={status === 'loading'}
        className="bg-brand-pink p-3 rounded-full hover:bg-white hover:text-brand-pink transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </form>
  );
}
