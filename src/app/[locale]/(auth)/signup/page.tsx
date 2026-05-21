import React from 'react';
import Link from 'next/link';
import { signup } from '../actions';
import PasswordInput from './PasswordInput';

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-black text-brand-dark tracking-tight uppercase">Get Started</h1>
        <p className="text-slate-500 text-sm font-medium">Create your host account today</p>
      </div>

      <form action={signup} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4" htmlFor="full_name">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Your Name"
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink transition-colors text-sm font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink transition-colors text-sm font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4" htmlFor="country">
              Country
            </label>
            <select
              id="country"
              name="country"
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink transition-colors text-sm font-medium appearance-none"
              defaultValue=""
            >
              <option value="" disabled>Select your country</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="New Zealand">New Zealand</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4" htmlFor="how_found_us">
              How did you hear about us? <span className="text-slate-300 font-normal">(Optional)</span>
            </label>
            <input
              id="how_found_us"
              name="how_found_us"
              type="text"
              placeholder="Google, Friend, Instagram..."
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink transition-colors text-sm font-medium"
            />
          </div>

          <PasswordInput />
        </div>

        <button
          type="submit"
          className="w-full py-5 bg-brand-dark text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-dark/10 hover:bg-brand-pink hover:shadow-brand-pink/20 transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
        >
          Create Account
        </button>
      </form>

      <div className="pt-6 border-t border-slate-50 text-center">
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-pink hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
