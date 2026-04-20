'use client'

import React, { useActionState } from 'react';
import { subscribeToNewsletter, SubscribeState } from '@/app/[locale]/(marketing)/blog/actions';

interface NewsletterFormProps {
  placeholder: string;
  buttonText: string;
  namePlaceholder?: string;
  isSidebar?: boolean;
}

export function NewsletterForm({ 
  placeholder, 
  buttonText, 
  namePlaceholder = "Your name",
  isSidebar = false 
}: NewsletterFormProps) {
  const [state, formAction, isPending] = useActionState<SubscribeState | null, FormData>(
    subscribeToNewsletter,
    null
  );

  if (state?.success) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2rem] text-center animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
          ✓
        </div>
        <h4 className="text-xl font-black text-green-500 uppercase tracking-tight mb-2">You're in!</h4>
        <p className="text-gray-500 font-bold text-sm">Thanks for joining the Gazette. Check your inbox soon!</p>
      </div>
    );
  }

  if (isSidebar) {
    return (
      <form action={formAction} className="space-y-4">
        <input 
          type="text" 
          name="full_name"
          placeholder={namePlaceholder}
          className="w-full px-6 py-4 rounded-full bg-white border border-gray-200 text-sm font-semibold focus:outline-none focus:border-brand-pink transition-all text-brand-dark"
        />
        <input 
          type="email" 
          name="email"
          placeholder={placeholder} 
          className="w-full px-6 py-4 rounded-full bg-white border border-gray-200 text-sm font-semibold focus:outline-none focus:border-brand-pink transition-all text-brand-dark"
          required
        />
        <div className="flex items-start gap-2 px-2">
           <input type="checkbox" name="marketing_consent" id="consent-sidebar" className="mt-1 accent-brand-pink" defaultChecked />
           <label htmlFor="consent-sidebar" className="text-[9px] text-gray-400 font-bold leading-tight">
             I agree to receive marketing emails. Unsubscribe anytime.
           </label>
        </div>
        <button 
          type="submit" 
          disabled={isPending}
          className="w-full py-4 bg-brand-dark text-white rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-brand-pink transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {isPending ? 'Joining...' : buttonText}
        </button>
        {state?.error && (
          <p className="text-red-500 text-[10px] font-bold text-center animate-bounce">{state.error}</p>
        )}
      </form>
    );
  }

  return (
    <div className="w-full">
      <form action={formAction} className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white/5 rounded-[2.5rem] sm:rounded-full backdrop-blur-md border border-white/10 focus-within:border-brand-pink transition-all">
          <input 
            type="text" 
            name="full_name"
            placeholder={namePlaceholder}
            className="flex-grow px-8 py-5 rounded-full bg-transparent text-white placeholder:text-gray-500 font-bold focus:outline-none transition-all border-none min-w-0"
          />
          <input 
            type="email" 
            name="email"
            placeholder={placeholder} 
            className="flex-grow px-8 py-5 rounded-full bg-transparent text-white placeholder:text-gray-500 font-bold focus:outline-none transition-all border-none min-w-0"
            required
          />
          <button 
            type="submit" 
            disabled={isPending}
            className="px-12 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-pink transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isPending ? '...' : buttonText}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2">
           <input type="checkbox" name="marketing_consent" id="marketing_consent" className="accent-brand-pink" defaultChecked />
           <label htmlFor="marketing_consent" className="text-[10px] text-gray-500 font-bold">
             By providing your email, you consent to receive marketing communications from Back Pocket Mysteries.
           </label>
        </div>

        {state?.error && (
          <p className="text-red-500 text-xs font-black uppercase tracking-widest">{state.error}</p>
        )}
      </form>
    </div>
  );
}
