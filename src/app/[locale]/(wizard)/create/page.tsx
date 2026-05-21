import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { redirect } from 'next/navigation';
import WizardClient from './WizardClient';
import { Locale } from '@/lib/i18n-config';

export default async function CreateWizardPage(props: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  const theme = typeof searchParams.theme === 'string' ? searchParams.theme : undefined;
  const complexity = typeof searchParams.complexity === 'string' ? searchParams.complexity : undefined;
  const pro = searchParams.pro === 'true' || searchParams.pro === '1' || undefined;
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
    // Retain full search params on redirect
    const query = new URLSearchParams();
    if (theme) query.set('theme', theme);
    if (complexity) query.set('complexity', complexity);
    if (pro) query.set('pro', 'true');
    const queryString = query.toString();
    const nextPath = `/${locale}/create${queryString ? `?${queryString}` : ''}`;
    redirect(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
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
      initialTheme={theme}
      initialComplexity={complexity}
      initialPro={pro}
    />
  );
}
