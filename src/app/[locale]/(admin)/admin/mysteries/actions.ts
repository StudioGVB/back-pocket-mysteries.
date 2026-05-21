'use server';

import { revalidatePath } from 'next/cache';
import { createMysteryAction } from '../../../(builder)/builder/mysteries/actions';

// Re-export the builder action so admin components can call it directly
export { createMysteryAction };

export async function archiveMysteryAction(id: string) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { error } = await supabase
      .from('mysteries')
      .update({ status: 'archived' })
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/admin/mysteries');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
