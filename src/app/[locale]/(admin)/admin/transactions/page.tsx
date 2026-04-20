import React from 'react';
import { getTransactions } from '@/services/admin';
import { refundOrderAction } from './actions';

export default async function AdminTransactions({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const transactions: any[] = await getTransactions();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">Transactions</h2>
          <p className="text-gray-500 text-sm font-medium">Keep track of every mystery sold and payment processed</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 border border-gray-200 text-brand-dark rounded-full text-xs font-black uppercase tracking-widest hover:border-brand-dark transition-all">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mystery</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.length > 0 ? (
              transactions.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-brand-dark">{item.id.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-brand-dark">{item.profiles?.full_name || 'Guest'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-medium text-slate-600">{item.mysteries?.title || 'Unknown'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm text-gray-500 font-medium">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-brand-dark">
                      {new Intl.NumberFormat('en-GB', { style: 'currency', currency: item.currency || 'GBP' }).format(item.amount)}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest 
                      ${item.status === 'succeeded' ? 'bg-green-100 text-green-600' : 
                        item.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                        item.status === 'refunded' ? 'bg-slate-100 text-slate-400' :
                        'bg-red-100 text-red-600'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {item.status !== 'refunded' && (
                      <form action={refundOrderAction.bind(null, item.id)}>
                        <button className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors">
                          Refund
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-8 py-20 text-center">
                   <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No transactions found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
