'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  acceptHostTransferAction,
  declineHostTransferAction,
} from '@/app/actions/customer-mystery';
import { StoredPendingHostTransfer } from '@/lib/live-session-store';

export default function IncomingHostTransferBanner({
  transfers,
  locale,
}: {
  transfers: StoredPendingHostTransfer[];
  locale: string;
}) {
  const router = useRouter();
  const [processingToken, setProcessingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!transfers || transfers.length === 0) return null;

  const handleAccept = async (tr: StoredPendingHostTransfer) => {
    setError(null);
    setProcessingToken(tr.token);
    try {
      const res = await acceptHostTransferAction({
        mysteryId: tr.mysteryId,
        token: tr.token,
        locale,
      });
      if (!res.success) {
        setError(res.error || 'Could not accept transfer.');
      } else {
        router.replace(`/${locale}/account/orders`);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Could not accept transfer.');
    } finally {
      setProcessingToken(null);
    }
  };

  const handleDecline = async (tr: StoredPendingHostTransfer) => {
    setError(null);
    setProcessingToken(tr.token);
    try {
      await declineHostTransferAction({
        mysteryId: tr.mysteryId,
        token: tr.token,
        locale,
      });
      router.replace(`/${locale}/account/orders`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Could not decline transfer.');
    } finally {
      setProcessingToken(null);
    }
  };

  return (
    <div className="mb-8 space-y-4">
      {transfers.map((tr) => {
        const isBusy = processingToken === tr.token;
        return (
          <div
            key={tr.token}
            className="rounded-[2.25rem] bg-gradient-to-br from-slate-900 via-brand-dark to-slate-900 text-white border-2 border-brand-pink p-6 sm:p-8 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6"
          >
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                🎭 Incoming Host Ownership Invite
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Become the Host of &ldquo;{tr.mysteryTitle}&rdquo;
              </h3>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                <strong className="text-white">{tr.fromName}</strong>
                {tr.fromEmail ? ` (${tr.fromEmail})` : ''} wants to transfer Host ownership of this custom murder mystery package to your account. Once you accept, it will move into your{' '}
                <strong className="text-white">My Mysteries</strong> library with full access to the Pre-Party Ready Hub and Live Host Controls.
              </p>
              {error && (
                <p className="text-xs font-bold text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleAccept(tr)}
                className="px-7 py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl hover:opacity-95 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                }}
              >
                {isBusy ? 'Transferring...' : '✓ Accept & Become Host'}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleDecline(tr)}
                className="px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                ✕ Decline
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
