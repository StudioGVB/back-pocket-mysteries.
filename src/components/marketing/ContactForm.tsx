'use client';

import React, { useState } from 'react';
import { submitContactForm } from '@/app/actions/contact';

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await submitContactForm(formData);
      if (result.error) {
        setStatus('error');
        setErrorMessage(result.error);
      } else {
        setStatus('success');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="card-branded p-12 text-center bg-brand-gray border-2 border-brand-pink/20">
        <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-4">Message Sent!</h3>
        <p className="text-gray-500 font-bold">We've received your inquiry and will get back to you at the email provided shortly.</p>
        <button 
          onClick={() => setStatus('idle')}
          className="mt-8 text-xs font-black uppercase tracking-widest text-brand-pink hover:text-brand-dark transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {status === 'error' && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">
          {errorMessage}
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-widest text-brand-dark mb-2 pl-4">Name</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            required
            className="w-full bg-brand-gray border-2 border-transparent rounded-full px-6 py-4 text-brand-dark font-medium focus:outline-none focus:border-brand-pink transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-brand-dark mb-2 pl-4">Email Address</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            required
            className="w-full bg-brand-gray border-2 border-transparent rounded-full px-6 py-4 text-brand-dark font-medium focus:outline-none focus:border-brand-pink transition-colors"
            placeholder="hello@example.com"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="message" className="block text-[10px] font-black uppercase tracking-widest text-brand-dark mb-2 pl-4">Message</label>
        <textarea 
          id="message" 
          name="message" 
          required
          rows={6}
          className="w-full bg-brand-gray border-2 border-transparent rounded-[2rem] px-6 py-5 text-brand-dark font-medium focus:outline-none focus:border-brand-pink transition-colors resize-none"
          placeholder="How can we help you?"
        ></textarea>
      </div>

      <button 
        type="submit" 
        disabled={status === 'loading'}
        className="w-full md:w-auto px-12 py-5 bg-brand-dark text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
      >
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
