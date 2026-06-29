import React, { Suspense } from 'react';
import Link from 'next/link';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { EmailVerificationBanner } from '@/components/account/EmailVerificationBanner';
import { createClient } from '@/utils/supabase/server';
import { OnboardingWizard } from '@/components/account/OnboardingWizard';
import CopyrightYear from '@/components/marketing/CopyrightYear';

export const unstable_instant = false;

export default async function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await params;

  return (
    <div className="flex min-h-screen" style={{ background: '#f4f0f7' }}>
      <Suspense fallback={<div className="hidden md:block w-72 flex-shrink-0" />}>
        <ServiceSidebarAndWizardLoader />
      </Suspense>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Suspense fallback={null}>
          <ServiceBannerLoader />
        </Suspense>

        {/* Mobile Header */}
        <div className="md:hidden border-b border-slate-100 bg-white p-4 flex justify-between items-center sticky top-0 z-50">
          <Link href="/" className="font-black text-slate-900">
            Back Pocket Mysteries
          </Link>
          <button className="p-2 text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </button>
        </div>

        <main className="flex-grow p-6 lg:p-10 w-full max-w-6xl mx-auto">
          <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-3xl" />}>
            {children}
          </Suspense>
        </main>

        <footer className="border-t border-white/60 py-8" style={{ background: 'rgba(255,255,255,0.4)' }}>
          <div className="container mx-auto px-6 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              &copy; <CopyrightYear /> Back Pocket Games. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

async function ServiceSidebarAndWizardLoader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('avatar_config, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  const userData = {
    name: user.user_metadata?.full_name ?? '',
    email: user.email ?? '',
    avatar_config: profile?.avatar_config,
  };

  return (
    <>
      <OnboardingWizard onboardingCompleted={profile?.onboarding_completed ?? true} userName={userData.name} />
      <div className="hidden md:block w-72 flex-shrink-0">
        <AccountSidebar user={userData} />
      </div>
    </>
  );
}

async function ServiceBannerLoader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !user.email_confirmed_at && user.email) {
    return <EmailVerificationBanner userEmail={user.email} />;
  }
  return null;
}

