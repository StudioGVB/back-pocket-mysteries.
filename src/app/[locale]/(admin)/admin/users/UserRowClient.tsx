'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminDeleteCustomerAccount } from '@/app/actions/admin-users';

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

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = user.full_name || user.email || 'this customer';
    if (
      !confirm(
        `Permanently delete ${label}? This will remove their profile, guest roster, mysteries, and login access.`
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
      className="hover:bg-brand-pink/5 transition-colors group cursor-pointer"
    >
      {children}
      <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
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
              title="Delete Customer Account"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
            >
              <span>🗑️</span>
              {deleting ? '...' : 'Delete'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
