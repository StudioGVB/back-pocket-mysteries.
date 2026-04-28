'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createClue, updateClue, deleteClue } from '@/services/mysteries';

export async function addClueAction(mysteryId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized - your session may have expired.');

  // Application-level security: Verify user owns the mystery
  const { data: mystery } = await supabase.from('mysteries').select('created_by').eq('id', mysteryId).single();
  if (!mystery || mystery.created_by !== user.id) {
    throw new Error('Unauthorized - you do not own this mystery.');
  }

  require('fs').appendFileSync('actions_log.txt', new Date().toISOString() + ' User attempting insert: ' + user.id + '\n');
  const title = formData.get('title') as string || 'New Evidence';
  const beatSelection = formData.get('linked_beat') as string;
  
  let linked_plot_beat_id = null;
  let linked_subplot_beat_id = null;
  if (beatSelection && beatSelection.startsWith('main_')) {
    linked_plot_beat_id = beatSelection.replace('main_', '');
  } else if (beatSelection && beatSelection.startsWith('sub_')) {
    linked_subplot_beat_id = beatSelection.replace('sub_', '');
  }

  try {
    const newClue = await createClue({
      mystery_id: mysteryId,
      title,
      clue_type: 'physical',
      evidence_status: 'real',
      is_essential: false,
      linked_plot_beat_id,
      linked_subplot_beat_id,
    });

    revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
    return { success: true, clueId: newClue.id };
  } catch (err: any) {
    require('fs').appendFileSync('actions_log.txt', new Date().toISOString() + ' ERROR in addClueAction: ' + err.message + '\n');
    throw err;
  }
}

export async function updateClueAction(mysteryId: string, id: string, updates: any) {
  await updateClue(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
}

export async function removeClueAction(mysteryId: string, id: string) {
  await deleteClue(id);
  revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
}
