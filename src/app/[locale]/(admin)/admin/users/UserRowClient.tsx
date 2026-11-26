'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminDeleteCustomerAccount,
  adminReinstateCustomerAccount,
} from '@/app/actions/admin-users';

export default function UserRowClient({
  user,
  locale,
  children,
}: {
  user: any;
  locale: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [reinstating, setReinstating] = useState(false);

  const handleReinstateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = user.full_name || user.email || 'this customer';
    if (
      !confirm(
        `Reinstate ${label}'s account and restore all of their purchased mysteries and saved guests?`
      )
    ) {
      return;
    }
    setReinstating(true);
    const res = await adminReinstateCustomerAccount(user.id);
    setReinstating(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    router.refresh();
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = user.full_name || user.email || 'this customer';
    if (
      !confirm(
        `Permanently purge ${label} right now? This bypasses the 60-day recovery window and permanently removes their profile, guest roster, mysteries, and login access.`
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await adminDeleteCustomerAccount(user.id);
    setDeleting(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <tr
      onClick={() => router.push(`/${locale}/admin/users/${user.id}`)}
      className={`hover:bg-brand-pink/5 transition-colors group cursor-pointer ${
        user.isSoftDeleted ? 'bg-rose-50/30' : ''
      }`}
    >
      {children}
      <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {user.isSoftDeleted && (
            <button
              type="button"
              disabled={reinstating}
              onClick={handleReinstateClick}
              title="Reinstate Account & Mysteries from 60-Day Hold"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer"
            >
              <span>♻️</span>
              {reinstating ? 'Restoring...' : 'Reinstate'}
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push(`/${locale}/admin/users/${user.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-pink/10 text-brand-pink rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-pink hover:text-white transition-all shadow-sm"
          >
            View Profile
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          {!user.isSuperAdmin && !user.isCurrentUser && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteClick}
              title={
                user.isSoftDeleted
                  ? 'Hard Purge Account Immediately'
                  : 'Delete Customer Account'
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
            >
              <span>🗑️</span>
              {deleting ? '...' : user.isSoftDeleted ? 'Purge Now' : 'Delete'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

