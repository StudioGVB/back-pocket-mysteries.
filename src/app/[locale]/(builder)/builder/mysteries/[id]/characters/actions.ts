'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createCharacter, updateCharacter, deleteCharacter } from '@/services/mysteries';

export async function addCharacterAction(mysteryId: string, formData: FormData) {
  const name = formData.get('name') as string;
  const archetype = formData.get('archetype') as string;
  const plot_role = formData.get('plot_role') as any;
  const is_mandatory = formData.get('importance') === 'mandatory';
  const is_victim = plot_role === 'victim';

  await createCharacter({
    mystery_id: mysteryId,
    name,
    archetype,
    plot_role,
    is_mandatory: is_mandatory || is_victim, // Victims are always mandatory in this system
    is_victim
  });

  revalidatePath(`/builder/mysteries/${mysteryId}/characters`);
}

export async function updateCharacterAction(mysteryId: string, id: string, updates: any) {
  await updateCharacter(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}/characters`);
}

export async function removeCharacterAction(mysteryId: string, id: string) {
  await deleteCharacter(id);
  revalidatePath(`/builder/mysteries/${mysteryId}/characters`);
}

export async function toggleVictimAction(mysteryId: string, id: string, isVictim: boolean) {
  await updateCharacter(id, { is_victim: isVictim });
  revalidatePath(`/builder/mysteries/${mysteryId}/characters`);
}

export async function addMotiveAction(mysteryId: string, characterId: string, formData: FormData) {
  const supabase = await createClient();
  const motive_type = formData.get('motive_type') as any;
  const linked_character_id = formData.get('linked_character_id') as string;
  const strength = formData.get('strength') as any;
  const notes = formData.get('notes') as string;

  const { error } = await supabase
    .from('motives')
    .insert({
      mystery_id: mysteryId,
      character_id: characterId,
      motive_type,
      linked_character_id,
      strength,
      notes
    });

  if (error) throw new Error(error.message);
  revalidatePath(`/builder/mysteries/${mysteryId}/characters`);
  revalidatePath(`/builder/mysteries/${mysteryId}/relationships`);
}

export async function removeMotiveAction(mysteryId: string, motiveId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('motives')
    .delete()
    .eq('id', motiveId);

  if (error) throw new Error(error.message);
  revalidatePath(`/builder/mysteries/${mysteryId}/characters`);
  revalidatePath(`/builder/mysteries/${mysteryId}/relationships`);
}
