import React, { Suspense } from 'react';
import {
  getPlatformSettingsAction,
  getIntegrationHealthAction,
} from '@/app/actions/platform-settings';
import { AdminSettingsClient } from '@/components/admin/AdminSettingsClient';
import { getAdmins } from '../admin-data';
import { AdminInviteForm } from '../admins/AdminInviteForm';
import { AdminListTableClient } from '../admins/AdminListTableClient';

export const unstable_instant = false;

export default async function AdminSettingsPage() {
  return (
    <div className="space-y-12">
      {/* Super Admins Section (Invite by Email) */}
      <section id="super-admins" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-2">
              Super <span className="text-brand-pink italic">Admins</span>
            </h2>
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

        <AdminInviteForm />

        <Suspense fallback={<AdminListSkeleton />}>
          <AdminList />
        </Suspense>
      </section>

      <div className="pt-6 border-t border-gray-200/80">
        <Suspense
          fallback={
            <div className="bg-white h-96 rounded-[32px] border border-gray-100 animate-pulse" />
          }
        >
          <PlatformSettingsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function PlatformSettingsContent() {
  const [settings, health] = await Promise.all([
    getPlatformSettingsAction(),
    getIntegrationHealthAction(),
  ]);

  return <AdminSettingsClient initialSettings={settings} initialHealth={health} />;
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
