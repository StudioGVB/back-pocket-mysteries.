'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  checkEmailAccountAction,
  sendMagicLinkAction,
  verifyMagicLinkOtpAction,
  verifySignupPromoCodeAction,
  signup,
} from '../actions';
import { signInAction } from './login-action';
import { CustomSelect } from '@/components/ui/CustomSelect';

const COUNTRY_CONFIG: Record<
  string,
  { currency: string; timezone: string }
> = {
  'United Kingdom': { currency: 'GBP', timezone: 'Europe/London' },
  'United States': { currency: 'USD', timezone: 'America/New_York' },
  'Australia': { currency: 'AUD', timezone: 'Australia/Sydney' },
  'Canada': { currency: 'CAD', timezone: 'America/New_York' },
  'New Zealand': { currency: 'NZD', timezone: 'Pacific/Auckland' },
  'Ireland': { currency: 'EUR', timezone: 'Europe/London' },
  'France': { currency: 'EUR', timezone: 'Europe/Paris' },
  'Germany': { currency: 'EUR', timezone: 'Europe/Paris' },
  'Other': { currency: 'USD', timezone: 'Europe/London' },
};

const COUNTRY_OPTIONS = [
  { value: '', label: 'Select your country', disabled: true },
  { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
  { value: 'United States', label: '🇺🇸 United States' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  { value: 'New Zealand', label: '🇳🇿 New Zealand' },
  { value: 'Ireland', label: '🇮🇪 Ireland' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Germany', label: '🇩🇪 Germany' },
  { value: 'Other', label: '🌍 Other' },
];

const CURRENCY_OPTIONS = [
  { value: 'GBP', label: '£ GBP (British Pound)' },
  { value: 'USD', label: '$ USD (US Dollar)' },
  { value: 'AUD', label: 'A$ AUD (Australian Dollar)' },
  { value: 'CAD', label: 'C$ CAD (Canadian Dollar)' },
  { value: 'NZD', label: 'NZ$ NZD (New Zealand Dollar)' },
  { value: 'EUR', label: '€ EUR (Euro)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Europe/London', label: 'London / UK (GMT / BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET / CEST)' },
  { value: 'America/New_York', label: 'Eastern Time (EST / EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST / CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST / MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST / PDT)' },
  { value: 'Australia/Sydney', label: 'Sydney / Melbourne (AEST / AEDT)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland / NZ (NZST / NZDT)' },
];

const HOW_FOUND_US_OPTIONS = [
  { value: '', label: 'Select an option...', disabled: true },
  { value: 'Google Search', label: 'Google Search' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Friend / Word of Mouth', label: 'Friend / Word of Mouth' },
  { value: 'Attended a Back Pocket Party', label: 'Attended a Back Pocket Party' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Reddit / Forum', label: 'Reddit / Forum' },
  { value: 'Podcast / Blog / Press', label: 'Podcast / Blog / Press' },
  { value: 'Other', label: 'Other' },
];

interface UnifiedAuthFlowProps {
  locale: string;
  initialEmail?: string;
  initialStep?: 'email' | 'login' | 'signup';
  initialMessage?: string;
  initialError?: string;
  next?: string;
  initialPromoCode?: string;
}

export default function UnifiedAuthFlow({
  locale,
  initialEmail = '',
  initialStep = 'email',
  initialMessage = '',
  initialError = '',
  next = '',
  initialPromoCode = '',
}: UnifiedAuthFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'login' | 'signup'>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [existingUserName, setExistingUserName] = useState<string | null>(null);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState(initialMessage);
  const [isChecking, startTransition] = useTransition();

  // Magic Link state
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Signup state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [timezone, setTimezone] = useState(() => {
    if (typeof Intl !== 'undefined') {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONE_OPTIONS.some((o) => o.value === detected)) {
        return detected;
      }
    }
    return 'Europe/London';
  });
  const [howFoundUs, setHowFoundUs] = useState('');
  const [promoCode, setPromoCode] = useState(
    initialPromoCode ? initialPromoCode.trim().toUpperCase() : ''
  );
  const [promoStatus, setPromoStatus] = useState<{
    checked: boolean;
    valid: boolean;
    message: string;
  } | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  const handleCountryChange = (selectedCountry: string) => {
    setCountry(selectedCountry);
    const config = COUNTRY_CONFIG[selectedCountry];
    if (config) {
      setCurrency(config.currency);
      setTimezone(config.timezone);
    }
  };

  const handleEmailCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setMessage('');
    setMagicLinkSent(false);

    startTransition(async () => {
      try {
        const res = await checkEmailAccountAction(trimmed);
        if (res.exists) {
          setExistingUserName(res.firstName || null);
          setStep('login');
        } else {
          setStep('signup');
        }
      } catch {
        setStep('login');
      }
    });
  };

  const handleSendMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setError('');
    setMessage('');
    setIsSendingMagicLink(true);
    try {
      const res = await sendMagicLinkAction(trimmed, next);
      if (res.success) {
        setMagicLinkSent(true);
        setMessage(`Magic login link sent to ${trimmed}! Click the link in your email to log straight in.`);
      } else {
        setError(res.error || 'Could not send magic link.');
      }
    } catch {
      setError('Could not send magic link. Please try again.');
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setError('');
    setIsVerifyingOtp(true);
    try {
      const res = await verifyMagicLinkOtpAction(email.trim(), otpCode.trim(), next);
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setError(res.error || 'Invalid or expired code.');
      }
    } catch {
      setError('Could not verify code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleApplyPromo = async () => {
    const clean = promoCode.trim().toUpperCase();
    if (!clean) return;
    setIsCheckingPromo(true);
    setPromoStatus(null);
    try {
      const res = await verifySignupPromoCodeAction(clean);
      if (res.valid) {
        setPromoCode(res.code || clean);
        setPromoStatus({
          checked: true,
          valid: true,
          message: res.label || `Code ${clean} applied!`,
        });
      } else {
        setPromoStatus({
          checked: true,
          valid: false,
          message: res.error || 'Invalid promo code.',
        });
      }
    } catch {
      setPromoStatus({
        checked: true,
        valid: true,
        message: `Code ${clean} saved!`,
      });
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setError('');
    setMessage('');
    setPassword('');
    setMagicLinkSent(false);
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="text-center space-y-2.5">
        {step === 'email' && (
          <>
            <h1 className="text-3xl font-black text-brand-dark tracking-tight uppercase">
              Welcome
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Enter your email to log in or create your host account
            </p>
          </>
        )}
        {step === 'login' && (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-1">
              Welcome Back{existingUserName ? `, ${existingUserName}` : ''}
            </div>
            <h1 className="text-3xl font-black text-brand-dark tracking-tight uppercase">
              Log In
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Enter your password or request an instant magic link
            </p>
          </>
        )}
        {step === 'signup' && (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-1">
              New Host Account
            </div>
            <h1 className="text-3xl font-black text-brand-dark tracking-tight uppercase">
              Let&apos;s Get You Set Up
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Complete your onboarding details below
            </p>
          </>
        )}
      </div>

      {/* Feedback Banners */}
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

      {/* STEP 1: EMAIL LOOKUP */}
      {step === 'email' && (
        <form onSubmit={handleEmailCheck} className="space-y-6">
          <div className="space-y-2">
            <label
              className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4"
              htmlFor="email-lookup"
            >
              Email Address
            </label>
            <input
              id="email-lookup"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              autoFocus
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink focus:bg-white transition-all text-sm font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="w-full py-5 bg-brand-dark text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-dark/10 hover:bg-brand-pink hover:shadow-brand-pink/20 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {isChecking ? 'Checking account...' : 'Continue →'}
          </button>
        </form>
      )}

      {/* STEP 2A: EXISTING USER LOGIN (Password Primary + Magic Link Secondary) */}
      {step === 'login' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <form action={signInAction} className="space-y-5">
            {next && <input type="hidden" name="next" value={next} />}
            <input type="hidden" name="email" value={email.trim()} />

            {/* Locked Email Pill with Change button */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center text-xs font-black shrink-0">
                  ✓
                </div>
                <span className="text-sm font-bold text-slate-700 truncate">
                  {email.trim()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleChangeEmail}
                className="text-[10px] font-black uppercase tracking-widest text-brand-pink hover:underline ml-3 shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-4">
                <label
                  className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400"
                  htmlFor="login-password"
                >
                  Password
                </label>
                <Link
                  href={`/${locale}/reset-password`}
                  className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-pink hover:underline mr-4"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink focus:bg-white transition-all text-sm font-medium pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-pink focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="remember"
                  value="true"
                  defaultChecked={true}
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-brand-pink focus:ring-brand-pink accent-brand-pink cursor-pointer"
                />
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors cursor-pointer">
                  Keep me logged in
                </span>
              </label>

              <button
                type="button"
                onClick={() => setStep('signup')}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-pink transition-colors cursor-pointer"
              >
                New here? Sign up
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-brand-dark text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-dark/10 hover:bg-brand-pink hover:shadow-brand-pink/20 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              Sign In with Password
            </button>
          </form>

          {/* Secondary Option: Magic Link */}
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-slate-100 w-full" />
            <span className="bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 shrink-0">
              Or password-free
            </span>
            <div className="border-t border-slate-100 w-full" />
          </div>

          <button
            type="button"
            onClick={handleSendMagicLink}
            disabled={isSendingMagicLink}
            className="w-full py-4 bg-white border-2 border-slate-200 hover:border-brand-pink text-slate-700 hover:text-brand-pink rounded-full text-xs font-black uppercase tracking-[0.15em] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-pink"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            {isSendingMagicLink
              ? 'Sending Magic Link...'
              : magicLinkSent
              ? 'Resend Magic Link'
              : 'Email Me a Magic Link'}
          </button>

          {magicLinkSent && (
            <form
              onSubmit={handleVerifyOtp}
              className="p-4 rounded-3xl bg-slate-50 border border-slate-100 space-y-3 animate-in fade-in duration-200"
            >
              <p className="text-[11px] font-bold text-slate-500 text-center">
                Click the magic link in your email, or enter the 6-digit code if included:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                  placeholder="6-digit code"
                  maxLength={8}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-full text-center text-sm font-black tracking-[0.25em] focus:outline-none focus:border-brand-pink"
                />
                <button
                  type="submit"
                  disabled={isVerifyingOtp || !otpCode.trim()}
                  className="px-5 py-2.5 bg-brand-dark hover:bg-brand-pink text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isVerifyingOtp ? '...' : 'Verify'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* STEP 2B: NEW USER ONBOARDING & SIGNUP */}
      {step === 'signup' && (
        <form action={signup} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {next && <input type="hidden" name="next" value={next} />}
          <input type="hidden" name="email" value={email.trim()} />
          <input type="hidden" name="full_name" value={`${firstName.trim()} ${lastName.trim()}`.trim()} />
          <input type="hidden" name="marketing_opt_in" value={marketingOptIn ? 'true' : 'false'} />

          {/* Locked Email Pill with Change button */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-full">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center text-xs font-black shrink-0">
                ✉
              </div>
              <span className="text-sm font-bold text-slate-700 truncate">
                {email.trim()}
              </span>
            </div>
            <button
              type="button"
              onClick={handleChangeEmail}
              className="text-[10px] font-black uppercase tracking-widest text-brand-pink hover:underline ml-3 shrink-0 cursor-pointer"
            >
              Change
            </button>
          </div>

          <div className="space-y-4">
            {/* First & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label
                  className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4"
                  htmlFor="first_name"
                >
                  First Name <span className="text-brand-pink">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  autoFocus
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink focus:bg-white transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4"
                  htmlFor="last_name"
                >
                  Last Name <span className="text-brand-pink">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label
                className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4"
                htmlFor="country"
              >
                Country <span className="text-brand-pink">*</span>
              </label>
              <CustomSelect
                id="country"
                name="country"
                required
                value={country}
                onValueChange={handleCountryChange}
                placeholder="Select your country"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink transition-colors text-sm font-medium"
                options={COUNTRY_OPTIONS}
              />
            </div>

            {/* Auto-set Currency & Timezone (editable) */}
            {country && (
              <div className="p-4 rounded-3xl bg-slate-50/80 border border-slate-100 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Regional Defaults (Auto-detected)
                  </span>
                  <span className="text-[10px] font-bold text-brand-pink">
                    Editable
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3"
                      htmlFor="currency"
                    >
                      Currency
                    </label>
                    <CustomSelect
                      id="currency"
                      name="currency"
                      value={currency}
                      onValueChange={setCurrency}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-full text-xs font-bold"
                      options={CURRENCY_OPTIONS}
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3"
                      htmlFor="timezone"
                    >
                      Timezone
                    </label>
                    <CustomSelect
                      id="timezone"
                      name="timezone"
                      value={timezone}
                      onValueChange={setTimezone}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-full text-xs font-bold"
                      options={TIMEZONE_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            )}
            {!country && (
              <>
                <input type="hidden" name="currency" value={currency} />
                <input type="hidden" name="timezone" value={timezone} />
              </>
            )}

            {/* How did you hear about us? (Mandatory Dropdown) */}
            <div className="space-y-1.5">
              <label
                className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4"
                htmlFor="how_found_us"
              >
                How did you hear about us? <span className="text-brand-pink">*</span>
              </label>
              <CustomSelect
                id="how_found_us"
                name="how_found_us"
                required
                value={howFoundUs}
                onValueChange={setHowFoundUs}
                placeholder="Select an option..."
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink transition-colors text-sm font-medium"
                options={HOW_FOUND_US_OPTIONS}
              />
            </div>

            {/* Promo / Referral Code Field */}
            <div className="space-y-1.5">
              <label
                className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4"
                htmlFor="promo_code"
              >
                Promo or Referral Code <span className="text-slate-300 font-normal">(Optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="promo_code"
                  name="promo_code"
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    if (promoStatus) setPromoStatus(null);
                  }}
                  placeholder="e.g. EARLY20 or friend's code"
                  className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink focus:bg-white transition-all text-sm font-bold uppercase tracking-wider"
                />
                {promoCode.trim() && (
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={isCheckingPromo}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-brand-pink hover:text-white text-slate-700 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer"
                  >
                    {isCheckingPromo ? '...' : 'Verify'}
                  </button>
                )}
              </div>
              {promoStatus && (
                <p
                  className={`text-xs font-bold ml-4 ${
                    promoStatus.valid ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {promoStatus.valid ? '✓ ' : '✕ '}
                  {promoStatus.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-4"
                htmlFor="signup-password"
              >
                Create Password <span className="text-brand-pink">*</span>
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  minLength={6}
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-full focus:outline-none focus:border-brand-pink focus:bg-white transition-all text-sm font-medium pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-pink focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Marketing / Hosting Tips Opt-in */}
            <div className="pt-1 px-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-pink focus:ring-brand-pink accent-brand-pink cursor-pointer"
                />
                <span className="text-xs text-slate-500 leading-snug">
                  Send me party hosting tips, new mystery releases, and exclusive discounts.
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={!country || !howFoundUs || !firstName.trim() || !lastName.trim() || password.length < 6}
            className="w-full py-5 bg-brand-dark text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-dark/10 hover:bg-brand-pink hover:shadow-brand-pink/20 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Create Account
          </button>

          <div className="text-center space-y-2 pt-1">
            <p className="text-[11px] text-slate-400">
              By creating an account, you agree to our{' '}
              <Link href={`/${locale}/terms`} className="underline hover:text-brand-pink">
                Terms
              </Link>{' '}
              &{' '}
              <Link href={`/${locale}/privacy`} className="underline hover:text-brand-pink">
                Privacy Policy
              </Link>
              .
            </p>
            <button
              type="button"
              onClick={() => setStep('login')}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-pink transition-colors cursor-pointer"
            >
              Already have an account? Enter password instead
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
