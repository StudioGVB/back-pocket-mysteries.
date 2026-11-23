'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  initiateHostTransferAction,
  cancelHostTransferAction,
} from '@/app/actions/customer-mystery';
import { StoredPendingHostTransfer } from '@/lib/live-session-store';

export interface CastGuestOption {
  name: string;
  roleTitle: string;
}

export default function HostTransferModalButton({
  mysteryId,
  mysteryTitle,
  locale,
  castGuests = [],
  initialPendingTransfer = null,
}: {
  mysteryId: string;
  mysteryTitle: string;
  locale: string;
  castGuests?: CastGuestOption[];
  initialPendingTransfer?: StoredPendingHostTransfer | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingTransfer, setPendingTransfer] =
    useState<StoredPendingHostTransfer | null>(initialPendingTransfer);
  const [toName, setToName] = useState(initialPendingTransfer?.toName || '');
  const [toEmail, setToEmail] = useState(initialPendingTransfer?.toEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const siteOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://backpocketmysteries.com';

  const claimUrl = pendingTransfer
    ? `${siteOrigin}/${locale}/account/orders?claimTransfer=${encodeURIComponent(
        pendingTransfer.token
      )}`
    : '';

  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await initiateHostTransferAction({
        mysteryId,
        mysteryTitle,
        toEmail,
        toName,
        locale,
      });
      if (!res.success || !res.pendingTransfer) {
        setError(res.error || 'Could not initiate Host transfer.');
      } else {
        setPendingTransfer(res.pendingTransfer);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTransfer = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await cancelHostTransferAction({ mysteryId, locale });
      if (res.success) {
        setPendingTransfer(null);
        setToName('');
        setToEmail('');
        router.refresh();
      } else {
        setError(res.error || 'Failed to cancel transfer.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyClaimLink = () => {
    if (!claimUrl) return;
    navigator.clipboard.writeText(claimUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
          pendingTransfer
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
        }`}
      >
        {pendingTransfer
          ? `⏳ Transfer Pending (${pendingTransfer.toName})`
          : '🔁 Transfer Host'}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-[2rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-2">
                  🔁 Host Ownership Hand-Off
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  Transfer Host of {mysteryTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-black text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {pendingTransfer ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <div className="text-[11px] font-black uppercase tracking-widest text-amber-800">
                    ⏳ Waiting for New Host to Accept
                  </div>
                  <p className="text-xs font-medium text-amber-900 leading-relaxed">
                    We sent a Host Transfer invite to{' '}
                    <strong>{pendingTransfer.toName}</strong> (
                    <strong>{pendingTransfer.toEmail}</strong>). You remain the active Host until they log in and click{' '}
                    <strong>Accept &amp; Become Host</strong>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Direct Transfer Claim Link (Send via Text / WhatsApp)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={claimUrl}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleCopyClaimLink}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer"
                    >
                      {copiedLink ? '✓ Copied!' : '📋 Copy Link'}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCancelTransfer}
                    className="px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Cancelling...' : '✕ Cancel Transfer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendTransfer} className="space-y-4">
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Hand off Host ownership to one of your guests.{' '}
                  <strong className="text-slate-900">
                    You keep full access until they log in and accept.
                  </strong>{' '}
                  Once accepted, this custom mystery moves into their{' '}
                  <strong>My Mysteries</strong> library and is removed from yours.
                </p>

                {castGuests.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Quick-Pick From Your Cast Guests
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {castGuests.map((cg, idx) => {
                        const isPicked =
                          toName.trim().toLowerCase() ===
                          cg.name.trim().toLowerCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setToName(cg.name)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isPicked
                                ? 'bg-brand-pink text-white border-brand-pink shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {cg.name}{' '}
                            <span className="opacity-70 text-[10px]">
                              ({cg.roleTitle})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      New Host Name
                    </label>
                    <input
                      type="text"
                      required
                      value={toName}
                      onChange={(e) => setToName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand-pink"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      New Host Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      placeholder="friend@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand-pink"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                    style={{
                      background:
                        'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                    }}
                  >
                    {isSubmitting
                      ? 'Sending Invite...'
                      : '🔁 Send Host Transfer Invite →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
