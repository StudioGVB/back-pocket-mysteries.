import React, { Suspense } from 'react';
import Link from 'next/link';
import { getTransactions } from '@/services/admin';
import { refundOrderAction } from './actions';
import { formatDate } from '@/utils/date';
import { getUserDisplayAvatarUrl } from '@/utils/avatar';

export const unstable_instant = false;

export default async function AdminTransactions({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">Transactions &amp; Purchased Mystery Packs</h2>
          <p className="text-gray-500 text-sm font-medium">Click into any purchased mystery to inspect its 4-Gate AI QA report and the exact mystery pack generated for the customer</p>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/${locale}/admin/balance-sheet`}
            className="px-6 py-3 bg-brand-pink text-white rounded-full text-xs font-black uppercase tracking-widest hover:opacity-95 transition-all"
          >
            Income vs. Tax Balance Sheet →
          </Link>
        </div>
      </div>

      <Suspense fallback={<AdminTransactionsSkeleton />}>
        <AdminTransactionsList locale={locale} />
      </Suspense>
    </div>
  );
}

async function AdminTransactionsList({ locale }: { locale: string }) {
  const transactions: any[] = await getTransactions();

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mystery Pack</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">QA &amp; Pack Status</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Payment</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.length > 0 ? (
            transactions.map((item, i) => {
              const mysteryId = item.mystery_id || item.mysteries?.id;
              const qa = item.qaReport;
              const healedCount =
                (qa?.portraitsRegenerated || 0) +
                (qa?.visualCluesRegenerated || 0) +
                (qa?.audioCluesRegenerated || 0) +
                (qa?.textIssuesRepaired || 0);

              return (
                <tr key={item.id || i} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-5">
                    <p className="text-xs font-black text-brand-dark font-mono">
                      {String(item.id || '').slice(0, 8).toUpperCase()}
                    </p>
                    {item.pin && (
                      <span className="text-[10px] font-bold text-gray-400">
                        PIN: {item.pin}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getUserDisplayAvatarUrl({
                          id: item.user_id || item.id,
                          ...item.profiles,
                        })}
                        alt={item.profiles?.full_name || 'Guest'}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200 bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        {item.user_id ? (
                          <Link
                            href={`/${locale}/admin/users/${item.user_id}`}
                            className="text-sm font-bold text-brand-dark hover:text-brand-pink transition-colors block truncate"
                          >
                            {item.profiles?.full_name || 'Guest'}
                          </Link>
                        ) : (
                          <p className="text-sm font-bold text-brand-dark truncate">
                            {item.profiles?.full_name || 'Guest'}
                          </p>
                        )}
                        {item.profiles?.email && (
                          <p className="text-[11px] text-gray-400 font-medium truncate max-w-[180px]">
                            {item.profiles.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {mysteryId ? (
                      <Link
                        href={`/${locale}/admin/transactions/${mysteryId}`}
                        className="text-sm font-black text-slate-900 hover:text-brand-pink transition-colors underline decoration-slate-200 hover:decoration-brand-pink"
                      >
                        {item.mysteries?.title || 'Custom Mystery Pack'}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-slate-600">
                        {item.mysteries?.title || 'Unknown'}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-start gap-1">
                      {qa ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            qa.overallScore >= 82
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          🛡️ QA {qa.overallScore}/100 {qa.overallScore >= 82 ? '• Passed' : '• Review'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
                          {item.generationStatus === 'generating'
                            ? `⏳ Generating (${item.generationProgress || 20}%)`
                            : '🛡️ Ready to Inspect'}
                        </span>
                      )}
                      {healedCount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600">
                          ⚡ Self-healed {healedCount} asset{healedCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs text-gray-500 font-medium">
                      {formatDate(item.created_at)}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    {(() => {
                      const rawAmt = Number(item.amount) || 0;
                      const major = rawAmt > 100 ? rawAmt / 100 : rawAmt;
                      const curr = String(item.currency || 'GBP').toUpperCase();
                      const fxToGbp: Record<string, number> = {
                        GBP: 1,
                        USD: 0.79,
                        EUR: 0.86,
                        AUD: 0.52,
                        CAD: 0.57,
                        NZD: 0.47,
                      };
                      const gbpVal = major * (fxToGbp[curr] ?? 1);
                      return (
                        <div>
                          <p className="text-sm font-black text-brand-dark">
                            {new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: 'GBP',
                            }).format(gbpVal)}
                          </p>
                          {curr !== 'GBP' && (
                            <p className="text-[10px] font-bold text-gray-400">
                              ({major} {curr})
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        item.status === 'succeeded' || item.status === 'qa_verified'
                          ? 'bg-green-100 text-green-600'
                          : item.status === 'pending'
                          ? 'bg-amber-100 text-amber-600'
                          : item.status === 'refunded'
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {item.status === 'qa_verified' ? 'Verified' : item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {mysteryId && (
                        <Link
                          href={`/${locale}/admin/transactions/${mysteryId}`}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                        >
                          🔍 Inspect Pack &amp; QA →
                        </Link>
                      )}
                      {item.status !== 'refunded' && item.status !== 'qa_verified' && (
                        <form action={refundOrderAction.bind(null, item.id)}>
                          <button className="px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                            Refund
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={8} className="px-8 py-20 text-center">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                  No transactions found
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AdminTransactionsSkeleton() {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden h-96 animate-pulse">
      <div className="h-12 bg-slate-50 border-b border-gray-100 w-full"></div>
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center h-8">
            <div className="h-4 bg-slate-100 rounded w-24"></div>
            <div className="h-4 bg-slate-100 rounded w-24"></div>
            <div className="h-4 bg-slate-100 rounded w-32"></div>
            <div className="h-4 bg-slate-100 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
