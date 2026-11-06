'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getPackageInfoForMaxPlayers } from '@/utils/localization';

export async function updatePublishingAction(
  mysteryId: string,
  prevState: any,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const status = formData.get('status') as string;

  if (status === 'published') {
    const [{ data: mystery }, { count: charCount }] = await Promise.all([
      supabase
        .from('mysteries')
        .select('max_players')
        .eq('id', mysteryId)
        .maybeSingle(),
      supabase
        .from('characters')
        .select('id', { count: 'exact', head: true })
        .eq('mystery_id', mysteryId),
    ]);

    const pkgInfo = getPackageInfoForMaxPlayers(mystery?.max_players);
    const actualChars = charCount ?? 0;

    if (actualChars < pkgInfo.requiredCharacters) {
      return {
        error: `Cannot publish this ${pkgInfo.label} (${pkgInfo.rangeLabel}) mystery: it requires ${pkgInfo.requiredCharacters} characters, but currently has ${actualChars}. Please add ${pkgInfo.requiredCharacters - actualChars} more character(s) before publishing.`,
      };
    }
  }

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
  revalidatePath('/', 'layout');
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
