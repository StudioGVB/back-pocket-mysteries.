import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { redirect } from 'next/navigation';
import WizardClient from './WizardClient';
import { Locale } from '@/lib/i18n-config';

export default async function CreateWizardPage(props: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await props.params;
  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/create`);
  }

  // Fetch the user's saved guests
  const { data: guests, error } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching guests:', error);
  }

  return (
    <WizardClient 
      initialGuests={guests || []} 
      locale={locale} 
      userId={user.id}
    />
  );
}
