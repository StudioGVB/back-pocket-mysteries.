import React, { Suspense } from 'react';
import Link from 'next/link';
import { getCustomers } from '../admin-data';
import { createClient } from '@/utils/supabase/server';
import { getUserDisplayAvatarUrl } from '@/utils/avatar';
import UserRowClient from './UserRowClient';

export const unstable_instant = false;

export default async function AdminUsers({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
            Customer <span className="text-brand-pink italic">Management</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Manage your community of mystery hosts
          </p>
        </div>
        <Suspense fallback={<div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm w-32 h-[52px] animate-pulse"></div>}>
          <CustomerCount />
        </Suspense>
      </div>

      <Suspense fallback={<CustomerListSkeleton />}>
        <CustomerList params={params} />
      </Suspense>
    </div>
  );
}

async function CustomerCount() {
  const customers = await getCustomers();
  const newSignupsCount = customers.filter((c: any) => c.isNewSignup).length;
  return (
    <div className="flex items-center gap-3">
      {newSignupsCount > 0 && (
        <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            New Sign-Ups (7d)
          </p>
          <p className="text-2xl font-black text-emerald-700">+{newSignupsCount}</p>
        </div>
      )}
      <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Customers</p>
        <p className="text-2xl font-black text-brand-dark">{customers.length}</p>
      </div>
    </div>
  );
}

async function CustomerList({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { getAllCustomerCrmData } = await import('@/app/actions/admin-users');

  // Fetch customers, orders, mysteries & CRM records in parallel
  const [customers, { data: allOrders }, { data: allMysteries }, crmMap] = await Promise.all([
    getCustomers(),
    supabase.from('orders').select('user_id').eq('status', 'succeeded'),
    supabase.from('mysteries').select('created_by'),
    getAllCustomerCrmData(),
  ]);

  const orderCounts = allOrders?.reduce((acc, order) => {
    acc[order.user_id] = (acc[order.user_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const mysteryCounts = allMysteries?.reduce((acc: Record<string, number>, m: any) => {
    if (m.created_by) acc[m.created_by] = (acc[m.created_by] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Monthly Membership</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Joined Date</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Mysteries Owned</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {customers.length > 0 ? (
            customers.map((user: any) => {
              const userCrm = crmMap[user.id];
              const isMemberIn = userCrm?.membership?.isActive;
              const ownedCount = Math.max(orderCounts[user.id] || 0, mysteryCounts[user.id] || 0);

              return (
                <UserRowClient key={user.id} user={user} locale={locale}>
                  <td className={`px-8 py-6 ${user.isNewSignup ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : ''}`}>
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getUserDisplayAvatarUrl(user)}
                        alt={user.full_name || 'User'}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-slate-100 shrink-0"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-brand-dark tracking-tight">{user.full_name || 'Anonymous User'}</p>
                          {user.isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                              👤 My Account
                            </span>
                          )}
                          {user.isSuperAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black uppercase tracking-widest">
                              🛡️ Super Admin
                            </span>
                          ) : user.isAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[9px] font-black uppercase tracking-widest">
                              🛡️ Admin
                            </span>
                          ) : null}
                          {user.isNewSignup && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">
                              ✨ {user.newSignupBadge || 'New Sign-Up'}
                            </span>
                          )}
                          {userCrm?.tags?.slice(0, 2).map((t: string) => (
                            <span key={t} className="px-2 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink text-[9px] font-black uppercase tracking-widest">
                              {t}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">ID: {user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      isMemberIn ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isMemberIn ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {isMemberIn ? 'IN (Monthly)' : 'OUT'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm text-gray-400 font-bold">
                      {new Date(user.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    {user.isNewSignup && user.signupAgeLabel && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-0.5">
                        ✨ Joined {user.signupAgeLabel}
                      </p>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-black text-brand-dark">{ownedCount}</span>
                       <span className="w-2 h-2 rounded-full bg-brand-blue opacity-20"></span>
                    </div>
                  </td>
                </UserRowClient>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold">
                No customers found yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CustomerListSkeleton() {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden h-96 animate-pulse">
      <div className="h-16 bg-gray-50/50 border-b border-gray-100 w-full"></div>
      <div className="p-8 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between items-center h-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-24"></div>
                <div className="h-3 bg-slate-100 rounded w-16"></div>
              </div>
            </div>
            <div className="w-24 h-4 bg-slate-100 rounded"></div>
            <div className="w-16 h-4 bg-slate-100 rounded"></div>
            <div className="w-24 h-8 bg-slate-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
