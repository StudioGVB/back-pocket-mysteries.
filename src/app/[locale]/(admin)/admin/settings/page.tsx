import React, { Suspense } from 'react';
import {
  getPlatformSettingsAction,
  getIntegrationHealthAction,
} from '@/app/actions/platform-settings';
import { AdminSettingsClient } from '@/components/admin/AdminSettingsClient';
import { getAdmins } from '../admin-data';
import { AdminInviteForm } from '../admins/AdminInviteForm';
import { getUserDisplayAvatarUrl } from '@/utils/avatar';

export const unstable_instant = false;

export default async function AdminSettingsPage() {
  return (
    <div className="space-y-12">
      <Suspense
        fallback={
          <div className="bg-white h-96 rounded-[32px] border border-gray-100 animate-pulse" />
        }
      >
        <PlatformSettingsContent />
      </Suspense>

      {/* Super Admins Section living inside Settings */}
      <section className="space-y-6 pt-8 border-t border-gray-200/80">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-2">
              Super <span className="text-brand-pink italic">Admins</span>
            </h2>
            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
              Manage users with full internal admin &amp; mystery builder access
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

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Admin
            </th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Role
            </th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Permissions
            </th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {admins.length > 0 ? (
            admins.map((admin: any) => (
              <tr key={admin.id} className="hover:bg-gray-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getUserDisplayAvatarUrl(admin)}
                      alt={admin.full_name || 'Admin'}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-slate-100 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-black text-brand-dark tracking-tight">
                        {admin.full_name || 'Admin User'}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">
                        ID: {admin.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-brand-dark text-white text-[9px] font-black uppercase tracking-widest rounded-full italic">
                    {admin.user_roles?.[0]?.role || 'Admin'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex gap-2 items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500" title="Full Access" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Full Access
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors">
                    Revoke Access
                  </button>
                </td>
              </tr>
            ))
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
  );
}

function AdminListSkeleton() {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden h-96 animate-pulse">
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

