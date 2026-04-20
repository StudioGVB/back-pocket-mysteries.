import React from 'react';
import Link from 'next/link';

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const orders: any[] = [
    // Placeholder for now, will eventually come from the database
    // { id: 'ORD-123', date: '2024-04-10', title: 'The Gilded Age Murder', status: 'ready', price: '£29.99' }
  ];

  return (
    <div className="container mx-auto px-6 max-w-5xl">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-2">My Stories</h1>
        <p className="text-slate-500 font-medium text-lg">Your collection of "Back Pocket" mysteries.</p>
      </div>

      {orders.length > 0 ? (
        <div className="grid gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] flex items-center justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-brand-pink/5 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🎭
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{order.title}</h3>
                  <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span>Order #{order.id}</span>
                    <span>•</span>
                    <span>Purchased {order.date}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {order.status}
                </span>
                <Link href={`/account/downloads/${order.id}`} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-brand-pink transition-all shadow-lg active:scale-95">
                  Play Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl mb-8 animate-bounce">
            ✨
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">No stories yet!</h3>
          <p className="text-slate-500 font-medium max-w-md mb-10">
            You haven't purchased any mysteries yet. Head over to our collection to find your first adventure.
          </p>
          <Link href="/mysteries" className="px-12 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-dark transition-all shadow-2xl shadow-brand-pink/20 hover:translate-y-[-4px] active:scale-95">
            Browse Mysteries
          </Link>
        </div>
      )}
    </div>
  );
}
