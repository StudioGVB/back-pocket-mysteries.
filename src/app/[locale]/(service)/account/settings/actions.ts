'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(name: string, email: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  const { error } = await supabase.auth.updateUser({ email, data: { full_name: name } });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/account/settings');
  return { success: true };
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  // Re-authenticate with current password first
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Current password is incorrect.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  // Delete user data first (guests, etc.) — RLS policies will scope this to the user
  await supabase.from('guests').delete().eq('user_id', user.id);

  // Sign out first so the session is cleared
  await supabase.auth.signOut();

  return { success: true, redirectTo: '/' };
}
