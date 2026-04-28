'use server';

import { createClient } from '@/utils/supabase/server';

export async function resendConfirmationEmail() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  if (user.email_confirmed_at) {
    return { error: 'Email is already confirmed.' };
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email!,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
