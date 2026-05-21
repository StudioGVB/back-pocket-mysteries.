import React from 'react';
import Link from 'next/link';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { EmailVerificationBanner } from '@/components/account/EmailVerificationBanner';
import { createClient } from '@/utils/supabase/server';
import { OnboardingWizard } from '@/components/account/OnboardingWizard';

export default async function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isEmailUnverified = user && !user.email_confirmed_at;

  let avatarConfig: any = null;
  let onboardingCompleted = true;
  if (user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('avatar_config, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();
    avatarConfig = profile?.avatar_config;
    onboardingCompleted = profile?.onboarding_completed ?? true;
  }

  const userData = user ? {
    name: user.user_metadata?.full_name ?? '',
    email: user.email ?? '',
    avatar_config: avatarConfig,
  } : undefined;

  return (
    <div className="flex min-h-screen" style={{ background: '#f4f0f7' }}>
      {user && (
        <OnboardingWizard onboardingCompleted={onboardingCompleted} userName={userData?.name || ''} />
      )}
      
      {/* Fixed Sidebar */}
      <div className="hidden md:block w-72 flex-shrink-0">
        <AccountSidebar user={userData} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Email verification banner */}
        {isEmailUnverified && user.email && (
          <EmailVerificationBanner userEmail={user.email} />
        )}

        {/* Mobile Header */}
        <div className="md:hidden border-b border-slate-100 bg-white p-4 flex justify-between items-center sticky top-0 z-50">
          <Link href="/" className="font-black text-slate-900">
            Back Pocket Mysteries
          </Link>
          <button className="p-2 text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </button>
        </div>

        <main className="flex-grow p-6 lg:p-10 w-full max-w-6xl mx-auto">{children}</main>

        <footer className="border-t border-white/60 py-8" style={{ background: 'rgba(255,255,255,0.4)' }}>
          <div className="container mx-auto px-6 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} Back Pocket Games. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
