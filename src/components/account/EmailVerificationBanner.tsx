'use client';

import React, { useState } from 'react';
import { resendConfirmationEmail } from '@/app/actions/email-confirmation';

export function EmailVerificationBanner({ userEmail }: { userEmail: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    setError('');
    const result = await resendConfirmationEmail();
    setSending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <svg className="text-amber-500 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <path d="M12 9v4"/><path d="M12 17h.01"/>
        </svg>
        <p className="text-sm font-bold text-amber-800">
          Please verify your email address ({userEmail}) to purchase mysteries.
          {sent && <span className="text-emerald-700 ml-2">✓ Email sent! Check your inbox.</span>}
          {error && <span className="text-red-600 ml-2">{error}</span>}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {!sent && (
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-xs font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Resend Email'}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-700 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
