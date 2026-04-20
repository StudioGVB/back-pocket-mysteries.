'use server';

import { revalidatePath } from 'next/cache';
import { createSubplot, updateSubplot, deleteSubplot, updateSubplotBeat } from '@/services/subplots';

export async function addSubplotAction(mysteryId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const primaryCharacterId = formData.get('primary_character_id') as string;
  const secondaryCharacterId = formData.get('secondary_character_id') as string;
  const theme = formData.get('theme') as string;

  await createSubplot(mysteryId, title, primaryCharacterId, secondaryCharacterId, theme);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function updateSubplotAction(mysteryId: string, id: string, updates: any) {
  await updateSubplot(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function removeSubplotAction(mysteryId: string, id: string) {
  await deleteSubplot(id);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function updateBeatAction(mysteryId: string, beatId: string, updates: any) {
  await updateSubplotBeat(beatId, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}
