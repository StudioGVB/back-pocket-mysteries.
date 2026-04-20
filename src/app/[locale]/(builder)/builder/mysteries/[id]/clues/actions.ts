'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createClue, updateClue, deleteClue } from '@/services/mysteries';

export async function addClueAction(mysteryId: string, formData: FormData) {
  const title = formData.get('title') as string;

  await createClue({
    mystery_id: mysteryId,
    title,
    clue_type: 'physical',
    evidence_status: 'hidden',
    is_essential: false,
  });

  revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
}

export async function updateClueAction(mysteryId: string, id: string, updates: any) {
  await updateClue(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
}

export async function removeClueAction(mysteryId: string, id: string) {
  await deleteClue(id);
  revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
}
