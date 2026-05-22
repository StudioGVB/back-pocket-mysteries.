import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  getCustomerProfile, 
  getCustomerOrders, 
  getCustomerMysteries, 
  getCustomerGuests, 
  getCustomerAiUsage 
} from '../../admin-data';
import { CustomerDashboard } from './CustomerDashboard';
import { buildAvatarUrl } from '@/utils/avatar';

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  // Fetch all data in parallel
  const [profile, orders, mysteries, guests, aiUsage] = await Promise.all([
    getCustomerProfile(id),
    getCustomerOrders(id),
    getCustomerMysteries(id),
    getCustomerGuests(id),
    getCustomerAiUsage(id)
  ]);

  if (!profile) {
    notFound();
  }

  // Calculate LTV
  const totalLTV = orders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
  
  // Flatten linked guests
  const flatLinkedGuests = guests.linked.map((g: any) => ({
    id: g.id,
    name: g.profiles?.full_name || 'Linked Guest',
    email: g.profiles?.email,
    isLinked: true
  }));
  
  const allGuests = [...guests.manual, ...flatLinkedGuests];

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href={`/${locale}/admin/users`}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-brand-pink hover:border-brand-pink/30 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-1">
            Customer <span className="text-brand-pink italic">Profile</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            {profile.id}
          </p>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-brand-dark rounded-[32px] p-6 text-white relative overflow-hidden group shadow-xl">
          <div className="relative z-10 flex flex-col items-center text-center">
            {profile.avatar_url || profile.avatar_config ? (
              <img 
                src={profile.avatar_url || buildAvatarUrl(profile.avatar_config, profile.full_name || 'User')} 
                alt={profile.full_name || 'User'}
                className="w-20 h-20 rounded-full object-cover mb-4 border-2 border-brand-pink/30 shadow-[0_0_15px_rgba(254,4,198,0.3)] bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-pink/20 text-brand-pink flex items-center justify-center text-3xl font-black uppercase mb-4 border-2 border-brand-pink/30 shadow-[0_0_15px_rgba(254,4,198,0.3)]">
                {(profile.full_name || 'C')[0]}
              </div>
            )}
            <h3 className="text-xl font-black uppercase tracking-tight mb-1">{profile.full_name || 'Unknown'}</h3>
            <p className="text-brand-pink text-[10px] font-black uppercase tracking-widest mb-4">{profile.email}</p>
            
            <div className="w-full h-px bg-white/10 my-4"></div>
            
            <div className="w-full text-left space-y-3">
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Joined</p>
                <p className="text-xs font-medium text-gray-200">
                  {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              {profile.country && (
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Country</p>
                  <p className="text-xs font-medium text-gray-200">{profile.country}</p>
                </div>
              )}
              
              {profile.how_found_us && (
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Acquisition Source</p>
                  <p className="text-xs font-medium text-gray-200 capitalize">{profile.how_found_us.replace('_', ' ')}</p>
                </div>
              )}

              {profile.location && !profile.country && (
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Location</p>
                  <p className="text-xs font-medium text-gray-200">{profile.location}</p>
                </div>
              )}

              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Provided Review</p>
                <p className="text-xs font-medium text-gray-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-2"></span>
                  No
                </p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,85,0.15)_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
        </div>

        {/* KPIs */}
        <div className="md:col-span-3 grid grid-cols-2 gap-6">
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Lifetime Value</p>
            <p className="text-4xl font-black text-brand-dark">${(totalLTV / 100).toFixed(2)}</p>
            <p className="text-xs font-bold text-gray-400 mt-2">{orders.length} transactions</p>
          </div>
          
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Mysteries Owned</p>
            <p className="text-4xl font-black text-brand-dark">{mysteries.length}</p>
            <p className="text-xs font-bold text-gray-400 mt-2">Created or Purchased</p>
          </div>
          
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Guest Roster Size</p>
            <p className="text-4xl font-black text-brand-dark">{allGuests.length}</p>
            <p className="text-xs font-bold text-gray-400 mt-2">{guests.linked.length} connected accounts</p>
          </div>
          
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 relative z-10">AI Usage Cost</p>
            <p className="text-4xl font-black text-brand-pink relative z-10">${aiUsage.estimatedCost.toFixed(3)}</p>
            <p className="text-xs font-bold text-gray-400 mt-2 relative z-10">{aiUsage.totalTokens.toLocaleString()} tokens used</p>
            <div className="absolute right-0 bottom-0 text-brand-pink/5 text-[120px] font-black leading-none transform translate-x-4 translate-y-8 select-none">AI</div>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Section */}
      <CustomerDashboard 
        profile={profile}
        orders={orders}
        mysteries={mysteries}
        guests={allGuests}
      />
    </div>
  );
}
