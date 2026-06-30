'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePublishingAction(
  mysteryId: string,
  prevState: any,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const status = formData.get('status') as string;

  const { error } = await supabase
    .from('mysteries')
    .update({
      status: status as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mysteryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/builder/mysteries/${mysteryId}/status`);
  return { success: true };
}

export async function updateMysteryRoundAction(
  mysteryId: string,
  round: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('mysteries')
    .update({
      current_round: round,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', mysteryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/builder/mysteries/${mysteryId}/compile`);
  return { success: true };
}
