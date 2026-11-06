import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  getCustomerProfile, 
  getCustomerOrders, 
  getCustomerMysteries, 
  getCustomerGuests, 
  getCustomerAiUsage,
  getGiftableCatalogMysteries
} from '../../admin-data';
import { getCustomerCrmData } from '@/app/actions/admin-users';
import { CustomerDashboard } from './CustomerDashboard';
import { buildAvatarUrl } from '@/utils/avatar';
import { EditProfileButton } from './EditProfileButton';

export const unstable_instant = false;

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  return (
    <Suspense fallback={<CustomerProfileSkeleton />}>
      <CustomerProfileContentLoader params={params} />
    </Suspense>
  );
}

async function CustomerProfileContentLoader({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  return <CustomerProfileContent id={id} locale={locale} />;
}

async function CustomerProfileContent({
  id,
  locale,
}: {
  id: string;
  locale: string;
}) {
  // Fetch all data in parallel
  const [profile, rawOrders, mysteries, guests, aiUsage, crm, catalogMysteries] = await Promise.all([
    getCustomerProfile(id),
    getCustomerOrders(id),
    getCustomerMysteries(id),
    getCustomerGuests(id),
    getCustomerAiUsage(id),
    getCustomerCrmData(id),
    getGiftableCatalogMysteries(),
  ]);

  if (!profile) {
    notFound();
  }

  // Merge DB orders with CRM customOrders and apply orderOverrides (refunds)
  const seenOrderIds = new Set<string>();
  const mergedOrders: any[] = [];

  for (const o of rawOrders) {
    seenOrderIds.add(o.id);
    const override = crm.orderOverrides?.[o.id];
    mergedOrders.push({
      ...o,
      status: override?.status || o.status,
      refundedAmountCents: override?.refundedAmountCents || 0,
      refundReason: override?.reason || null,
    });
  }

  for (const co of crm.customOrders || []) {
    if (seenOrderIds.has(co.id)) continue;
    const override = crm.orderOverrides?.[co.id];
    mergedOrders.push({
      id: co.id,
      mystery_id: co.mystery_id,
      mystery: { title: co.mystery_title },
      amount: co.amount,
      status: override?.status || co.status,
      refundedAmountCents: override?.refundedAmountCents || co.refunded_amount || 0,
      refundReason: override?.reason || co.reason || null,
      created_at: co.created_at,
    });
  }

  mergedOrders.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Calculate Net LTV (subtracting refunded cents)
  const totalLTV = mergedOrders.reduce((sum: number, o: any) => {
    if (o.status === 'refunded' || o.status === 'gifted') return sum;
    const gross = o.amount || 0;
    const refunded = o.refundedAmountCents || 0;
    return sum + Math.max(0, gross - refunded);
  }, 0);
  
  // Flatten linked guests
  const flatLinkedGuests = guests.linked.map((g: any) => ({
    id: g.id,
    name: g.profiles?.full_name || 'Linked Guest',
    email: g.profiles?.email,
    avatar_url: g.profiles?.avatar_url,
    avatar_config: g.profiles?.avatar_config,
    traits: g.profiles?.character_preferences || [],
    bio: g.profiles?.bio,
    isLinked: true
  }));
  
  const allGuests = [
    ...guests.manual.map((g: any) => ({ 
      ...g, 
      isLinked: false 
    })), 
    ...flatLinkedGuests
  ];

  const isMemberIn = crm.membership?.isActive;

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link 
            href={`/${locale}/admin/users`}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-brand-pink hover:border-brand-pink/30 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-1">
                Customer <span className="text-brand-pink italic">Profile</span>
              </h1>
              {crm.accountSuspended && (
                <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest">
                  Suspended
                </span>
              )}
            </div>
            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
              {profile.id}
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
              isMemberIn
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isMemberIn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            Monthly Membership: {isMemberIn ? 'IN (Active)' : 'OUT (Inactive)'}
          </span>

          {crm.creditBalanceUsd > 0 && (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-brand-pink/10 text-brand-pink border border-brand-pink/20">
              Store Credit: ${crm.creditBalanceUsd.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-brand-dark rounded-[32px] p-6 text-white relative overflow-hidden group shadow-xl">
          <EditProfileButton profile={profile} />
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
            <p className="text-brand-pink text-[10px] font-black uppercase tracking-widest mb-3">{profile.email}</p>

            {/* Customer CRM Tags */}
            {crm.tags && crm.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                {crm.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-black uppercase tracking-widest border border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="w-full h-px bg-white/10 my-4"></div>
            
            <div className="w-full text-left space-y-3">
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Monthly Membership</p>
                <p className="text-xs font-bold flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${isMemberIn ? 'bg-emerald-400' : 'bg-gray-500'}`}></span>
                  <span className={isMemberIn ? 'text-emerald-400' : 'text-gray-400'}>
                    {isMemberIn
                      ? `IN ($${crm.membership.monthlyRateUsd}/mo)`
                      : 'OUT (Not Enrolled)'}
                  </span>
                </p>
              </div>

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
                <p className="text-xs font-medium text-gray-300">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${crm.providedReview ? 'bg-emerald-400' : 'bg-gray-500'}`}></span>
                  {crm.providedReview ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,85,0.15)_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
        </div>

        {/* KPIs */}
        <div className="md:col-span-3 grid grid-cols-2 gap-6">
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Net Lifetime Value</p>
            <p className="text-4xl font-black text-brand-dark">${(totalLTV / 100).toFixed(2)}</p>
            <p className="text-xs font-bold text-gray-400 mt-2">
              {mergedOrders.length} transactions
              {crm.creditBalanceUsd > 0 ? ` • $${crm.creditBalanceUsd.toFixed(2)} credit` : ''}
            </p>
          </div>
          
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Mysteries Owned</p>
            <p className="text-4xl font-black text-brand-dark">{mysteries.length}</p>
            <p className="text-xs font-bold text-gray-400 mt-2">Created, Purchased, or Gifted</p>
          </div>
          
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Guest Roster Size</p>
            <p className="text-4xl font-black text-brand-dark">{allGuests.length}</p>
            <p className="text-xs font-bold text-gray-400 mt-2">{guests.linked.length} connected accounts</p>
          </div>
          
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 relative z-10">AI Usage Cost</p>
            <p className="text-4xl font-black text-brand-pink relative z-10">${aiUsage.estimatedCost.toFixed(3)}</p>
            <p className="text-xs font-bold text-gray-400 mt-2 relative z-10">
              {aiUsage.generationsCount} calls • {crm.aiQuota.aiFrozen ? 'FROZEN' : crm.aiQuota.unlimitedAi ? 'Unlimited Quota' : `${crm.aiQuota.baseImageLimit + crm.aiQuota.bonusImageCredits} img limit`}
            </p>
            <div className="absolute right-0 bottom-0 text-brand-pink/5 text-[120px] font-black leading-none transform translate-x-4 translate-y-8 select-none">AI</div>
          </div>
        </div>
      </div>

      {/* Interactive Tabs & Admin Actions Section */}
      <CustomerDashboard 
        profile={profile}
        orders={mergedOrders}
        mysteries={mysteries}
        guests={allGuests}
        crm={crm}
        catalogMysteries={catalogMysteries}
        aiUsage={aiUsage}
      />
    </div>
  );
}

function CustomerProfileSkeleton() {
  return (
    <div className="space-y-8 pb-20 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-slate-200"></div>
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-3 bg-slate-200 rounded w-32"></div>
        </div>
      </div>

      {/* Top Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-200 rounded-[32px] h-64"></div>
        <div className="md:col-span-3 grid grid-cols-2 gap-6">
          <div className="bg-slate-200 rounded-[32px] h-32"></div>
          <div className="bg-slate-200 rounded-[32px] h-32"></div>
          <div className="bg-slate-200 rounded-[32px] h-32"></div>
          <div className="bg-slate-200 rounded-[32px] h-32"></div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 h-96">
        <div className="h-6 bg-slate-200 rounded w-32 mb-6"></div>
        <div className="space-y-4">
          <div className="h-12 bg-slate-100 rounded"></div>
          <div className="h-12 bg-slate-100 rounded"></div>
        </div>
      </div>
    </div>
  );
}
