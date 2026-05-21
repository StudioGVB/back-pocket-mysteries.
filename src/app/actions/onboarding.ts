'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function completeOnboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to complete onboarding:', error);
    throw new Error('Failed to complete onboarding');
  }

  // Revalidate the service layout so it fetches the updated onboarding state
  revalidatePath('/', 'layout');
}
