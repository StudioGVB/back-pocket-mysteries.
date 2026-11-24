'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserDisplayAvatarUrl } from '@/utils/avatar';
import {
  revokeSuperAdminAccessAction,
  resendSuperAdminInviteEmailAction,
} from '../admin-data';

export function AdminListTableClient({ admins }: { admins: any[] }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleRevoke = async (admin: any) => {
    const label = admin.email || admin.full_name || admin.id;
    if (!window.confirm(`Revoke Super Admin access for ${label}?`)) {
      return;
    }

    const key = `revoke-${admin.id}-${admin.email || ''}`;
    setBusyKey(key);
    setFeedback(null);
    try {
      const res = await revokeSuperAdminAccessAction({
        userId: admin.id,
        email: admin.email,
      });
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Could not revoke access.' });
      } else {
        setFeedback({ type: 'success', text: res.message || 'Super Admin access revoked.' });
        router.refresh();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Error revoking access.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleResendInvite = async (email: string) => {
    if (!email) return;
    const key = `resend-${email}`;
    setBusyKey(key);
    setFeedback(null);
    try {
      const res = await resendSuperAdminInviteEmailAction(email);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Could not resend email.' });
      } else {
        setFeedback({ type: 'success', text: res.message || `Invitation email resent to ${email}.` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Error resending invite.' });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[10px] font-black uppercase tracking-wider underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Super Admin / Email
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Role
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Status &amp; Permissions
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {admins.length > 0 ? (
              admins.map((admin: any) => {
                const isPending = Boolean(admin.isPendingInvite);
                const isProtected = Boolean(admin.isProtectedOwner);
                const revokeKey = `revoke-${admin.id}-${admin.email || ''}`;
                const resendKey = `resend-${admin.email || ''}`;

                return (
                  <tr key={`${admin.id}-${admin.email || ''}`} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getUserDisplayAvatarUrl(admin)}
                          alt={admin.full_name || 'Admin'}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-slate-100 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-brand-dark tracking-tight">
                              {admin.full_name || admin.email || 'Super Admin'}
                            </p>
                            {isProtected && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-widest">
                                Primary Owner
                              </span>
                            )}
                          </div>
                          {admin.email ? (
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              {admin.email}
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">
                              ID: {String(admin.id).slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-brand-dark text-white text-[9px] font-black uppercase tracking-widest rounded-full italic">
                        {admin.user_roles?.[0]?.role || 'Superadmin'}
                      </span>
                    </td>

                    <td className="px-8 py-6">
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                            title="Invited — Pre-Authorized for Super Admin on First Login"
                          />
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                            Invited (Pre-Authorized on Sign-In)
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <span className="w-2 h-2 rounded-full bg-green-500" title="Full Access" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Active • Full Access
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="inline-flex items-center gap-3">
                        {admin.email && (
                          <button
                            type="button"
                            disabled={busyKey === resendKey}
                            onClick={() => handleResendInvite(admin.email)}
                            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                          >
                            {busyKey === resendKey ? 'Sending...' : 'Resend Invite'}
                          </button>
                        )}
                        {!isProtected ? (
                          <button
                            type="button"
                            disabled={busyKey === revokeKey}
                            onClick={() => handleRevoke(admin)}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            {busyKey === revokeKey ? 'Revoking...' : 'Revoke Access'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
                            Protected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold">
                  No super admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
