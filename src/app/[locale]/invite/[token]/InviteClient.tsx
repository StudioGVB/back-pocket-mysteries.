'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { acceptInvitation } from '@/app/actions/guest-invitations';

interface InviteClientProps {
  token: string;
  locale: string;
  hostName: string;
  personalNote: string | null;
  isValid: boolean;
  isExpired: boolean;
  isAlreadyUsed: boolean;
  notFound: boolean;
}

export default function InviteClient({
  token, locale, hostName, personalNote,
  isValid, isExpired, isAlreadyUsed, notFound,
}: InviteClientProps) {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setAccepting(true);
    const result = await acceptInvitation(token);
    if (result.error) {
      setError(result.error);
      setAccepting(false);
    } else {
      setAccepted(true);
    }
  };

  const statusMessage = notFound
    ? { title: 'Invite not found', body: 'This invitation link doesn\'t exist or has been removed.' }
    : isExpired
    ? { title: 'Invite expired', body: 'This invitation was valid for 7 days. Ask your host to send a new one.' }
    : isAlreadyUsed
    ? { title: 'Already accepted', body: 'This invite link has already been used.' }
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#f9f9f9' }}>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-xl">

        {/* Header */}
        <div className="px-10 py-8 flex items-center justify-center" style={{ background: '#111', borderBottom: '4px solid #fe04c6' }}>
          <Image src="/logo-horizontal-white.png" alt="Back Pocket Mysteries" width={200} height={40} className="h-8 w-auto object-contain" />
        </div>

        <div className="p-10">
          {statusMessage ? (
            /* Invalid state */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400" style={{ background: '#f9f9f9' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">{statusMessage.title}</h1>
              <p className="text-slate-500 font-medium mb-8">{statusMessage.body}</p>
              <Link href={`/${locale}`} className="text-sm font-bold" style={{ color: '#fe04c6' }}>← Back to Home</Link>
            </div>
          ) : accepted ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white" style={{ background: '#10b981' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">You're on the list!</h1>
              <p className="text-slate-500 font-medium mb-8">
                You're now linked to <strong>{hostName}</strong>'s guest roster. Head to your profile to set your character preferences and get ready for your first mystery night.
              </p>
              <Link href={`/${locale}/account/profile`} className="block w-full py-4 text-center rounded-xl font-black text-white transition-all" style={{ background: '#fe04c6' }}>
                Build My Profile →
              </Link>
            </div>
          ) : (
            /* Valid invite — main state */
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#fe04c6' }}>You're invited</p>
              <h1 className="text-2xl font-black text-slate-900 mb-4 leading-tight">
                {hostName} wants you on their guest list.
              </h1>

              {personalNote && (
                <div className="mb-6 p-4 rounded-xl text-sm italic text-slate-600 font-medium" style={{ background: 'rgba(254,4,198,0.05)', borderLeft: '3px solid #fe04c6' }}>
                  "{personalNote}"
                  <span className="block mt-2 text-xs font-black not-italic" style={{ color: '#fe04c6' }}>— {hostName}</span>
                </div>
              )}

              <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">
                Create a free account to build your player profile — set your character preferences, dietary needs, and avatar. You'll be ready to be cast in any of their mystery nights.
              </p>

              {/* Perks */}
              <div className="space-y-3 mb-8">
                {[
                  ['Your own player profile', 'Build your avatar and set how you like to play.'],
                  ['Get cast in mysteries', 'Hosts cast you based on your preferences.'],
                  ['One account, every event', 'Be on multiple rosters with a single profile.'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(254,4,198,0.1)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{title}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-red-500 text-sm font-bold mb-4">{error}</p>}

              {/* CTAs */}
              <div className="space-y-3">
                {/* Logged-in: accept directly */}
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="block w-full py-4 text-center rounded-xl font-black text-white transition-all disabled:opacity-50"
                  style={{ background: '#fe04c6' }}
                >
                  {accepting ? 'Accepting...' : 'Accept & Join →'}
                </button>

                <Link
                  href={`/${locale}/auth/signup?invite=${token}`}
                  className="block w-full py-4 text-center rounded-xl font-black border-2 text-slate-700 transition-all hover:border-slate-300"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  Create New Account
                </Link>

                <p className="text-xs text-slate-400 text-center font-medium">
                  Already have an account?{' '}
                  <Link href={`/${locale}/auth/login?invite=${token}`} className="font-bold" style={{ color: '#fe04c6' }}>
                    Sign in instead
                  </Link>
                </p>
              </div>

              <p className="text-xs text-slate-300 text-center mt-6">This invite expires in 7 days.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
