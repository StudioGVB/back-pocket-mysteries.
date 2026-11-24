import React, { Suspense } from 'react';
import { getAdmins } from '../admin-data';
import { AdminInviteForm } from './AdminInviteForm';
import { AdminListTableClient } from './AdminListTableClient';

export const unstable_instant = false;

export default async function AdminSuperAdminsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
            Super <span className="text-brand-pink italic">Admins</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Invite team members by email for full internal admin &amp; mystery builder access
          </p>
        </div>
        <Suspense
          fallback={
            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm w-32 h-[52px] animate-pulse" />
          }
        >
          <AdminCount />
        </Suspense>
      </div>

      {/* Add Super Admin by Email CTA */}
      <AdminInviteForm />

      <Suspense fallback={<AdminListSkeleton />}>
        <AdminList />
      </Suspense>
    </div>
  );
}

async function AdminCount() {
  const admins = await getAdmins();
  return (
    <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
        Total Admins
      </p>
      <p className="text-2xl font-black text-brand-dark">{admins.length}</p>
    </div>
  );
}

async function AdminList() {
  const admins = await getAdmins();
  return <AdminListTableClient admins={admins} />;
}

function AdminListSkeleton() {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden h-64 animate-pulse">
      <div className="h-16 bg-gray-50/50 border-b border-gray-100 w-full" />
      <div className="p-8 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between items-center h-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-24" />
                <div className="h-3 bg-slate-100 rounded w-16" />
              </div>
            </div>
            <div className="w-16 h-6 bg-slate-100 rounded-full" />
            <div className="w-24 h-4 bg-slate-100 rounded" />
            <div className="w-24 h-4 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
