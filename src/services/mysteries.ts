import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database';
import {
  extractFormatTagFromNotes,
  extractAudioUrlFromNotes,
  extractVoiceRegionFromNotes,
  stripFormatTagFromNotes,
  embedFormatTagInNotes,
  shuffleCluesAcrossRounds,
} from '@/utils/clue-format';
import { getCharacterRoleTitle, hydrateTextWithCharacters, stripEmDashes } from '@/utils/hydration';
import {
  LOTR_GOSSIP_MOODBOARD,
  LOTR_MAIN_COVER_URL,
  CHRISTMAS_CABIN_MOODBOARD,
  CHRISTMAS_MAIN_COVER_URL,
  isRealityReunionMystery,
  serializeMysteryImageField,
} from '@/utils/moodboard';
import {
  cacheMysterySnapshot,
  getCachedMysterySnapshot,
  getAllCachedMysteries,
} from '@/lib/live-session-store';
import {
  ACTIVE_MYSTERIES,
  LOVE_ON_THE_ROCKS_MYSTERY,
  getCanonicalActiveMysteryBySlugOrId,
} from '@/data/active-mysteries';
import {
  CHRISTMAS_NIGHTMARE_BEATS,
  CHRISTMAS_NIGHTMARE_CHARACTERS,
  CHRISTMAS_NIGHTMARE_CLUES,
  CHRISTMAS_NIGHTMARE_DESCRIPTION,
  CHRISTMAS_NIGHTMARE_INSIDE_JOKES,
  CHRISTMAS_NIGHTMARE_RELATIONSHIPS,
  CHRISTMAS_NIGHTMARE_SUBPLOT,
  CHRISTMAS_NIGHTMARE_SUBPLOTS,
  CHRISTMAS_NIGHTMARE_THEME,
  CHRISTMAS_NIGHTMARE_TITLE,
  CHRISTMAS_WIFE_MOTIVE,
  isChristmasNightmareMystery,
  mapChristmasCharacterIds,
} from '@/data/christmas-nightmare';
import { cacheRelationshipsSnapshot } from '@/lib/live-session-store';
import { cache } from 'react';
import crypto from 'crypto';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type MysteryInsert = Database['public']['Tables']['mysteries']['Insert'];

export function ensureChristmasNightmareCanon(mystery: any, supabase?: any): any {
  if (!mystery || !isChristmasNightmareMystery(mystery.title, mystery.theme)) {
    return mystery;
  }

  const mysteryId = mystery.id;
  const existingChars = Array.isArray(mystery.characters) ? mystery.characters : [];
  const charIdMap = mapChristmasCharacterIds(existingChars);
  const husbandId = charIdMap.husband;

  // Check if already migrated to canonical Christmas Nightmare roles
  const hasCanonicalNames =
    existingChars.length === 6 &&
    existingChars.some((c: any) => String(c.name || '').trim() === 'The Husband') &&
    existingChars.some((c: any) => String(c.name || '').trim() === 'The Sister-in-Law') &&
    existingChars.some((c: any) => String(c.name || '').trim() === 'The Mistress') &&
    existingChars.some((c: any) => String(c.name || '').trim() === 'The Bestie');

  const canonicalChristmasImageUrl = serializeMysteryImageField(
    CHRISTMAS_MAIN_COVER_URL,
    CHRISTMAS_CABIN_MOODBOARD
  );
  const needsImageUpgrade =
    !mystery.image_url ||
    String(mystery.image_url).startsWith('data:image/') ||
    !String(mystery.image_url).includes('#moodboard=');

  if (
    supabase &&
    mysteryId &&
    (mystery.title !== CHRISTMAS_NIGHTMARE_TITLE ||
      mystery.description !== CHRISTMAS_NIGHTMARE_DESCRIPTION ||
      mystery.spice_level !== 'spicy' ||
      needsImageUpgrade ||
      !hasCanonicalNames)
  ) {
    supabase
      .from('mysteries')
      .update({
        title: CHRISTMAS_NIGHTMARE_TITLE,
        theme: CHRISTMAS_NIGHTMARE_THEME,
        description: CHRISTMAS_NIGHTMARE_DESCRIPTION,
        inside_jokes: CHRISTMAS_NIGHTMARE_INSIDE_JOKES,
        min_players: 6,
        max_players: 6,
        complexity: 'medium',
        spice_level: 'spicy',
        ...(needsImageUpgrade ? { image_url: canonicalChristmasImageUrl } : {}),
      })
      .eq('id', mysteryId)
      .then(() => {}, () => {});
  }

  mystery.title = CHRISTMAS_NIGHTMARE_TITLE;
  mystery.theme = CHRISTMAS_NIGHTMARE_THEME;
  mystery.description = CHRISTMAS_NIGHTMARE_DESCRIPTION;
  mystery.inside_jokes = CHRISTMAS_NIGHTMARE_INSIDE_JOKES;
  mystery.min_players = 6;
  mystery.max_players = 6;
  mystery.complexity = 'medium';
  mystery.spice_level = 'spicy';
  if (needsImageUpgrade) {
    mystery.image_url = canonicalChristmasImageUrl;
  }

  // Sync characters + motives
  const canonicalChars = CHRISTMAS_NIGHTMARE_CHARACTERS.map((spec) => {
    const id = charIdMap[spec.key];
    const existing = existingChars.find((c: any) => c?.id === id) || {};
    const existingProfile = existing.profile_data || {};

    // Preserve any linked guest info while replacing bio/act/outfit with canonical Christmas Nightmare profile
    const mergedProfile: Record<string, any> = {
      ...spec.profile_data,
      ...existingProfile,
      color: spec.profile_data.color,
      bio: spec.profile_data.bio,
      outfit_advice: spec.profile_data.outfit_advice,
      outfit_reference_images: spec.profile_data.outfit_reference_images,
      act_summary: spec.profile_data.act_summary,
      act_bullets: spec.profile_data.act_bullets,
    };
    if (spec.gender !== 'adaptable') {
      delete mergedProfile.presentation_male;
      delete mergedProfile.presentation_female;
    }

    const motiveSpec = spec.key === 'wife' ? CHRISTMAS_WIFE_MOTIVE : spec.motive;
    const existingMotive = Array.isArray(existing.motives) ? existing.motives[0] : null;
    const motives = motiveSpec
      ? [
          {
            id: existingMotive?.id || motiveSpec.legacyId || crypto.randomUUID(),
            mystery_id: mysteryId,
            character_id: id,
            linked_character_id: husbandId,
            motive_type: motiveSpec.motive_type,
            strength: motiveSpec.strength,
            notes: motiveSpec.notes,
          },
        ]
      : [];

    if (supabase && mysteryId && !hasCanonicalNames) {
      if (existing?.id) {
        supabase
          .from('characters')
          .update({
            name: spec.name,
            gender: spec.gender,
            is_victim: spec.is_victim,
            plot_role: spec.plot_role,
            archetype: spec.archetype,
            is_mandatory: spec.is_mandatory,
            min_player_count: spec.min_player_count,
            profile_data: mergedProfile,
          })
          .eq('id', id)
          .then(() => {}, () => {});
      } else {
        supabase
          .from('characters')
          .insert({
            id,
            mystery_id: mysteryId,
            name: spec.name,
            gender: spec.gender,
            is_victim: spec.is_victim,
            plot_role: spec.plot_role,
            archetype: spec.archetype,
            is_mandatory: spec.is_mandatory,
            min_player_count: spec.min_player_count,
            profile_data: mergedProfile,
          })
          .then(() => {}, () => {});
      }

      if (motives.length > 0) {
        const m = motives[0];
        if (existingMotive?.id) {
          supabase
            .from('motives')
            .update({
              linked_character_id: husbandId,
              motive_type: m.motive_type,
              strength: m.strength,
              notes: m.notes,
            })
            .eq('id', existingMotive.id)
            .then(() => {}, () => {});
        } else {
          supabase
            .from('motives')
            .insert(m)
            .then(() => {}, () => {});
        }
      }
    }

    return {
      ...existing,
      id,
      mystery_id: mysteryId,
      name: spec.name,
      gender: spec.gender,
      is_victim: spec.is_victim,
      plot_role: spec.plot_role,
      archetype: spec.archetype,
      is_mandatory: spec.is_mandatory,
      min_player_count: spec.min_player_count,
      profile_data: mergedProfile,
      motives,
    };
  });

  mystery.characters = canonicalChars;

  // Sync plot_beats if present on mystery object
  if (Array.isArray(mystery.plot_beats)) {
    const existingBeats = mystery.plot_beats;
    const beatIdByNumber: Record<number, string> = {};

    const canonicalBeats = CHRISTMAS_NIGHTMARE_BEATS.map((bSpec) => {
      const existingBeat =
        existingBeats.find((eb: any) => eb.beat_number === bSpec.beat_number || eb.sort_order === bSpec.sort_order) ||
        null;
      const beatId = existingBeat?.id || bSpec.legacyId || crypto.randomUUID();
      beatIdByNumber[bSpec.beat_number] = beatId;
      const involvedIds = bSpec.involvedKeys.map((k) => charIdMap[k]).filter(Boolean);

      if (
        supabase &&
        mysteryId &&
        (!existingBeat ||
          existingBeat.event_title !== bSpec.event_title ||
          existingBeat.description !== bSpec.description)
      ) {
        if (existingBeat?.id) {
          supabase
            .from('plot_beats')
            .update({
              beat_number: bSpec.beat_number,
              sort_order: bSpec.sort_order,
              event_title: bSpec.event_title,
              description: bSpec.description,
              beat_type: bSpec.beat_type,
              timeline_phase: bSpec.timeline_phase,
              characters_involved: involvedIds,
              is_required: true,
            })
            .eq('id', existingBeat.id)
            .then(() => {}, () => {});
        } else {
          supabase
            .from('plot_beats')
            .insert({
              id: beatId,
              mystery_id: mysteryId,
              beat_number: bSpec.beat_number,
              sort_order: bSpec.sort_order,
              event_title: bSpec.event_title,
              description: bSpec.description,
              beat_type: bSpec.beat_type,
              timeline_phase: bSpec.timeline_phase,
              characters_involved: involvedIds,
              is_required: true,
            })
            .then(() => {}, () => {});
        }
      }

      return {
        ...(existingBeat || {}),
        id: beatId,
        mystery_id: mysteryId,
        beat_number: bSpec.beat_number,
        sort_order: bSpec.sort_order,
        event_title: bSpec.event_title,
        description: bSpec.description,
        beat_type: bSpec.beat_type,
        timeline_phase: bSpec.timeline_phase,
        characters_involved: involvedIds,
        is_required: true,
      };
    });

    mystery.plot_beats = canonicalBeats;

    // Sync clues if present
    if (Array.isArray(mystery.clues)) {
      const existingClues = mystery.clues;
      mystery.clues = CHRISTMAS_NIGHTMARE_CLUES.map((cSpec, idx) => {
        const existingClue = existingClues.find((ec: any) => ec.id === cSpec.legacyId) || existingClues[idx] || null;
        const clueId = existingClue?.id || cSpec.legacyId || crypto.randomUUID();
        const linkedBeatId = cSpec.beatNumber ? beatIdByNumber[cSpec.beatNumber] || null : null;

        const preservedAudioUrl =
          existingClue?.audio_url || extractAudioUrlFromNotes(existingClue?.internal_notes) || null;
        const preservedVoiceRegion =
          existingClue?.voice_region || extractVoiceRegionFromNotes(existingClue?.internal_notes) || null;
        const preservedStaticImage =
          existingClue?.static_image_url ?? cSpec.static_image_url ?? null;

        const desiredRawNotes = embedFormatTagInNotes(
          stripFormatTagFromNotes(cSpec.internal_notes),
          cSpec.format as any,
          {
            audioUrl: preservedAudioUrl,
            voiceRegion: preservedVoiceRegion,
          }
        );

        if (
          supabase &&
          mysteryId &&
          (!existingClue ||
            existingClue.title !== cSpec.title ||
            existingClue.description !== cSpec.description ||
            stripFormatTagFromNotes(existingClue.internal_notes) !== stripFormatTagFromNotes(cSpec.internal_notes))
        ) {
          if (existingClue?.id) {
            supabase
              .from('clues')
              .update({
                title: cSpec.title,
                description: cSpec.description,
                clue_type: cSpec.clue_type,
                implication_type: cSpec.implication_type,
                evidence_status: cSpec.evidence_status,
                round_number: cSpec.round_number,
                is_essential: cSpec.is_essential,
                linked_plot_beat_id: linkedBeatId,
                static_image_url: preservedStaticImage,
                internal_notes: desiredRawNotes,
                generation_prompt: cSpec.generation_prompt,
              })
              .eq('id', existingClue.id)
              .then(() => {}, () => {});
          } else {
            supabase
              .from('clues')
              .insert({
                id: clueId,
                mystery_id: mysteryId,
                title: cSpec.title,
                description: cSpec.description,
                clue_type: cSpec.clue_type,
                implication_type: cSpec.implication_type,
                evidence_status: cSpec.evidence_status,
                round_number: cSpec.round_number,
                is_essential: cSpec.is_essential,
                linked_plot_beat_id: linkedBeatId,
                static_image_url: preservedStaticImage,
                internal_notes: desiredRawNotes,
                generation_prompt: cSpec.generation_prompt,
              })
              .then(() => {}, () => {});
          }
        }

        return {
          ...(existingClue || {}),
          id: clueId,
          mystery_id: mysteryId,
          title: cSpec.title,
          description: cSpec.description,
          clue_type: cSpec.clue_type,
          implication_type: cSpec.implication_type,
          evidence_status: cSpec.evidence_status,
          round_number: cSpec.round_number,
          is_essential: cSpec.is_essential,
          linked_plot_beat_id: linkedBeatId,
          static_image_url: preservedStaticImage,
          format: cSpec.format,
          audio_url: preservedAudioUrl,
          voice_region: preservedVoiceRegion,
          internal_notes: stripFormatTagFromNotes(cSpec.internal_notes),
          generation_prompt: cSpec.generation_prompt,
        };
      });
    }
  }

  // Sync subplots if present
  if (Array.isArray(mystery.subplots)) {
    const existingSubs = mystery.subplots;
    mystery.subplots = CHRISTMAS_NIGHTMARE_SUBPLOTS.map((sSpec, idx) => {
      const existingSub = existingSubs.find((es: any) => es.id === sSpec.id) || existingSubs[idx] || null;
      const subId = existingSub?.id || sSpec.id;
      const primaryId = charIdMap[sSpec.primaryKey];
      const secondaryId = charIdMap[sSpec.secondaryKey];

      if (
        supabase &&
        mysteryId &&
        (!existingSub || existingSub.title !== sSpec.title || existingSub.description !== sSpec.description)
      ) {
        if (existingSub?.id) {
          supabase
            .from('subplots')
            .update({
              title: sSpec.title,
              theme: sSpec.theme,
              description: sSpec.description,
              primary_character_id: primaryId,
              secondary_character_id: secondaryId,
            })
            .eq('id', existingSub.id)
            .then(() => {}, () => {});
        } else {
          supabase
            .from('subplots')
            .insert({
              id: subId,
              mystery_id: mysteryId,
              title: sSpec.title,
              theme: sSpec.theme,
              description: sSpec.description,
              primary_character_id: primaryId,
              secondary_character_id: secondaryId,
            })
            .then(() => {}, () => {});
        }
      }

      return {
        ...(existingSub || {}),
        id: subId,
        mystery_id: mysteryId,
        title: sSpec.title,
        theme: sSpec.theme,
        description: sSpec.description,
        primary_character_id: primaryId,
        secondary_character_id: secondaryId,
      };
    });
  }

  // Build and cache the 12 canonical relationships for this mystery
  if (mysteryId) {
    const canonicalRels = CHRISTMAS_NIGHTMARE_RELATIONSHIPS.map((rel) => {
      const [a, b] = [charIdMap[rel.charAKey], charIdMap[rel.charBKey]].sort();
      return {
        id: crypto.createHash('md5').update(`${mysteryId}:${a}:${b}`).digest('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'),
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
    cacheRelationshipsSnapshot(mysteryId, canonicalRels);

    if (supabase && !hasCanonicalNames) {
      supabase
        .from('relationships')
        .delete()
        .eq('mystery_id', mysteryId)
        .then(() => {
          supabase
            .from('relationships')
            .upsert(
              canonicalRels.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => rest),
              { onConflict: 'mystery_id,character_a_id,character_b_id' }
            )
            .then(() => {}, () => {});
        }, () => {});
    }
  }

  return mystery;
}

function ensureRealityPromoCover(mystery: any, supabase?: any): any {
  if (!mystery || !isRealityReunionMystery(mystery.theme, mystery.title)) {
    return mystery;
  }
  const currentUrl = String(mystery.image_url || '');
  if (!currentUrl.includes('main-promo-murder.jpg')) {
    const newSerialized = serializeMysteryImageField(
      LOTR_MAIN_COVER_URL,
      LOTR_GOSSIP_MOODBOARD
    );
    if (supabase && mystery.id && newSerialized) {
      supabase
        .from('mysteries')
        .update({ image_url: newSerialized })
        .eq('id', mystery.id)
        .then(() => {});
    }
    return {
      ...mystery,
      image_url: newSerialized,
    };
  }
  return mystery;
}

export async function getMysteries(): Promise<Mystery[]> {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('mysteries')
    .select('*, characters(id, name, gender, is_victim, plot_role, archetype, is_mandatory, profile_data)')
    .order('created_at', { ascending: false })) as any;

  if (error) {
    console.error('Error fetching mysteries:', error);
    return [];
  }

  return (data || []).map((m: any) => {
    const upgraded = ensureChristmasNightmareCanon(ensureRealityPromoCover(m, supabase), supabase);
    const rawChars = Array.isArray(upgraded.characters) ? upgraded.characters : [];
    const chars = normalizeCharacterList(rawChars, supabase);
    const cleanDesc = upgraded.description
      ? hydrateTextWithCharacters(
          replaceLegacyNamesWithRoleTokens(
            replacePlaceholderNamesWithRoles(upgraded.description, rawChars)
          ),
          chars,
          'role'
        )
      : upgraded.description;
    if (cleanDesc && cleanDesc !== upgraded.description && upgraded.id) {
      supabase
        .from('mysteries')
        .update({ description: cleanDesc })
        .eq('id', upgraded.id)
        .then(() => {}, () => {});
    }
    return {
      ...upgraded,
      characters: chars,
      description: cleanDesc,
    };
  });
}

export function replacePlaceholderNamesWithRoles(
  text: string | null | undefined,
  characters: any[]
): string {
  if (!text) return '';
  let result = replaceLegacyNamesWithRoleTokens(text);

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  (characters || []).forEach((char: any) => {
    const parts = (char.name || '').split('|');
    const baseName = (parts[0] || '').trim();
    const roleTitle = getCharacterRoleTitle(char);
    const guestName = ((char.profile_data as any)?.guest_name || (char.profile_data as any)?.name || '').trim();

    if (baseName) {
      // Replace {{BaseName}} token
      const tokenRegex = new RegExp(`\\{\\{\\s*${escapeRegExp(baseName)}\\s*\\}\\}`, 'gi');
      result = result.replace(tokenRegex, roleTitle);

      // Replace standalone BaseName's / BaseName’s and BaseName
      const wordRegex = new RegExp(`\\b${escapeRegExp(baseName)}\\b`, 'g');
      result = result.replace(wordRegex, roleTitle);
    }

    if (guestName && guestName.toLowerCase() !== roleTitle.toLowerCase()) {
      const guestRegex = new RegExp(`\\b${escapeRegExp(guestName)}\\b`, 'gi');
      result = result.replace(guestRegex, roleTitle);
    }
  });

  // Unwrap any remaining {{Token}}
  result = result.replace(/\{\{([A-Za-z0-9\s'._&-]+)\}\}/g, '$1');
  return stripEmDashes(result);
}

export async function getPublishedMysteries() {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('mysteries')
    .select('*, characters(name, is_victim, profile_data)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })) as any;

  if (error) {
    console.error('Error fetching published mysteries:', error);
  }

  const dbPublished = (data || []).map((m: any) => {
    const upgraded = ensureRealityPromoCover(m, supabase);
    const chars = normalizeCharacterList(upgraded.characters || []);
    return {
      ...upgraded,
      characters: chars,
      description: replacePlaceholderNamesWithRoles(upgraded.description, chars),
    };
  });

  return dbPublished;
}

export async function getPublishedMysteryByIdOrSlug(idOrSlug: string) {
  const supabase = await createClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  let mystery: any = null;

  if (isUuid) {
    const { data } = await supabase
      .from('mysteries')
      .select('*')
      .eq('id', idOrSlug)
      .maybeSingle();
    mystery = data;
  } else {
    const { data: allMysteries } = await supabase
      .from('mysteries')
      .select('*')
      .order('created_at', { ascending: false });

    mystery = (allMysteries || []).find(
      (m: any) => slugify(m.title || '') === idOrSlug.toLowerCase()
    ) || null;
  }

  if (!mystery) {
    const cached = isUuid
      ? getCachedMysterySnapshot(idOrSlug)
      : getAllCachedMysteries().find((m: any) => slugify(m.title || '') === idOrSlug.toLowerCase()) || null;
    if (cached) {
      const upgradedCached = ensureRealityPromoCover(cached);
      const cleanChars = normalizeCharacterList(upgradedCached.characters || []);
      return {
        ...upgradedCached,
        description: replacePlaceholderNamesWithRoles(upgradedCached.description, cleanChars),
        characters: cleanChars,
      };
    }

    return null;
  }

  mystery = ensureRealityPromoCover(mystery, supabase);

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mystery.id)
    .order('is_victim', { ascending: false })
    .order('is_mandatory', { ascending: false })
    .order('created_at', { ascending: true });

  const charList = normalizeCharacterList(characters || [], supabase);

  return {
    ...mystery,
    description: replacePlaceholderNamesWithRoles(mystery.description, charList),
    characters: charList,
  };
}

export const getUserMysteries = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('mysteries')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user mysteries:', error);
  }

  let crmRecord: any = null;
  try {
    const fs = await import('fs');
    const path = await import('path');
    const crmPath = path.join(process.cwd(), 'data', 'customer-crm.json');
    if (fs.existsSync(crmPath)) {
      const store = JSON.parse(fs.readFileSync(crmPath, 'utf8'));
      crmRecord = store?.[user.id] || null;
    }
  } catch {
    // Non-fatal
  }

  const revokedSet = new Set<string>(crmRecord?.revokedMysteryIds || []);
  const roundOverrides: Record<string, number> = crmRecord?.mysteryRoundOverrides || {};
  const map = new Map<string, any>();

  for (const m of data || []) {
    if (revokedSet.has(m.id)) continue;
    map.set(m.id, {
      ...m,
      current_round: roundOverrides[m.id] ?? m.current_round ?? 1,
    });
  }

  for (const gm of crmRecord?.giftedMysteries || []) {
    if (revokedSet.has(gm.id)) continue;
    if (!map.has(gm.id)) {
      map.set(gm.id, {
        ...gm,
        current_round: roundOverrides[gm.id] ?? gm.current_round ?? 1,
      });
    }
  }

  return Array.from(map.values()).map((m: any) => ensureRealityPromoCover(m, supabase));
});

export async function createMystery(mystery: MysteryInsert) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('mysteries')
    .insert({
      ...mystery,
      created_by: user?.id
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating mystery: ${error.message}`);
  }

  return data;
}

const LEGACY_TOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\{\{Gabby_Initial\}\}/gi, '{{The Star_Initial}}'],
  [/\{\{Sienna_Initial\}\}/gi, '{{The Sister_Initial}}'],
  [/\{\{Dane_Initial\}\}/gi, '{{The Ex_Initial}}'],
  [/\{\{Colt_Initial\}\}/gi, '{{The Host_Initial}}'],
  [/\{\{Milo_Initial\}\}/gi, '{{The Superfan_Initial}}'],
  [/\{\{Jeremy_Initial\}\}/gi, '{{The Producer Plant_Initial}}'],
  [/\{\{Ava_Initial\}\}/gi, '{{The Runner-Up_Initial}}'],
  [/\{\{Zayn_Initial\}\}/gi, '{{The Fan-Favourite Flameout_Initial}}'],
  [/\{\{Rikki_Initial\}\}/gi, '{{The Hair & Makeup Artist_Initial}}'],
  [/\{\{Gabby\}\}/gi, '{{The Star}}'],
  [/\{\{Sienna\}\}/gi, '{{The Sister}}'],
  [/\{\{Dane\}\}/gi, '{{The Ex}}'],
  [/\{\{Colt\}\}/gi, '{{The Host}}'],
  [/\{\{Milo\}\}/gi, '{{The Superfan}}'],
  [/\{\{Jeremy\}\}/gi, '{{The Producer Plant}}'],
  [/\{\{Ava\}\}/gi, '{{The Runner-Up}}'],
  [/\{\{Zayn\}\}/gi, '{{The Fan-Favourite Flameout}}'],
  [/\{\{Rikki\}\}/gi, '{{The Hair & Makeup Artist}}'],
  [/\bGabby\b/g, 'The Star'],
  [/\bSienna\b/g, 'The Sister'],
  [/\bDane\b/g, 'The Ex'],
  [/\bColt\b/g, 'The Host'],
  [/\bMilo\b/g, 'The Superfan'],
  [/\bJeremy\b/g, 'The Producer Plant'],
  [/\bAva\b/g, 'The Runner-Up'],
  [/\bZayn\b/g, 'The Fan-Favourite Flameout'],
  [/\bRikki\b/g, 'The Hair & Makeup Artist'],
  // Christmas Nightmare legacy placeholder names
  [/\bThe\s+notorious\s+(?:tycoon\s+)?(?:Elias\s+Thorne|\{\{The\s+Tycoon\}\}|The\s+Tycoon)\b/gi, '{{The Tycoon}}'],
  [/\b(?:notorious\s+)?tycoon\s+Elias\s+Thorne\b/gi, '{{The Tycoon}}'],
  [/\bElias\s+Thorne\b/gi, '{{The Tycoon}}'],
  [/\bDr\.?\s+Aris\s+Thorne\b/gi, '{{The Doctor}}'],
  [/\bAris\s+Thorne\b/gi, '{{The Doctor}}'],
  [/\bVivienne\s+Thorne\b/gi, '{{The Artist}}'],
  [/\bSergeant\s+Vance\b/gi, '{{The Sergeant}}'],
  [/\bSgt\.?\s+Vance\b/gi, '{{The Sergeant}}'],
  [/\bMallory\s+Vance\b/gi, '{{The Sergeant}}'],
  [/\bClara\s+Bellwether\b/gi, '{{The Entrepreneur}}'],
  [/\bthe\s+Thorne\s+name\b/gi, 'the family name'],
  [/\bElias\b/g, '{{The Tycoon}}'],
  [/\bVivienne\b/g, '{{The Artist}}'],
  [/\bAris\b/g, '{{The Doctor}}'],
  [/\bMallory\b/g, '{{The Sergeant}}'],
  [/\bClara\b/g, '{{The Entrepreneur}}'],
  [/\bRobin\b/g, '{{The Caretaker}}'],
];

const IGNORED_DYNAMIC_NAME_WORDS = new Set([
  'the', 'mr', 'mrs', 'ms', 'miss', 'dr', 'doctor', 'sgt', 'sergeant', 'prof', 'professor',
  'capt', 'captain', 'lady', 'lord', 'sir', 'madame', 'detective', 'inspector', 'general',
  'colonel', 'father', 'sister', 'brother', 'coach', 'judge', 'mayor', 'senator', 'prince',
  'princess', 'king', 'queen', 'chef', 'victim', 'suspect', 'innocent', 'killer', 'assistant',
]);

export function buildDynamicPlaceholderReplacements(characters: any[] | null | undefined): Array<[RegExp, string]> {
  if (!Array.isArray(characters) || characters.length === 0) return [];
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rules: Array<[RegExp, string]> = [];

  for (const char of characters) {
    if (!char?.name) continue;
    const parts = String(char.name).split('|').map((s: string) => s.trim());
    const rawBase = parts[0] || '';
    const roleTitle = getCharacterRoleTitle(char);
    const bareRole = roleTitle.replace(/^the\s+/i, '').trim();

    if (
      rawBase &&
      rawBase.toLowerCase() !== roleTitle.toLowerCase() &&
      rawBase.toLowerCase() !== bareRole.toLowerCase()
    ) {
      // Full base name (e.g. "Elias Thorne") -> {{The Tycoon}}
      rules.push([new RegExp(`\\b${escapeRegExp(rawBase)}\\b`, 'gi'), `{{${roleTitle}}}`]);
      // Individual tokens (first name / surname)
      const tokens = rawBase
        .replace(/['".,]/g, ' ')
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 3 && !IGNORED_DYNAMIC_NAME_WORDS.has(t.toLowerCase()) && t.toLowerCase() !== bareRole.toLowerCase());
      for (const tok of tokens) {
        rules.push([new RegExp(`\\b${escapeRegExp(tok)}\\b`, 'g'), `{{${roleTitle}}}`]);
      }
    }
  }
  return rules;
}

export function replaceLegacyNamesWithRoleTokens(
  text: string | null | undefined,
  extraRules?: Array<[RegExp, string]>
): string {
  if (!text) return '';
  let updated = text;
  if (Array.isArray(extraRules)) {
    for (const [re, rep] of extraRules) {
      updated = updated.replace(re, rep);
    }
  }
  for (const [re, rep] of LEGACY_TOKEN_REPLACEMENTS) {
    updated = updated.replace(re, rep);
  }
  return stripEmDashes(updated);
}

function normalizeCharacterList(
  characters: any[] | null | undefined,
  supabase?: any,
  dynamicRules?: Array<[RegExp, string]>
): any[] {
  if (!Array.isArray(characters)) return [];
  const activeDynamicRules = dynamicRules ?? buildDynamicPlaceholderReplacements(characters);

  let localGeneratedFiles: string[] = [];
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'generated-avatars');
    if (fs.existsSync(dir)) {
      localGeneratedFiles = fs.readdirSync(dir);
    }
  } catch {
    // Ignore fs errors
  }

  let cachedMysteriesList: any[] = [];
  try {
    cachedMysteriesList = getAllCachedMysteries();
  } catch {
    // Ignore cache read errors
  }

  return characters.map((char: any) => {
    if (!char) return char;
    const roleTitle = getCharacterRoleTitle(char);
    const rawName = String(char.name || '').trim();
    const parts = rawName.split('|').map((s: string) => s.trim());
    const rawPrefix = parts[2] && !['victim', 'suspect', 'innocent', 'killer', 'assistant'].includes(parts[2].toLowerCase())
      ? parts[2]
      : '';
    const cleanName = rawPrefix ? `${roleTitle} | ${roleTitle} | ${rawPrefix}` : roleTitle;

    const origGuestName = char.profile_data?.guest_name;
    const origProfileName = char.profile_data?.name;

    let profileStr = JSON.stringify(char.profile_data || {});
    const origProfileStr = profileStr;
    for (const [re, rep] of activeDynamicRules) {
      profileStr = profileStr.replace(re, rep);
    }
    for (const [re, rep] of LEGACY_TOKEN_REPLACEMENTS) {
      profileStr = profileStr.replace(re, rep);
    }
    profileStr = stripEmDashes(profileStr);
    const cleanedProfile = JSON.parse(profileStr);

    // Preserve real guest names so a guest's custom name isn't overwritten with a role title
    if (origGuestName !== undefined) {
      cleanedProfile.guest_name = origGuestName;
    }
    if (origProfileName !== undefined) {
      cleanedProfile.name = origProfileName;
    }

    // Ensure canonical role bio/outfit/act_summary are present if missing
    const canonicalMatch = LOVE_ON_THE_ROCKS_MYSTERY.characters.find(
      (c) => c.roleTitle.toLowerCase() === roleTitle.toLowerCase()
    );
    let profileRestored = false;

    // Recover AI guest portrait ONLY for the exact same guest_id (never by char.id across tenants)
    const curAvatarUrl = String(cleanedProfile.avatar_url || '');
    if (cleanedProfile.guest_id && !curAvatarUrl.includes('aiPhotoUrl=')) {
      const guestIdStr = String(cleanedProfile.guest_id);
      let recoveredAiPhotoUrl: string | null = null;

      // 1. Check cached mysteries for an upgraded avatar_url for this specific guest_id
      for (const cm of cachedMysteriesList) {
        if (!Array.isArray(cm?.characters)) continue;
        for (const cc of cm.characters) {
          const ccPd = cc?.profile_data;
          if (
            ccPd &&
            String(ccPd.guest_id || '') === guestIdStr &&
            typeof ccPd.avatar_url === 'string' &&
            ccPd.avatar_url.includes('aiPhotoUrl=')
          ) {
            cleanedProfile.avatar_url = ccPd.avatar_url;
            if (ccPd.standard_character_photo_url) {
              cleanedProfile.standard_character_photo_url = ccPd.standard_character_photo_url;
            }
            profileRestored = true;
            recoveredAiPhotoUrl = ccPd.standard_character_photo_url || ccPd.avatar_url;
            break;
          }
        }
        if (recoveredAiPhotoUrl) break;
      }

      // 2. Check public/generated-avatars/${guestId}-*.jpg
      if (!recoveredAiPhotoUrl && localGeneratedFiles.length > 0) {
        const matchedFile = localGeneratedFiles.find(
          (f) => f.startsWith(`${guestIdStr}-`) && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'))
        );
        if (matchedFile) {
          const localUrl = `/generated-avatars/${matchedFile}`;
          const baseAvatar = curAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanedProfile.guest_name || cleanedProfile.name || guestIdStr)}`;
          const separator = baseAvatar.includes('?') ? '&' : '?';
          cleanedProfile.avatar_url = `${baseAvatar}${separator}aiPhotoUrl=${encodeURIComponent(localUrl)}`;
          cleanedProfile.standard_character_photo_url = localUrl;
          profileRestored = true;
        }
      }
    }

    if (canonicalMatch) {
      if (!cleanedProfile.bio || !String(cleanedProfile.bio).trim()) {
        cleanedProfile.bio = canonicalMatch.profile_data.bio;
        profileRestored = true;
      }
      if (!cleanedProfile.act_summary && canonicalMatch.profile_data.act_summary) {
        cleanedProfile.act_summary = canonicalMatch.profile_data.act_summary;
        profileRestored = true;
      }
      if (!cleanedProfile.outfit_advice && canonicalMatch.profile_data.outfit_advice) {
        cleanedProfile.outfit_advice = canonicalMatch.profile_data.outfit_advice;
        profileRestored = true;
      }
      if (
        (!Array.isArray(cleanedProfile.act_bullets) || cleanedProfile.act_bullets.length === 0) &&
        canonicalMatch.profile_data.act_bullets
      ) {
        cleanedProfile.act_bullets = canonicalMatch.profile_data.act_bullets;
        profileRestored = true;
      }
      if (
        (!Array.isArray(cleanedProfile.outfit_reference_images) ||
          cleanedProfile.outfit_reference_images.filter(Boolean).length < 3) &&
        canonicalMatch.profile_data.outfit_reference_images
      ) {
        cleanedProfile.outfit_reference_images = canonicalMatch.profile_data.outfit_reference_images;
        profileRestored = true;
      }
      if (canonicalMatch.profile_data.presentation_female) {
        cleanedProfile.presentation_female = {
          ...(canonicalMatch.profile_data.presentation_female || {}),
          ...(cleanedProfile.presentation_female || {}),
        };
        if (
          (!Array.isArray(cleanedProfile.presentation_female.outfit_reference_images) ||
            cleanedProfile.presentation_female.outfit_reference_images.filter(Boolean).length < 3) &&
          canonicalMatch.profile_data.presentation_female.outfit_reference_images
        ) {
          cleanedProfile.presentation_female.outfit_reference_images =
            canonicalMatch.profile_data.presentation_female.outfit_reference_images;
          profileRestored = true;
        }
      }
      if (canonicalMatch.profile_data.presentation_male) {
        cleanedProfile.presentation_male = {
          ...(canonicalMatch.profile_data.presentation_male || {}),
          ...(cleanedProfile.presentation_male || {}),
        };
        if (
          (!Array.isArray(cleanedProfile.presentation_male.outfit_reference_images) ||
            cleanedProfile.presentation_male.outfit_reference_images.filter(Boolean).length < 3) &&
          canonicalMatch.profile_data.presentation_male.outfit_reference_images
        ) {
          cleanedProfile.presentation_male.outfit_reference_images =
            canonicalMatch.profile_data.presentation_male.outfit_reference_images;
          profileRestored = true;
        }
      }
    }

    // Also normalize legacy names in character motives
    let normalizedMotives = char.motives;
    if (Array.isArray(char.motives)) {
      normalizedMotives = char.motives.map((m: any) => {
        if (!m || !m.notes) return m;
        const cleanNotes = replaceLegacyNamesWithRoleTokens(m.notes, activeDynamicRules);
        if (cleanNotes !== m.notes) {
          if (supabase && m.id) {
            supabase
              .from('motives')
              .update({ notes: cleanNotes })
              .eq('id', m.id)
              .then(() => {})
              .catch(() => {});
          }
          return { ...m, notes: cleanNotes };
        }
        return m;
      });
    }

    const cleanArchetype = char.archetype ? replaceLegacyNamesWithRoleTokens(char.archetype, activeDynamicRules) : char.archetype;
    const finalProfileStr = JSON.stringify(cleanedProfile);
    if (rawName !== cleanName || origProfileStr !== finalProfileStr || profileRestored || cleanArchetype !== char.archetype) {
      if (supabase && char.id) {
        supabase
          .from('characters')
          .update({ name: cleanName, archetype: cleanArchetype, profile_data: cleanedProfile })
          .eq('id', char.id)
          .then(() => {});
      }
      return {
        ...char,
        name: cleanName,
        archetype: cleanArchetype,
        profile_data: cleanedProfile,
        motives: normalizedMotives,
      };
    }
    return {
      ...char,
      archetype: cleanArchetype,
      motives: normalizedMotives,
    };
  });
}

export const getMysteryById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('mysteries')
    .select(`
      *,
      characters (
        *,
        motives!motives_character_id_fkey (*)
      ),
      clues (*),
      plot_beats (*),
      subplots (*)
    `)
    .eq('id', id)
    .single()) as any;

  if (error || !data) {
    const cached = getCachedMysterySnapshot(id);
    if (cached) {
      return ensureChristmasNightmareCanon(cached, supabase);
    }
    if (error?.code === '42703') {
      console.error('CRITICAL: Database column missing in mystery fetch. Please run character SQL migration.', error);
    } else if (error) {
      console.error('Error fetching mystery details:', error);
    }
    return null;
  }

  const upgradedData = ensureChristmasNightmareCanon(ensureRealityPromoCover(data, supabase), supabase);
  data.image_url = upgradedData.image_url;

  const rawChars = Array.isArray(data?.characters) ? data.characters : [];
  const dynamicRules = buildDynamicPlaceholderReplacements(rawChars);

  if (Array.isArray(data?.characters)) {
    data.characters = normalizeCharacterList(data.characters, supabase, dynamicRules);
  }

  if (Array.isArray(data?.plot_beats)) {
    data.plot_beats = normalizePlotBeats(data.plot_beats, id, supabase, dynamicRules);
  }

  if (Array.isArray(data?.subplots)) {
    data.subplots = data.subplots.map((s: any) => {
      const cleanTitle = replaceLegacyNamesWithRoleTokens(s.title, dynamicRules);
      const cleanDesc = s.description ? replaceLegacyNamesWithRoleTokens(s.description, dynamicRules) : s.description;
      if (supabase && s.id && (cleanTitle !== s.title || cleanDesc !== s.description)) {
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
      };
    });
  }

  if (data?.description && Array.isArray(data?.characters)) {
    const preCleanedDesc = replaceLegacyNamesWithRoleTokens(data.description, dynamicRules);
    const cleanDesc = hydrateTextWithCharacters(preCleanedDesc, data.characters, 'role');
    if (supabase && data.id && cleanDesc !== data.description) {
      supabase
        .from('mysteries')
        .update({ description: cleanDesc })
        .eq('id', data.id)
        .then(() => {}, () => {});
    }
    data.description = cleanDesc;
  }

  if (Array.isArray(data?.clues)) {
    data.clues = normalizeClueList(data.clues, supabase, dynamicRules);
  }

  cacheMysterySnapshot(id, data);

  try {
    require('fs').appendFileSync('actions_log.txt', new Date().toISOString() + ' Mystery ' + id + ' created_by: ' + data.created_by + '\n');
  } catch {}

  return data;
});

export const getCharactersByMysteryId = cache(async (mysteryId: string) => {
  const supabase = await createClient();
  
  const { data, error } = (await supabase
    .from('characters')
    .select(`
      *,
      motives!motives_character_id_fkey (*)
    `)
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true })) as any;

  if (error) {
    console.error('Error fetching characters with motives, attempting fallback without motives:', error);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('characters')
      .select('*')
      .eq('mystery_id', mysteryId)
      .order('created_at', { ascending: true });

    if (fallbackError || !fallbackData || fallbackData.length === 0) {
      const cached = getCachedMysterySnapshot(mysteryId);
      if (cached && Array.isArray(cached.characters) && cached.characters.length > 0) {
        const upgraded = isChristmasNightmareMystery(cached.title, cached.theme)
          ? ensureChristmasNightmareCanon(cached)
          : cached;
        return normalizeCharacterList(upgraded.characters || []);
      }
      console.error('Fallback fetch characters error:', fallbackError);
      return [];
    }
    return normalizeCharacterList(fallbackData, supabase);
  }

  if (!data || data.length === 0) {
    const cached = getCachedMysterySnapshot(mysteryId);
    if (cached && Array.isArray(cached.characters) && cached.characters.length > 0) {
      const upgraded = isChristmasNightmareMystery(cached.title, cached.theme)
        ? ensureChristmasNightmareCanon(cached)
        : cached;
      return normalizeCharacterList(upgraded.characters || []);
    }
  }

  return normalizeCharacterList(data, supabase);
});

export async function createCharacter(character: Database['public']['Tables']['characters']['Insert']) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('characters')
    .insert(character)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating character: ${error.message}`);
  }

  return data;
}

export async function updateCharacter(id: string, updates: Database['public']['Tables']['characters']['Update']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating character: ${error.message}`);
  }

  return data;
}

export async function deleteCharacter(id: string) {
  const supabase = await createClient();
  
  // 1. Delete motives where the character is the owner or the target
  await supabase.from('motives').delete().or(`character_id.eq.${id},linked_character_id.eq.${id}`);
  
  // 2. Delete relationships involving this character
  await supabase.from('relationships').delete().or(`character_a_id.eq.${id},character_b_id.eq.${id}`);

  // 3. Delete the character
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id);
    
  if (error) {
    throw new Error(`Error deleting character: ${error.message}`);
  }
}

export const LOTR_CANONICAL_BEATS: Record<number, { event_title: string; description: string }> = {
  1: {
    event_title: '{{The Ex}} Learns About The {{The Host}} Affair',
    description:
      "{{The Ex}} discovers {{The Star}} has been secretly hooking up with {{The Host}} off-camera. Leaked video clips, group chat explosions, and producer {{The Producer Plant}}'s backstage instigation confirm the betrayal and trigger {{The Ex}}'s motive to poison {{The Host}}.",
  },
  2: {
    event_title: '{{The Ex}} Spirals & Researches Poison',
    description:
      'Consumed by jealousy, {{The Ex}} writes a bitter unsent note vowing not to stay quiet and searches online for sedatives, sleeping pills mixed with alcohol, and how to spike a drink without taste.',
  },
  3: {
    event_title: "{{The Superfan}} Tracks {{The Ex}}'s Poison Plot",
    description:
      "Through his stalking to-do list, iCloud hacking, and Eye Spy spyware on Device 269, {{The Superfan}} intercepts {{The Ex}}'s search history and realizes {{The Ex}} plans to poison {{The Host}}'s drink.",
  },
  4: {
    event_title: "{{The Superfan}}'s Rejected Confession to {{The Star}}",
    description:
      "Deluded into believing {{The Star}} shares his feelings, {{The Superfan}} confesses his love to her one final time. {{The Star}} laughs it off and rejects him. Humiliated and feeling invisible, {{The Superfan}} writes that there is 'only one way this ends'.",
  },
  5: {
    event_title: '{{The Ex}} Poisons The Drink With Temazepam',
    description:
      "High on cocaine in glam and spiralling, {{The Ex}} uses his prescribed Temazepam sleep medication, fatal when mixed with alcohol, to spike a champagne glass intended for {{The Host}}. {{The Hair & Makeup Artist}} warns {{The Producer Plant}}, who ignores it for content.",
  },
  6: {
    event_title: '{{The Superfan}} Switches The Poisoned Glass',
    description:
      'At 5:38 PM backstage, a hooded {{The Superfan}} reaches across the drinks table and switches the spiked champagne glass so that {{The Star}}, not {{The Host}}, will drink the fatal dose.',
  },
  7: {
    event_title: '{{The Star}} Collapses Mid-Toast',
    description:
      'During the 6:00 PM reunion toast, {{The Star}} drinks from the switched champagne glass and collapses while backstage warnings and a torn rejection note expose what happened.',
  },
  8: {
    event_title: "{{The Superfan}}'s Manifesto & Killer Confession",
    description:
      "Having drafted a viral social post ('Everything changes after tonight. They'll remember me'), {{The Superfan}} records a chilling voice confession admitting he watched {{The Ex}}'s plan and redirected the poisoned glass to become part of {{The Star}}'s story forever.",
  },
};

export function normalizePlotBeats(
  beats: any[],
  mysteryId: string,
  supabase?: any,
  dynamicRules?: Array<[RegExp, string]>
): any[] {
  if (!Array.isArray(beats) || mysteryId !== '69b65a91-1cc2-4267-94a4-59297428af28') {
    return (beats || []).map((b: any) => {
      const cleanTitle = replaceLegacyNamesWithRoleTokens(b.event_title, dynamicRules);
      const cleanDesc = replaceLegacyNamesWithRoleTokens(b.description, dynamicRules);
      if (supabase && b.id && (cleanTitle !== b.event_title || cleanDesc !== b.description)) {
        supabase
          .from('plot_beats')
          .update({
            event_title: cleanTitle,
            description: cleanDesc,
          })
          .eq('id', b.id)
          .then(() => {})
          .catch(() => {});
      }
      return {
        ...b,
        event_title: cleanTitle,
        description: cleanDesc,
      };
    });
  }

  return beats.map((beat: any) => {
    const canonical = LOTR_CANONICAL_BEATS[beat.beat_number];
    if (!canonical) {
      return {
        ...beat,
        event_title: replaceLegacyNamesWithRoleTokens(beat.event_title, dynamicRules),
        description: replaceLegacyNamesWithRoleTokens(beat.description, dynamicRules),
      };
    }

    if (beat.event_title !== canonical.event_title || beat.description !== canonical.description) {
      if (supabase && beat.id) {
        supabase
          .from('plot_beats')
          .update({
            event_title: canonical.event_title,
            description: canonical.description,
          })
          .eq('id', beat.id)
          .then(() => {})
          .catch(() => {});
      }
      return {
        ...beat,
        event_title: canonical.event_title,
        description: canonical.description,
      };
    }

    return beat;
  });
}

export const getPlotBeatsByMysteryId = cache(async (mysteryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plot_beats')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    const cached = getCachedMysterySnapshot(mysteryId);
    if (cached && Array.isArray(cached.plot_beats) && cached.plot_beats.length > 0) {
      const upgraded = isChristmasNightmareMystery(cached.title, cached.theme)
        ? ensureChristmasNightmareCanon(cached)
        : cached;
      return normalizePlotBeats(upgraded.plot_beats || [], mysteryId);
    }
    if (error) {
      console.error('Error fetching plot beats:', error);
    }
    return [];
  }

  return normalizePlotBeats(data || [], mysteryId, supabase);
});

export async function createPlotBeat(beat: Database['public']['Tables']['plot_beats']['Insert']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plot_beats')
    .insert(beat)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating plot beat: ${error.message}`);
  }

  return data;
}

export async function updatePlotBeat(id: string, updates: Database['public']['Tables']['plot_beats']['Update']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plot_beats')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating plot beat: ${error.message}`);
  }

  return data;
}

export async function deletePlotBeat(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('plot_beats')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Error deleting plot beat: ${error.message}`);
  }
}

export async function reorderPlotBeats(id: string, newSortOrder: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('plot_beats')
    .update({ sort_order: newSortOrder })
    .eq('id', id);

  if (error) {
    throw new Error(`Error reordering plot beat: ${error.message}`);
  }
}

function normalizeClueList(
  clues: any[],
  supabase?: any,
  dynamicRules?: Array<[RegExp, string]>
): any[] {
  if (!Array.isArray(clues)) return [];
  const normalized = clues.map((c: any) => {
    const cleanTitle = replaceLegacyNamesWithRoleTokens(c.title, dynamicRules);
    const cleanDesc = replaceLegacyNamesWithRoleTokens(c.description, dynamicRules);
    const cleanRawNotes = c.internal_notes ? replaceLegacyNamesWithRoleTokens(c.internal_notes, dynamicRules) : c.internal_notes;
    const cleanPrompt = c.prompt_template ? replaceLegacyNamesWithRoleTokens(c.prompt_template, dynamicRules) : c.prompt_template;

    if (
      supabase &&
      c.id &&
      (cleanTitle !== c.title ||
        cleanDesc !== c.description ||
        cleanRawNotes !== c.internal_notes ||
        cleanPrompt !== c.prompt_template)
    ) {
      supabase
        .from('clues')
        .update({
          title: cleanTitle,
          description: cleanDesc,
          internal_notes: cleanRawNotes,
          prompt_template: cleanPrompt,
        })
        .eq('id', c.id)
        .then(() => {}, () => {});
    }

    return {
      ...c,
      title: cleanTitle,
      description: cleanDesc,
      prompt_template: cleanPrompt,
      format: c.format || extractFormatTagFromNotes(cleanRawNotes) || null,
      audio_url: c.audio_url || extractAudioUrlFromNotes(cleanRawNotes) || null,
      voice_region: c.voice_region || extractVoiceRegionFromNotes(cleanRawNotes) || null,
      internal_notes: stripFormatTagFromNotes(cleanRawNotes),
    };
  });

  return shuffleCluesAcrossRounds(normalized);
}

export const getCluesByMysteryId = cache(async (mysteryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clues')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) {
    const cached = getCachedMysterySnapshot(mysteryId);
    if (cached && Array.isArray(cached.clues) && cached.clues.length > 0) {
      const upgraded = isChristmasNightmareMystery(cached.title, cached.theme)
        ? ensureChristmasNightmareCanon(cached)
        : cached;
      return normalizeClueList(upgraded.clues || []);
    }
    if (error) {
      console.error('Error fetching clues:', error);
    }
    return [];
  }

  return normalizeClueList(data || [], supabase);
});

export async function createClue(clue: Database['public']['Tables']['clues']['Insert']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clues')
    .insert(clue)
    .select()
    .single();

  if (error) {
    if (
      (clue.format !== undefined || clue.audio_url !== undefined || clue.voice_region !== undefined) &&
      (error.message?.includes('format') ||
        error.message?.includes('audio_url') ||
        error.message?.includes('voice_region') ||
        error.code === 'PGRST204' ||
        error.code === '42703' ||
        error.code === '23514')
    ) {
      const { format, audio_url, voice_region, ...rest } = clue;
      const fallbackPayload = {
        ...rest,
        internal_notes: embedFormatTagInNotes(clue.internal_notes, format, {
          audioUrl: audio_url,
          voiceRegion: voice_region,
        }),
      };
      const { data: retryData, error: retryError } = await supabase
        .from('clues')
        .insert(fallbackPayload)
        .select()
        .single();
      if (retryError) {
        throw new Error(`Error creating clue: ${retryError.message}`);
      }
      return {
        ...retryData,
        format: format || extractFormatTagFromNotes(retryData.internal_notes) || null,
        audio_url: audio_url ?? extractAudioUrlFromNotes(retryData.internal_notes) ?? null,
        voice_region: voice_region ?? extractVoiceRegionFromNotes(retryData.internal_notes) ?? null,
        internal_notes: stripFormatTagFromNotes(retryData.internal_notes),
      };
    }
    throw new Error(`Error creating clue: ${error.message}`);
  }

  return data;
}

export async function updateClue(id: string, updates: Database['public']['Tables']['clues']['Update']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clues')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (
      (updates.format !== undefined || updates.audio_url !== undefined || updates.voice_region !== undefined) &&
      (error.message?.includes('format') ||
        error.message?.includes('audio_url') ||
        error.message?.includes('voice_region') ||
        error.code === 'PGRST204' ||
        error.code === '42703' ||
        error.code === '23514')
    ) {
      const { format, audio_url, voice_region, ...rest } = updates;
      const { data: existing } = await supabase
        .from('clues')
        .select('internal_notes')
        .eq('id', id)
        .single();
      const rawExistingNotes = existing?.internal_notes ?? '';
      const preservedFormat = format !== undefined ? format : extractFormatTagFromNotes(rawExistingNotes);
      const preservedAudioUrl = audio_url !== undefined ? audio_url : extractAudioUrlFromNotes(rawExistingNotes);
      const preservedVoiceRegion =
        voice_region !== undefined ? voice_region : extractVoiceRegionFromNotes(rawExistingNotes);

      const baseUserNotes =
        updates.internal_notes !== undefined ? updates.internal_notes : stripFormatTagFromNotes(rawExistingNotes);

      const fallbackUpdates = {
        ...rest,
        internal_notes: embedFormatTagInNotes(baseUserNotes, preservedFormat, {
          audioUrl: preservedAudioUrl,
          voiceRegion: preservedVoiceRegion,
        }),
      };
      const { data: retryData, error: retryError } = await supabase
        .from('clues')
        .update(fallbackUpdates)
        .eq('id', id)
        .select()
        .single();
      if (retryError) {
        throw new Error(`Error updating clue: ${retryError.message}`);
      }
      return {
        ...retryData,
        format: preservedFormat || extractFormatTagFromNotes(retryData.internal_notes) || null,
        audio_url: preservedAudioUrl ?? extractAudioUrlFromNotes(retryData.internal_notes) ?? null,
        voice_region: preservedVoiceRegion ?? extractVoiceRegionFromNotes(retryData.internal_notes) ?? null,
        internal_notes: stripFormatTagFromNotes(retryData.internal_notes),
      };
    }
    throw new Error(`Error updating clue: ${error.message}`);
  }

  return data;
}

export async function deleteClue(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('clues')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Error deleting clue: ${error.message}`);
  }
}
