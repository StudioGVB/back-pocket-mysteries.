import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database';
import {
  cacheRelationshipsSnapshot,
  getCachedMysterySnapshot,
  getCachedRelationshipsSnapshot,
} from '@/lib/live-session-store';
import { replaceLegacyNamesWithRoleTokens } from '@/services/mysteries';
import {
  CHRISTMAS_NIGHTMARE_RELATIONSHIPS,
  isChristmasNightmareMystery,
  mapChristmasCharacterIds,
} from '@/data/christmas-nightmare';
import { cache } from 'react';
import crypto from 'crypto';

export type Relationship = Database['public']['Tables']['relationships']['Row'];
export type RelationshipInsert = Database['public']['Tables']['relationships']['Insert'];
export type RelationshipUpdate = Database['public']['Tables']['relationships']['Update'];

export const getRelationshipsByMysteryId = cache(async (mysteryId: string) => {
  const supabase = await createClient();

  // Check if this mystery is Christmas Nightmare (via cached snapshot or DB)
  let mysteryMeta: any = getCachedMysterySnapshot(mysteryId);
  if (!mysteryMeta) {
    const { data: mRow } = await supabase
      .from('mysteries')
      .select('id, title, theme, characters(id, name, is_victim, plot_role)')
      .eq('id', mysteryId)
      .maybeSingle();
    if (mRow) mysteryMeta = mRow;
  }

  if (mysteryMeta && isChristmasNightmareMystery(mysteryMeta.title, mysteryMeta.theme)) {
    const charIdMap = mapChristmasCharacterIds(mysteryMeta.characters || []);
    const canonicalRels = CHRISTMAS_NIGHTMARE_RELATIONSHIPS.map((rel) => {
      const [a, b] = [charIdMap[rel.charAKey], charIdMap[rel.charBKey]].sort();
      return {
        id: crypto
          .createHash('md5')
          .update(`${mysteryId}:${a}:${b}`)
          .digest('hex')
          .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'),
        mystery_id: mysteryId,
        character_a_id: a,
        character_b_id: b,
        know_each_other: true,
        dynamics: rel.dynamics,
        notes: rel.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const { data: existingRels } = await supabase
      .from('relationships')
      .select('*')
      .eq('mystery_id', mysteryId);

    const needsSync =
      !existingRels ||
      existingRels.length !== canonicalRels.length ||
      existingRels.some((r: any) => String(r.notes || '').includes('Tycoon') || String(r.notes || '').includes('Caretaker'));

    if (needsSync) {
      await supabase.from('relationships').delete().eq('mystery_id', mysteryId);
      const { data: inserted } = await supabase
        .from('relationships')
        .upsert(
          canonicalRels.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => rest),
          { onConflict: 'mystery_id,character_a_id,character_b_id' }
        )
        .select();
      if (inserted && inserted.length > 0) {
        cacheRelationshipsSnapshot(mysteryId, inserted);
        return inserted;
      }
    } else if (existingRels && existingRels.length > 0) {
      cacheRelationshipsSnapshot(mysteryId, existingRels);
      return existingRels;
    }

    cacheRelationshipsSnapshot(mysteryId, canonicalRels);
    return canonicalRels;
  }

  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (error || !data || data.length === 0) {
    const cached = getCachedRelationshipsSnapshot(mysteryId);
    if (cached.length > 0) return cached;
    if (error) {
      console.error('Error fetching relationships:', error);
    }
    return data || [];
  }

  const normalized = data.map((rel: any) => {
    if (!rel?.notes) return rel;
    const cleanNotes = replaceLegacyNamesWithRoleTokens(rel.notes);
    if (cleanNotes !== rel.notes) {
      supabase
        .from('relationships')
        .update({ notes: cleanNotes })
        .eq('id', rel.id)
        .then(() => {}, () => {});
      return { ...rel, notes: cleanNotes };
    }
    return rel;
  });

  cacheRelationshipsSnapshot(mysteryId, normalized);
  return normalized;
});

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
