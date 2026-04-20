import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database';

export type Relationship = Database['public']['Tables']['relationships']['Row'];
export type RelationshipInsert = Database['public']['Tables']['relationships']['Insert'];
export type RelationshipUpdate = Database['public']['Tables']['relationships']['Update'];

export async function getRelationshipsByMysteryId(mysteryId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (error) {
    console.error('Error fetching relationships:', error);
    return [];
  }

  return data;
}

export async function upsertRelationship(relationship: RelationshipInsert) {
  const supabase = await createClient();
  
  // Enforce character_a_id < character_b_id to ensure unique pairs
  const [a, b] = [relationship.character_a_id, relationship.character_b_id].sort();
  const normalizedRelationship = {
    ...relationship,
    character_a_id: a,
    character_b_id: b
  };

  const { data, error } = await supabase
    .from('relationships')
    .upsert(normalizedRelationship, {
      onConflict: 'mystery_id,character_a_id,character_b_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting relationship:', error);
    throw error;
  }

  return data;
}

export async function deleteRelationship(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting relationship:', error);
    throw error;
  }

  return true;
}
