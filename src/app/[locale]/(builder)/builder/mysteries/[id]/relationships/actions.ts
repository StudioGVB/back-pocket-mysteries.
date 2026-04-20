'use server';

import { revalidatePath } from 'next/cache';
import { upsertRelationship, deleteRelationship } from '@/services/relationships';

export async function upsertRelationshipAction(mysteryId: string, relationship: any) {
  try {
    await upsertRelationship({
      ...relationship,
      mystery_id: mysteryId
    });
    revalidatePath(`/builder/mysteries/${mysteryId}/relationships`);
  } catch (error) {
    console.error('Action Error: upsertRelationshipAction', error);
    throw error;
  }
}

export async function removeRelationshipAction(mysteryId: string, relationshipId: string) {
  try {
    await deleteRelationship(relationshipId);
    revalidatePath(`/builder/mysteries/${mysteryId}/relationships`);
  } catch (error) {
    console.error('Action Error: removeRelationshipAction', error);
    throw error;
  }
}
