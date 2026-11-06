import React from 'react';
import AutoSignInListener from './AutoSignInListener';
import UnifiedAuthFlow from './UnifiedAuthFlow';

export const unstable_instant = false;

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    message?: string;
    error?: string;
    next?: string;
    email?: string;
    step?: 'email' | 'login' | 'signup';
    promo?: string;
  }>;
}) {
  const { locale } = await params;
  const { message, error, next, email, step, promo } = await searchParams;

  const initialStep: 'email' | 'login' | 'signup' =
    step === 'login' || step === 'signup'
      ? step
      : email
      ? 'login'
      : 'email';

  return (
    <div>
      <AutoSignInListener locale={locale} />
      <UnifiedAuthFlow
        locale={locale}
        initialEmail={email || ''}
        initialStep={initialStep}
        initialMessage={message || ''}
        initialError={error || ''}
        next={next || ''}
        initialPromoCode={promo || ''}
      />
    </div>
  );
}
