'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AutoSignInListener({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const handledRef = useRef(false);

  useEffect(() => {
    const redirectUser = async (userId: string, userEmail?: string) => {
      if (handledRef.current) return;
      handledRef.current = true;

      router.refresh();

      const nextPath = searchParams?.get('next');
      if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
        router.push(nextPath);
        return;
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      const role = ((userRole?.role as string) || '').toLowerCase();
      const isAdminByRole = ['admin', 'superadmin', 'super_admin'].includes(role);
      const isAdminByEmail = userEmail?.toLowerCase() === 'hello@studiogvb.com';
      const isAdmin = isAdminByRole || isAdminByEmail;

      if (isAdmin) {
        router.push(`/${locale}/admin`);
      } else {
        router.push(`/${locale}/account/orders`);
      }
    };

    // 1. Handle implicit hash tokens (#access_token=...&type=magiclink/signup/recovery)
    //    or ?code=... / ?token_hash=... if Supabase redirected to the Site URL or /login
    const checkUrlTokens = async () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const tokenHash = urlParams.get('token_hash');
      const type = urlParams.get('type') as any;

      const isOnAuthOrHome =
        pathname === `/${locale}` ||
        pathname === '/' ||
        pathname.includes('/login') ||
        pathname.includes('/signup');

      if (code && isOnAuthOrHome) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.session?.user) {
          await redirectUser(data.session.user.id, data.session.user.email);
          return;
        }
      }

      if (tokenHash && type && isOnAuthOrHome) {
        const { data, error } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        if (!error && data?.session?.user) {
          await redirectUser(data.session.user.id, data.session.user.email);
          return;
        }
      }

      if (hash && hash.includes('access_token=')) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await redirectUser(session.user.id, session.user.email);
        }
      }
    };

    checkUrlTokens();

    // 2. Listen for SIGNED_IN events (e.g. magic link clicked or OTP verified)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isOnAuthOrHome =
        pathname.includes('/login') ||
        pathname.includes('/signup') ||
        (typeof window !== 'undefined' && window.location.hash.includes('access_token='));

      if (event === 'SIGNED_IN' && session && isOnAuthOrHome) {
        await redirectUser(session.user.id, session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, locale, pathname, searchParams]);

  return null;
}
