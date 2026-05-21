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

export async function unarchiveMysteryAction(id: string) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { error } = await supabase
      .from('mysteries')
      .update({ status: 'draft' })
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/admin/mysteries');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMysteryAction(id: string) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    
    // Cascade delete manually to respect RLS and foreign key constraints
    await supabase.from('relationships').delete().eq('mystery_id', id);
    await supabase.from('motives').delete().eq('mystery_id', id);
    await supabase.from('clues').delete().eq('mystery_id', id);
    
    const { data: subs } = await supabase.from('subplots').select('id').eq('mystery_id', id);
    if (subs && subs.length > 0) {
      const subIds = subs.map(s => s.id);
      await supabase.from('subplot_beats').delete().in('subplot_id', subIds);
    }
    await supabase.from('subplots').delete().eq('mystery_id', id);
    await supabase.from('plot_beats').delete().eq('mystery_id', id);
    await supabase.from('characters').delete().eq('mystery_id', id);
    
    const { error } = await supabase.from('mysteries').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    
    revalidatePath('/admin/mysteries');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

