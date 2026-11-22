import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { EmailVerificationBanner } from '@/components/account/EmailVerificationBanner';
import { createClient } from '@/utils/supabase/server';
import { OnboardingWizard } from '@/components/account/OnboardingWizard';
import CopyrightYear from '@/components/marketing/CopyrightYear';

export const unstable_instant = false;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await params;

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: '#f4f0f7' }}>
      <Suspense fallback={<div className="hidden md:block w-72 flex-shrink-0" />}>
        <ServiceSidebarAndWizardLoader />
      </Suspense>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Suspense fallback={null}>
          <ServiceBannerLoader />
        </Suspense>

        <main className="flex-grow p-4 sm:p-6 lg:p-10 w-full max-w-6xl mx-auto">
          <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-3xl" />}>
            {children}
          </Suspense>
        </main>

        <footer className="border-t border-white/60 py-6 sm:py-8" style={{ background: 'rgba(255,255,255,0.4)' }}>
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <p className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">
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
      <AccountSidebar user={userData} />
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

