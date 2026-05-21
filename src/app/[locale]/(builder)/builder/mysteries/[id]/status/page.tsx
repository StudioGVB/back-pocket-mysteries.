import { getMysteryById } from '@/services/mysteries';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { PublishingForm } from './PublishingForm';

interface StatusPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function StatusPage({ params }: StatusPageProps) {
  const { id } = await params;
  const mystery = await getMysteryById(id);

  if (!mystery) notFound();

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, amount, created_at, status')
    .eq('mystery_id', id)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false });

  const totalRevenue = orders?.reduce((acc, o) => acc + (o.amount || 0), 0) || 0;
  const totalPurchases = orders?.length || 0;

  const statusConfig: Record<string, { label: string; color: string; dot: string; bg: string }> = {
    draft:     { label: 'Draft',    color: 'text-slate-500',  dot: 'bg-slate-400',  bg: 'bg-slate-100' },
    published: { label: 'Live',     color: 'text-green-700',  dot: 'bg-green-400',  bg: 'bg-green-50'  },
    archived:  { label: 'Archived', color: 'text-amber-700',  dot: 'bg-amber-400',  bg: 'bg-amber-50'  },
  };
  const current = statusConfig[mystery.status] ?? statusConfig.draft;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Publishing</h1>
          <p className="text-slate-500 mt-1 font-medium">
            Manage visibility, sales, and performance for <span className="text-slate-700 font-bold">{mystery.title}</span>
          </p>
        </div>
        {/* Live status pill */}
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${current.bg}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${current.dot} ${mystery.status === 'published' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-black uppercase tracking-widest ${current.color}`}>{current.label}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Purchases</p>
          <p className="text-4xl font-black text-slate-900">{totalPurchases}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Revenue Generated</p>
          <p className="text-4xl font-black text-green-600">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Avg. Order Value</p>
          <p className="text-4xl font-black text-slate-900">
            {totalPurchases > 0 ? `$${(totalRevenue / totalPurchases).toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {/* Publishing Controls */}
      <PublishingForm mystery={mystery as any} />

      {/* Recent Purchases */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Recent Purchases</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {!orders || orders.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-slate-500 font-semibold">No purchases yet</p>
              <p className="text-slate-400 text-sm mt-1">Set your status to <strong>Live</strong> to start selling.</p>
            </div>
          ) : (
            orders.slice(0, 10).map((order) => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <p className="text-sm font-black text-green-600">${Number(order.amount).toFixed(2)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { title: 'Popularity Ranking', desc: 'See how this mystery ranks against others on the platform.' },
          { title: 'Completion Rate',    desc: 'Track how many buyers play all the way through.' },
          { title: 'Customer Reviews',   desc: 'Aggregate ratings and feedback from buyers.' },
          { title: 'Geographic Reach',   desc: 'See where in the world your mystery is being played.' },
        ].map(panel => (
          <div key={panel.title} className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center opacity-60">
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">{panel.title}</p>
            <p className="text-xs text-slate-400 mt-2">{panel.desc}</p>
            <span className="mt-3 inline-block text-[10px] font-black uppercase tracking-widest text-brand-pink border border-brand-pink/30 bg-brand-pink/5 rounded-full px-3 py-1">Coming Soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}
