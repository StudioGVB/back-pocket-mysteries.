import React from 'react';
import Link from 'next/link';

export default function AdminDiscountsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
            Discounts & <span className="text-brand-pink italic">Promotions</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Manage generated and manual discount codes
          </p>
        </div>
        <button className="bg-brand-pink text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-brand-pink/90 transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Discount
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 text-amber-800">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <p className="font-bold mb-1">Database Integration Pending</p>
          <p className="text-sm">Discount codes (like EARLY20-XXXX) are currently generated dynamically via the Marketing action but are not yet saved to the database. This UI is a placeholder until the discounts database table is implemented.</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden opacity-75">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Code</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Type</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Value</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Usage Limit</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="text-sm font-black text-brand-dark">EARLY20-MOCK</div>
                </td>
                <td className="px-8 py-6">
                  <div className="text-sm font-bold text-gray-500">Percentage</div>
                </td>
                <td className="px-8 py-6">
                  <div className="text-sm font-bold text-gray-500">20% off</div>
                </td>
                <td className="px-8 py-6">
                  <div className="text-sm font-medium text-gray-600">1 per customer</div>
                </td>
                <td className="px-8 py-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
