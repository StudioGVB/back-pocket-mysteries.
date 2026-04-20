import React from 'react';
import { getCustomers } from '../admin-data';
import { createClient } from '@/utils/supabase/server';

export default async function AdminUsers({
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
        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Customers</p>
          <p className="text-2xl font-black text-brand-dark">{customers.length}</p>
        </div>
      </div>

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
                <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-black uppercase">
                        {(user.full_name || 'U')[0]}
                      </div>
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
                    <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-pink transition-colors">View Profile</button>
                  </td>
                </tr>
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
    </div>
  );
}
