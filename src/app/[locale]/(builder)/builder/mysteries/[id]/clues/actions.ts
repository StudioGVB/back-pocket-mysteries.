'use server';

import { revalidatePath } from 'next/cache';
import { createClue, updateClue, deleteClue } from '@/services/mysteries';
import { requireAdmin } from '@/utils/admin-auth';

export async function addClueAction(mysteryId: string, formData: FormData) {
  await requireAdmin();

  const title = (formData.get('title') as string) || 'New Evidence';
  const beatSelection = formData.get('linked_beat') as string;
  
  let linked_plot_beat_id = null;
  let linked_subplot_beat_id = null;
  if (beatSelection && beatSelection.startsWith('main_')) {
    linked_plot_beat_id = beatSelection.replace('main_', '');
  } else if (beatSelection && beatSelection.startsWith('sub_')) {
    linked_subplot_beat_id = beatSelection.replace('sub_', '');
  }

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
  revalidatePath('/', 'layout');
  return { success: true, clueId: newClue.id };
}

export async function updateClueAction(mysteryId: string, id: string, updates: any) {
  await requireAdmin();
  await updateClue(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
  revalidatePath('/', 'layout');
}

export async function removeClueAction(mysteryId: string, id: string) {
  await requireAdmin();
  await deleteClue(id);
  revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
  revalidatePath('/', 'layout');
}
