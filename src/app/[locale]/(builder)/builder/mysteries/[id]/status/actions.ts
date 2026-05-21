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
  const sale_enabled = formData.get('sale_enabled') === 'true';
  const sale_label = formData.get('sale_label') as string | null;
  const sale_discount_pct = formData.get('sale_discount_pct')
    ? Number(formData.get('sale_discount_pct'))
    : null;
  const sale_ends_at = formData.get('sale_ends_at') as string | null;

  const { error } = await supabase
    .from('mysteries')
    .update({
      status: status as any,
      sale_enabled: sale_enabled,
      sale_label: sale_label || null,
      sale_discount_pct: sale_discount_pct,
      sale_ends_at: sale_ends_at || null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', mysteryId);

  if (error) {
    // If sale columns don't exist yet, fall back to just updating status
    const { error: fallbackError } = await supabase
      .from('mysteries')
      .update({
        status: status as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mysteryId);

    if (fallbackError) return { error: fallbackError.message };
  }

  revalidatePath(`/builder/mysteries/${mysteryId}/status`);
  return { success: true };
}
