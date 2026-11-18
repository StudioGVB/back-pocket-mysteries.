// @ts-nocheck
'use server';

import { revalidatePath } from 'next/cache';
import { submitEmailLead } from '@/app/actions/marketing';

export type SubscribeState = {
  success?: boolean;
  vipRank?: number;
  qualifiesForFreeMystery?: boolean;
  spotsRemaining?: number;
  error?: string;
};

export async function subscribeToNewsletter(
  prevState: SubscribeState | null,
  formData: FormData
): Promise<SubscribeState> {
  const email = (formData.get('email') as string || '').trim();
  const fullName = (formData.get('full_name') as string || '').trim();

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  const res = await submitEmailLead(email, fullName || undefined, 'blog_newsletter');
  if (!res.success) {
    return { error: res.error || 'Something went wrong. Please try again later.' };
  }

  revalidatePath('/', 'layout');
  return {
    success: true,
    vipRank: res.vipRank,
    qualifiesForFreeMystery: res.qualifiesForFreeMystery,
    spotsRemaining: res.spotsRemaining,
  };
}
