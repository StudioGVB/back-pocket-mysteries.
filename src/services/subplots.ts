import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database';

type Subplot = Database['public']['Tables']['subplots']['Row'];
type SubplotBeat = Database['public']['Tables']['subplot_beats']['Row'];

/**
 * Fetch all subplots for a specific mystery, including their beats
 */
export async function getSubplotsByMysteryId(mysteryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subplots')
    .select(`
      *,
      subplot_beats (*)
    `)
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching subplots:', error);
    return [];
  }
  return data || [];
}

/**
 * Create a new Subplot
 */
export async function createSubplot(
  mysteryId: string, 
  title: string, 
  primaryCharacterId: string, 
  secondaryCharacterId?: string,
  theme?: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subplots')
    .insert({
      mystery_id: mysteryId,
      title,
      primary_character_id: primaryCharacterId,
      secondary_character_id: secondaryCharacterId || null,
      theme: theme || null
    })
    .select()
    .single();

  if (error) throw error;

  // Initialize the 3 default beats
  const beats = [
    { subplot_id: data.id, beat_number: 1, description: 'Beat 1: The Incident' },
    { subplot_id: data.id, beat_number: 2, description: 'Beat 2: The Escalation' },
    { subplot_id: data.id, beat_number: 3, description: 'Beat 3: The Resolution' }
  ];

  const { error: beatsError } = await supabase
    .from('subplot_beats')
    .insert(beats);

  if (beatsError) throw beatsError;
  return data;
}

/**
 * Update an existing Subplot
 */
export async function updateSubplot(id: string, updates: Partial<Subplot>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subplots')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a Subplot
 */
export async function deleteSubplot(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('subplots')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Update a specific subplot beat (the text of the underlying beat)
 */
export async function updateSubplotBeat(beatId: string, updates: Partial<SubplotBeat>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subplot_beats')
    .update(updates)
    .eq('id', beatId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
