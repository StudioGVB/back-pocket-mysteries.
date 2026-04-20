import React from 'react';
import Link from 'next/link';
import { signInAction } from './login-action';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { message, error } = await searchParams;
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-black text-brand-dark tracking-tight uppercase">Welcome Back</h1>
        <p className="text-slate-500 text-sm font-medium">Log in to manage your mysteries</p>
      </div>

      <form action={signInAction} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl text-center">
            {error}
          </div>
        )}
        
        {message && (
          <div className="p-4 bg-green-50 border border-green-100 text-green-600 text-xs font-bold rounded-2xl text-center">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink transition-colors text-sm font-medium"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-4">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400" htmlFor="password">
                Password
              </label>
              <Link href="/reset-password" className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-pink hover:underline mr-4">
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink transition-colors text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex items-center px-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              name="remember" 
              className="w-5 h-5 rounded-lg border-2 border-slate-200 text-brand-pink focus:ring-brand-pink accent-brand-pink cursor-pointer"
            />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors cursor-pointer">
              Keep me logged in
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full py-5 bg-brand-dark text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-dark/10 hover:bg-brand-pink hover:shadow-brand-pink/20 transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
        >
          Sign In
        </button>
      </form>

      <div className="pt-6 border-t border-slate-50 text-center">
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
           Don't have an account?{' '}
          <Link href="/signup" className="text-brand-pink hover:underline">
            Get Started
          </Link>
        </p>
      </div>
    </div>
  );
}
