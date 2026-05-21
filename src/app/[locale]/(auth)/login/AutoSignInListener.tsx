'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AutoSignInListener({ locale }: { locale: string }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // When the user clicks the confirmation link in their email (in the same browser),
        // this tab will automatically detect the new session and redirect them.
        router.refresh();
        
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
          
        const role = (userRole?.role as string || '').toLowerCase();
        const isAdminByRole = ['admin', 'superadmin', 'super_admin'].includes(role);
        const isAdminByEmail = session.user.email?.toLowerCase() === 'hello@studiogvb.com';
        const isAdmin = isAdminByRole || isAdminByEmail;
        
        if (isAdmin) {
          router.push(`/${locale}/admin`);
        } else {
          router.push(`/${locale}/account/orders`);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, locale]);

  return null;
}
