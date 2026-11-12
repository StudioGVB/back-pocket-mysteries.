import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database';
import { replaceLegacyNamesWithRoleTokens } from '@/services/mysteries';
import { getCachedMysterySnapshot } from '@/lib/live-session-store';
import {
  CHRISTMAS_NIGHTMARE_BEATS,
  CHRISTMAS_NIGHTMARE_SUBPLOTS,
  isChristmasNightmareMystery,
  mapChristmasCharacterIds,
} from '@/data/christmas-nightmare';
import crypto from 'crypto';

type Subplot = Database['public']['Tables']['subplots']['Row'];
type SubplotBeat = Database['public']['Tables']['subplot_beats']['Row'];

/**
 * Fetch all subplots for a specific mystery, including their beats
 */
export async function getSubplotsByMysteryId(mysteryId: string) {
  const supabase = await createClient();

  let mysteryMeta: any = getCachedMysterySnapshot(mysteryId);
  if (!mysteryMeta) {
    const { data: mRow } = await supabase
      .from('mysteries')
      .select('id, title, theme, characters(id, name, is_victim, plot_role), plot_beats(id, beat_number)')
      .eq('id', mysteryId)
      .maybeSingle();
    if (mRow) mysteryMeta = mRow;
  }

  if (mysteryMeta && isChristmasNightmareMystery(mysteryMeta.title, mysteryMeta.theme)) {
    const charIdMap = mapChristmasCharacterIds(mysteryMeta.characters || []);
    const existingBeats = Array.isArray(mysteryMeta.plot_beats) ? mysteryMeta.plot_beats : [];

    return CHRISTMAS_NIGHTMARE_SUBPLOTS.map((sSpec, idx) => {
      const primaryId = charIdMap[sSpec.primaryKey];
      const secondaryId = charIdMap[sSpec.secondaryKey];

      const subplotBeats = sSpec.beats.map((b) => {
        const linkedMainBeat =
          b.linkedBeatNumber
            ? existingBeats.find((eb: any) => eb.beat_number === b.linkedBeatNumber)?.id ||
              CHRISTMAS_NIGHTMARE_BEATS.find((cb) => cb.beat_number === b.linkedBeatNumber)?.legacyId ||
              null
            : null;
        return {
          id: crypto
            .createHash('md5')
            .update(`${sSpec.id}:beat:${b.beat_number}`)
            .digest('hex')
            .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'),
          subplot_id: sSpec.id,
          beat_number: b.beat_number,
          description: b.description,
          linked_plot_beat_id: linkedMainBeat,
          created_at: new Date().toISOString(),
        };
      });

      return {
        id: sSpec.id,
        mystery_id: mysteryId,
        title: sSpec.title,
        theme: sSpec.theme,
        description: sSpec.description,
        primary_character_id: primaryId,
        secondary_character_id: secondaryId,
        sort_order: idx,
        created_at: new Date().toISOString(),
        subplot_beats: subplotBeats,
      };
    });
  }

  const { data: subplots, error } = await supabase
    .from('subplots')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching subplots:', error);
    return [];
  }

  if (!subplots || subplots.length === 0) return [];

  const subplotIds = subplots.map(s => s.id);
  
  const { data: beats, error: beatsError } = await supabase
    .from('subplot_beats')
    .select('*')
    .in('subplot_id', subplotIds);

  if (beatsError) {
    console.error('Error fetching subplot beats:', beatsError);
    return subplots.map(s => ({ ...s, subplot_beats: [] }));
  }

  const normalizedBeats = (beats || []).map(b => {
    const cleanDesc = replaceLegacyNamesWithRoleTokens(b.description);
    if (cleanDesc !== b.description) {
      supabase
        .from('subplot_beats')
        .update({ description: cleanDesc })
        .eq('id', b.id)
        .then(() => {}, () => {});
      return { ...b, description: cleanDesc };
    }
    return b;
  });

  return subplots.map(s => {
    const cleanTitle = replaceLegacyNamesWithRoleTokens(s.title);
    const cleanDesc = s.description ? replaceLegacyNamesWithRoleTokens(s.description) : s.description;
    if (cleanTitle !== s.title || cleanDesc !== s.description) {
      supabase
        .from('subplots')
        .update({ title: cleanTitle, description: cleanDesc })
        .eq('id', s.id)
        .then(() => {}, () => {});
    }
    return {
      ...s,
      title: cleanTitle,
      description: cleanDesc,
      subplot_beats: normalizedBeats.filter(b => b.subplot_id === s.id) || []
    };
  });
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

/**
 * Create a new specific subplot beat manually
 */
export async function createSubplotBeat(subplotId: string, beatNumber: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subplot_beats')
    .insert({
      subplot_id: subplotId,
      beat_number: beatNumber,
      description: ''
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
