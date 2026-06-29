import React, { Suspense } from 'react';
import Link from 'next/link';
import { getCustomers } from '../admin-data';
import { createClient } from '@/utils/supabase/server';
import { buildAvatarUrl } from '@/utils/avatar';
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
  return (
    <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Customers</p>
      <p className="text-2xl font-black text-brand-dark">{customers.length}</p>
    </div>
  );
}

async function CustomerList({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const customers = await getCustomers();
  const supabase = await createClient();

  // Fetch all orders to count mysteries per customer
  const { data: allOrders } = await supabase
    .from('orders')
    .select('user_id')
    .eq('status', 'succeeded');

  const orderCounts = allOrders?.reduce((acc, order) => {
    acc[order.user_id] = (acc[order.user_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Joined Date</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Mysteries Owned</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {customers.length > 0 ? (
            customers.map((user: any) => (
              <UserRowClient key={user.id} user={user} locale={locale}>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    {user.avatar_url || user.avatar_config ? (
                      <img 
                        src={user.avatar_url || buildAvatarUrl(user.avatar_config, user.full_name || 'User')} 
                        alt={user.full_name || 'User'}
                        className="w-10 h-10 rounded-full object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-black uppercase">
                        {(user.full_name || 'U')[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-black text-brand-dark tracking-tight">{user.full_name || 'Anonymous User'}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">ID: {user.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm text-gray-400 font-bold">
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-black text-brand-dark">{orderCounts[user.id] || 0}</span>
                     <span className="w-2 h-2 rounded-full bg-brand-blue opacity-20"></span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-brand-pink/10 text-brand-pink rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-brand-pink group-hover:text-white transition-all shadow-sm">
                    View Profile
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </td>
              </UserRowClient>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold">
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
