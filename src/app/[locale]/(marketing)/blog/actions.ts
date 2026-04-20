// @ts-nocheck
'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type SubscribeState = {
  success?: boolean;
  error?: string;
};

export async function subscribeToNewsletter(prevState: SubscribeState | null, formData: FormData): Promise<SubscribeState> {
  const email = formData.get('email') as string;
  const fullName = formData.get('full_name') as string;
  const consent = formData.get('marketing_consent') === 'on';

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('leads')
    .insert([
      { 
        email, 
        full_name: fullName || null, 
        marketing_consent: consent 
      }
    ]);

  if (error) {
    if (error.code === '23505') {
      return { error: 'This email is already subscribed!' };
    }
    console.error('Newsletter subscription error:', error);
    return { error: 'Something went wrong. Please try again later.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
