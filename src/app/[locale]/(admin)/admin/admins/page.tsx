import React, { Suspense } from 'react';
import { getAdmins } from '../admin-data';
import { AdminInviteForm } from './AdminInviteForm';

export const unstable_instant = false;

export default async function AdminSuperAdminsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
            Super <span className="text-brand-pink italic">Admins</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Manage users with backend access
          </p>
        </div>
        <Suspense fallback={<div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm w-32 h-[52px] animate-pulse"></div>}>
          <AdminCount />
        </Suspense>
      </div>

      {/* Add Admin CTA */}
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
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Admins</p>
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
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Admin</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Role</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Permissions</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {admins.length > 0 ? (
            admins.map((admin: any) => (
              <tr key={admin.id} className="hover:bg-gray-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center text-xs font-black uppercase">
                      {(admin.full_name || 'A')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-brand-dark tracking-tight">{admin.full_name || 'Admin User'}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">ID: {admin.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-brand-dark text-white text-[9px] font-black uppercase tracking-widest rounded-full italic">
                    {admin.user_roles[0]?.role || 'Admin'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500" title="Full Access"></span>
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Access</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors">Revoke Access</button>
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
      <div className="h-16 bg-gray-50/50 border-b border-gray-100 w-full"></div>
      <div className="p-8 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between items-center h-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-24"></div>
                <div className="h-3 bg-slate-100 rounded w-16"></div>
              </div>
            </div>
            <div className="w-16 h-6 bg-slate-100 rounded-full"></div>
            <div className="w-24 h-4 bg-slate-100 rounded"></div>
            <div className="w-24 h-4 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
