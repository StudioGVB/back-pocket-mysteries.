'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { acceptInvitation, claimInvitationWithAuthAction } from '@/app/actions/guest-invitations';

interface InviteClientProps {
  token: string;
  locale: string;
  hostName: string;
  personalNote: string | null;
  invitedGuestName: string | null;
  invitedEmail: string | null;
  isLoggedIn: boolean;
  currentUserEmail: string | null;
  isHostPreview: boolean;
  isValid: boolean;
  isExpired: boolean;
  isAlreadyUsed: boolean;
  notFound: boolean;
}

export default function InviteClient({
  token,
  locale,
  hostName,
  personalNote,
  invitedGuestName,
  invitedEmail,
  isLoggedIn,
  currentUserEmail,
  isHostPreview,
  isValid,
  isExpired,
  isAlreadyUsed,
  notFound,
}: InviteClientProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [requiresEmailConfirm, setRequiresEmailConfirm] = useState(false);
  const [error, setError] = useState('');

  // Embedded auth form state
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [useDifferentAccount, setUseDifferentAccount] = useState(false);
  const [fullName, setFullName] = useState(invitedGuestName || '');
  const [email, setEmail] = useState(invitedEmail || '');
  const [password, setPassword] = useState('');
  const [copiedPreview, setCopiedPreview] = useState(false);

  const handleAcceptLoggedIn = async () => {
    setAccepting(true);
    setError('');
    const result = await acceptInvitation(token);
    if (result.error) {
      setError(result.error);
      setAccepting(false);
    } else {
      setAccepted(true);
      router.push(`/${locale}/account/profile?welcome=1`);
    }
  };

  const handleClaimWithAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccepting(true);
    setError('');

    const result = await claimInvitationWithAuthAction({
      token,
      mode: authMode,
      fullName: fullName.trim() || invitedGuestName || undefined,
      email: email.trim(),
      password,
    });

    if (result.error) {
      setError(result.error);
      setAccepting(false);
      return;
    }

    if ((result as any).requiresEmailConfirmation) {
      setRequiresEmailConfirm(true);
      setAccepting(false);
      return;
    }

    setAccepted(true);
    router.push(`/${locale}/account/profile?welcome=1`);
  };

  const handleCopyPreviewLink = async () => {
    if (typeof window === 'undefined') return;
    await navigator.clipboard.writeText(window.location.href);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2500);
  };

  const statusMessage = notFound
    ? { title: 'Invite not found', body: 'This invitation link doesn\'t exist or has been removed.' }
    : isExpired
    ? { title: 'Invite expired', body: 'This invitation was valid for 7 days. Ask your host to send a new one.' }
    : isAlreadyUsed
    ? { title: 'Already accepted', body: 'This invite link has already been used.' }
    : null;

  const showLoggedInOneClick = isLoggedIn && !isHostPreview && !useDifferentAccount;
  const inputClass =
    'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:border-[#fe04c6] outline-none transition-all';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#f9f9f9' }}>
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-10 py-7 flex items-center justify-center" style={{ background: '#111', borderBottom: '4px solid #fe04c6' }}>
          <Image src="/logo-horizontal-white.png" alt="Back Pocket Mysteries" width={200} height={40} className="h-8 w-auto object-contain" />
        </div>

        <div className="p-8 sm:p-10">
          {statusMessage ? (
            /* Invalid state */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400" style={{ background: '#f9f9f9' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">{statusMessage.title}</h1>
              <p className="text-slate-500 font-medium mb-8">{statusMessage.body}</p>
              <Link href={`/${locale}/account/profile`} className="text-sm font-bold" style={{ color: '#fe04c6' }}>← Go to My Roster</Link>
            </div>
          ) : requiresEmailConfirm ? (
            /* Email confirmation required state */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white" style={{ background: '#fe04c6' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">Check your email!</h1>
              <p className="text-slate-500 font-medium mb-8">
                We sent a quick confirmation link to <strong>{email}</strong>. Once confirmed, you&apos;ll be automatically linked to <strong>{hostName}</strong>&apos;s mystery roster!
              </p>
              <Link href={`/${locale}/login`} className="block w-full py-4 text-center rounded-xl font-black text-white transition-all" style={{ background: '#fe04c6' }}>
                Go to Sign In →
              </Link>
            </div>
          ) : accepted ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white" style={{ background: '#10b981' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">You&apos;re on the list!</h1>
              <p className="text-slate-500 font-medium mb-8">
                You&apos;re now linked to <strong>{hostName}</strong>&apos;s guest roster. Taking you to your profile so you can customize your avatar, accent, and quirks...
              </p>
              <Link href={`/${locale}/account/profile?welcome=1`} className="block w-full py-4 text-center rounded-xl font-black text-white transition-all" style={{ background: '#fe04c6' }}>
                Customize My Avatar & Profile →
              </Link>
            </div>
          ) : (
            /* Valid invite — main state */
            <div>
              {isHostPreview && (
                <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/80">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                      👋 Host Preview Mode
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPreviewLink}
                      className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-200 text-amber-950 transition-colors"
                    >
                      {copiedPreview ? '✓ Link Copied' : '🔗 Copy Link'}
                    </button>
                  </div>
                  <p className="text-xs text-amber-900/80 font-medium leading-relaxed">
                    This is the link to text to <strong>{invitedGuestName || 'your friend'}</strong>. Since you&apos;re signed in as the host, you can preview their claim screen below.
                  </p>
                </div>
              )}

              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#fe04c6' }}>
                {invitedGuestName ? `Hey ${invitedGuestName} — You're Invited!` : "You're Invited"}
              </p>
              <h1 className="text-2xl font-black text-slate-900 mb-3 leading-tight">
                {hostName} wants you on their mystery roster.
              </h1>

              {personalNote && (
                <div className="mb-5 p-4 rounded-xl text-sm italic text-slate-600 font-medium" style={{ background: 'rgba(254,4,198,0.05)', borderLeft: '3px solid #fe04c6' }}>
                  &ldquo;{personalNote}&rdquo;
                  <span className="block mt-1.5 text-xs font-black not-italic" style={{ color: '#fe04c6' }}>— {hostName}</span>
                </div>
              )}

              <p className="text-slate-500 font-medium text-sm mb-6 leading-relaxed">
                {invitedGuestName
                  ? `Claim your spot on ${hostName}'s roster to customize your own character avatar, accent, and quirks for upcoming mystery nights.`
                  : `Create your free player profile to customize your avatar, accent, and quirks for ${hostName}'s upcoming mystery nights.`}
              </p>

              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
                  {error}
                </div>
              )}

              {showLoggedInOneClick ? (
                /* Already logged in as a guest user: 1-click accept */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{currentUserEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseDifferentAccount(true)}
                      className="text-xs font-bold hover:underline flex-shrink-0 ml-3"
                      style={{ color: '#fe04c6' }}
                    >
                      Switch account
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAcceptLoggedIn}
                    disabled={accepting}
                    className="block w-full py-4 text-center rounded-xl font-black text-white shadow-lg transition-all disabled:opacity-50"
                    style={{ background: '#fe04c6' }}
                  >
                    {accepting ? 'Joining Roster...' : `Accept & Join ${hostName}'s Roster →`}
                  </button>
                </div>
              ) : (
                /* Seamless 1-step Claim Form (Create Account or Sign In right here!) */
                <div>
                  {/* Mode Tabs */}
                  <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-5">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setError(''); }}
                      className={`py-2.5 text-xs font-black rounded-lg transition-all ${
                        authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      New Player
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setError(''); }}
                      className={`py-2.5 text-xs font-black rounded-lg transition-all ${
                        authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Already Have an Account
                    </button>
                  </div>

                  <form onSubmit={handleClaimWithAuth} className="space-y-3.5">
                    {authMode === 'signup' && (
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="e.g. Alex"
                          className={inputClass}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        {authMode === 'signup' ? 'Create a Password' : 'Password'}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={authMode === 'signup' ? 'At least 6 characters' : '••••••••'}
                        className={inputClass}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={accepting}
                      className="w-full py-4 mt-2 text-center rounded-xl font-black text-white shadow-lg transition-all disabled:opacity-50"
                      style={{ background: '#fe04c6' }}
                    >
                      {accepting
                        ? 'Joining Roster...'
                        : authMode === 'signup'
                        ? `Claim Profile & Join ${hostName}'s Roster →`
                        : `Sign In & Join ${hostName}'s Roster →`}
                    </button>
                  </form>
                </div>
              )}

              <p className="text-xs text-slate-300 text-center mt-6">
                 Takes 30 seconds · Customize your avatar right after joining
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
