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
  isLiveCarrierClue,
  loadLiveStateFromSupabaseClueCarrier,
} from '@/lib/live-session-store';
import {
  ACTIVE_MYSTERIES,
  ALL_CANONICAL_MYSTERIES,
  CanonicalActiveMystery,
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
import fs from 'fs';
import path from 'path';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type MysteryInsert = Database['public']['Tables']['mysteries']['Insert'];

function resolveLocalMysteryAudioUrl(
  mysteryId?: string | null,
  clueId?: string | null,
  existingAudioUrl?: string | null
): string | null {
  if (!mysteryId || !clueId) return existingAudioUrl || null;
  try {
    const localMp3Path = path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      'public',
      'mystery-audio',
      String(mysteryId),
      `${String(clueId)}.mp3`
    );
    if (fs.existsSync(localMp3Path)) {
      const mtimeMs = Math.floor(fs.statSync(localMp3Path).mtimeMs);
      const vMatch = String(existingAudioUrl || '').match(/[?&]v=(\d+)/);
      const existingVersion = vMatch ? Number(vMatch[1]) : 0;
      if (!existingAudioUrl || existingVersion < mtimeMs) {
        return `/mystery-audio/${mysteryId}/${clueId}.mp3?v=${mtimeMs}`;
      }
    }
  } catch {
    // Non-fatal
  }
  return existingAudioUrl || null;
}

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
      mystery.spice_level !== 'mild' ||
      mystery.complexity !== 'medium' ||
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
        spice_level: 'mild',
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
  mystery.spice_level = 'mild';
  if (needsImageUpgrade) {
    mystery.image_url = canonicalChristmasImageUrl;
  }

  const isBaseChristmasTemplate = mysteryId === '61196e53-09c3-427f-8862-30151f2ca75b';
  const SUPERSEDED_CHRISTMAS_PORTRAIT_HASHES = [
    '20058bab3911',
    'b06f3ace7cdf',
    '63aa0e7355d6',
    '0b6e029e9a8d',
    'd468b1b12c33',
    '1dcd5acb69d9',
  ];
  const LUKE_HUSBAND_PORTRAIT =
    'https://tlmgiveaotdhhvhebwvc.supabase.co/storage/v1/object/public/character-images/standard-characters/61196e53-09c3-427f-8862-30151f2ca75b/da18ef00-ecdc-41e7-8c71-97d78046e43b-28ec1e5263c3.jpg';

  // Sync characters + motives
  const canonicalChars = CHRISTMAS_NIGHTMARE_CHARACTERS.map((spec) => {
    const id = charIdMap[spec.key];
    const existing = existingChars.find((c: any) => c?.id === id) || {};
    const existingProfile = existing.profile_data || {};

    // For customer clones (not the base pack template), do NOT copy base-pack admin portraits from spec.profile_data
    const baseSpecProfile: Record<string, any> = { ...spec.profile_data };
    if (!isBaseChristmasTemplate) {
      delete baseSpecProfile.standard_character_photo_url;
      delete baseSpecProfile.outfit_image_url;
      delete baseSpecProfile.avatar_url;
      delete baseSpecProfile.guest_id;
      delete baseSpecProfile.guest_name;
    }

    const existingGuestName = String(existingProfile.guest_name || '').trim().toLowerCase();
    const hasSupersededPortrait =
      isBaseChristmasTemplate &&
      SUPERSEDED_CHRISTMAS_PORTRAIT_HASHES.some(
        (h) =>
          String(existingProfile.standard_character_photo_url || '').includes(h) ||
          String(existingProfile.outfit_image_url || '').includes(h) ||
          String(existingProfile.avatar_url || '').includes(h)
      );

    const isHusbandAlexMismatch =
      isBaseChristmasTemplate &&
      spec.key === 'husband' &&
      (existingGuestName === 'alex' ||
        String(existingProfile.standard_character_photo_url || '').includes('b90b57ad1e85'));

    const isHusbandLukeMismatch =
      isBaseChristmasTemplate &&
      spec.key === 'husband' &&
      existingGuestName === 'luke' &&
      String(existingProfile.standard_character_photo_url || '').includes('b90b57ad1e85');

    // Preserve any linked guest info while replacing bio/act/outfit with canonical Christmas Nightmare profile
    const mergedProfile: Record<string, any> = {
      ...baseSpecProfile,
      ...existingProfile,
      color: spec.profile_data.color,
      bio: spec.profile_data.bio,
      outfit_advice: spec.profile_data.outfit_advice,
      outfit_reference_images: spec.profile_data.outfit_reference_images,
      act_summary: spec.profile_data.act_summary,
      act_bullets: spec.profile_data.act_bullets,
      ...(hasSupersededPortrait
        ? {
            standard_character_photo_url: spec.profile_data.standard_character_photo_url,
            outfit_image_url: spec.profile_data.outfit_image_url,
          }
        : {}),
      ...(isHusbandAlexMismatch || isHusbandLukeMismatch
        ? {
            guest_id: '0370c2e5-a829-4b37-9eff-8251c337aa34',
            guest_name: 'Luke',
            gender: 'male',
            eye_color: 'Blue',
            height: 'Very Tall',
            avatar_url: spec.profile_data.avatar_url,
            standard_character_photo_url: LUKE_HUSBAND_PORTRAIT,
            outfit_image_url: LUKE_HUSBAND_PORTRAIT,
          }
        : {}),
    };

    // On customer clones, strip any leftover base-pack portrait URL that belongs to 61196e53-09c3-427f-8862-30151f2ca75b
    let strippedStaleBasePortrait = false;
    if (!isBaseChristmasTemplate) {
      if (
        String(mergedProfile.standard_character_photo_url || '').includes(
          '/standard-characters/61196e53-09c3-427f-8862-30151f2ca75b/'
        )
      ) {
        delete mergedProfile.standard_character_photo_url;
        delete mergedProfile.standard_character_photo_hash;
        strippedStaleBasePortrait = true;
      }
      if (
        String(mergedProfile.outfit_image_url || '').includes(
          '/standard-characters/61196e53-09c3-427f-8862-30151f2ca75b/'
        )
      ) {
        delete mergedProfile.outfit_image_url;
        strippedStaleBasePortrait = true;
      }
    }

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

    const needsCharProfileSync =
      !hasCanonicalNames ||
      hasSupersededPortrait ||
      isHusbandAlexMismatch ||
      isHusbandLukeMismatch ||
      strippedStaleBasePortrait ||
      existingProfile.outfit_advice !== spec.profile_data.outfit_advice ||
      JSON.stringify(existingProfile.outfit_reference_images) !== JSON.stringify(spec.profile_data.outfit_reference_images) ||
      JSON.stringify(existingProfile.act_bullets) !== JSON.stringify(spec.profile_data.act_bullets);

    if (supabase && mysteryId && needsCharProfileSync) {
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

    const SUPERSEDED_CHRISTMAS_CLUE_IMAGE_HASHES = [
      'b46530763357',
      'bbc353dd6d00',
      'a2d1f7c12954',
      '0f261e72ed79',
      '558196e7f2b9',
      'af75388909ab',
      '5bb7831c6e25',
      '1a577d073d89',
      '2c4d42f54455',
      '38ea2f8993a9',
      'b2b4930ec6c4',
      'a4e388b33c63',
      '5826261dc24b',
      '9be90d8d00e5',
      'b5c9ed05ea0e',
      '4db82731c4cc',
      '3cbdfc51cf8f',
      '2de9619b65ec',
      '1bc1e4116176',
      '45fd5371bedd',
      '6c95b13d6d2e',
      '840601e54d17',
      '9d445ddd408d',
      '0eefa60444a8',
      'c105d7a3c582',
      '51a87e7b96f1',
      '9dcdbd61ef87',
      '358cd121a6c5',
      '7b350e41e42b',
      '00cc6f5af6b0',
      'mwvwkbo7',
    ];

    // Sync clues if present
    if (Array.isArray(mystery.clues)) {
      const existingClues = mystery.clues.filter((c: any) => !isLiveCarrierClue(c));
      mystery.clues = CHRISTMAS_NIGHTMARE_CLUES.map((cSpec, idx) => {
        const existingClue = existingClues.find((ec: any) => ec.id === cSpec.legacyId) || existingClues[idx] || null;
        const clueId = existingClue?.id || cSpec.legacyId || crypto.randomUUID();
        const linkedBeatId = cSpec.beatNumber ? beatIdByNumber[cSpec.beatNumber] || null : null;

        const rawPreservedAudioUrl =
          existingClue?.audio_url || extractAudioUrlFromNotes(existingClue?.internal_notes) || cSpec.audio_url || null;
        const preservedAudioUrl = resolveLocalMysteryAudioUrl(mysteryId, clueId, rawPreservedAudioUrl);
        const preservedVoiceRegion =
          existingClue?.voice_region || extractVoiceRegionFromNotes(existingClue?.internal_notes) || cSpec.voice_region || null;

        const isNonVisualClue =
          cSpec.format === 'chat' ||
          cSpec.format === 'audio' ||
          cSpec.format === 'search_log' ||
          !cSpec.static_image_url;

        const hasSupersededClueImage = SUPERSEDED_CHRISTMAS_CLUE_IMAGE_HASHES.some((h) =>
          String(existingClue?.static_image_url || '').includes(h)
        );

        const preservedStaticImage = isNonVisualClue
          ? null
          : hasSupersededClueImage
          ? cSpec.static_image_url || null
          : existingClue?.static_image_url || cSpec.static_image_url || null;

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
            existingClue.round_number !== cSpec.round_number ||
            existingClue.generation_prompt !== cSpec.generation_prompt ||
            existingClue.static_image_url !== preservedStaticImage ||
            existingClue.format !== cSpec.format ||
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

  if (mysteryId) {
    cacheMysterySnapshot(mysteryId, mystery);
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

/**
 * Authoritative resolver for whether a Mystery Base Pack is currently Posted Publicly (`status === 'published'`).
 * Checks:
 * 1. Live Supabase `mysteries` row status (if accessible)
 * 2. `.live-mystery-cache.json` cached status (updated immediately when Builder saves Draft / Live / Archived)
 * 3. Canonical default status (`canonical.status === 'published'`)
 * Never returns any customer-cloned instance (`__u_`).
 */
export async function getPublicMarketingMysteries(): Promise<CanonicalActiveMystery[]> {
  'use cache';
  const { cacheLife } = await import('next/cache');
  cacheLife('minutes');

  const slugify = (s: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const dbStatusById = new Map<string, string>();
  const dbStatusBySlug = new Map<string, string>();

  try {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (sbUrl && sbKey) {
      const { createClient: createAnonClient } = await import('@supabase/supabase-js');
      const supabase = createAnonClient(sbUrl, sbKey);
      const { data: rows } = await supabase
        .from('mysteries')
        .select('id, title, status');
      for (const r of rows || []) {
        if (!r?.id || String(r.id).includes('__u_')) continue;
        if (r.status) {
          dbStatusById.set(String(r.id).toLowerCase(), String(r.status));
          const sl = slugify(r.title || '');
          if (sl && !dbStatusBySlug.has(sl)) {
            dbStatusBySlug.set(sl, String(r.status));
          }
        }
      }
    }
  } catch {
    // Non-fatal
  }

  const cachedList = getAllCachedMysteries();
  const cachedStatusById = new Map<string, string>();
  const cachedStatusBySlug = new Map<string, string>();
  for (const cm of cachedList) {
    if (!cm?.id || String(cm.id).includes('__u_') || cm.template_mystery_id) continue;
    if (cm.status) {
      cachedStatusById.set(String(cm.id).toLowerCase(), String(cm.status));
      const sl = slugify(cm.title || '');
      if (sl && !cachedStatusBySlug.has(sl)) {
        cachedStatusBySlug.set(sl, String(cm.status));
      }
    }
  }

  return ALL_CANONICAL_MYSTERIES.filter((canon) => {
    const idKey = canon.id.toLowerCase();
    const slugKey = canon.slug.toLowerCase();
    const authoritativeStatus =
      dbStatusById.get(idKey) ||
      cachedStatusById.get(idKey) ||
      dbStatusBySlug.get(slugKey) ||
      cachedStatusBySlug.get(slugKey) ||
      canon.status;
    return authoritativeStatus === 'published';
  });
}

export async function getPublicMarketingMysteryBySlugOrId(
  slugOrId: string
): Promise<CanonicalActiveMystery | null> {
  'use cache';
  const { cacheLife } = await import('next/cache');
  cacheLife('minutes');

  const normalized = (slugOrId || '').trim().toLowerCase();
  if (!normalized) return null;
  const publishedList = await getPublicMarketingMysteries();
  return (
    publishedList.find(
      (m) =>
        m.slug.toLowerCase() === normalized ||
        m.id.toLowerCase() === normalized ||
        m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === normalized
    ) || null
  );
}

export async function getPublishedMysteries() {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('mysteries')
    .select('*, characters(id, name, gender, is_victim, plot_role, archetype, is_mandatory, profile_data)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })) as any;

  if (error) {
    console.error('Error fetching published mysteries:', error);
  }

  const publishedCanon = await getPublicMarketingMysteries();
  const byId = new Map<string, any>();
  const seenSlugs = new Set<string>();
  const slugify = (s: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  // 1. Add DB published base packs (excluding customer clones)
  for (const m of data || []) {
    if (!m?.id || String(m.id).includes('__u_') || (m as any).template_mystery_id) continue;
    const cachedSnap = getCachedMysterySnapshot(m.id);
    if (cachedSnap && cachedSnap.status && cachedSnap.status !== 'published') {
      continue;
    }
    const sl = slugify(m.title || '');
    if (sl && seenSlugs.has(sl)) continue;
    if (sl) seenSlugs.add(sl);

    const upgraded = ensureChristmasNightmareCanon(ensureRealityPromoCover(m, supabase), supabase);
    const chars = normalizeCharacterList(upgraded.characters || []);
    byId.set(m.id, {
      ...upgraded,
      status: 'published',
      characters: chars,
      description: replacePlaceholderNamesWithRoles(upgraded.description, chars),
    });
  }

  // 2. Ensure all canonical published packs (e.g. Christmas Nightmare) are present even for anonymous visitors
  for (const canon of publishedCanon) {
    const sl = slugify(canon.title || canon.slug);
    if (byId.has(canon.id) || (sl && seenSlugs.has(sl))) continue;
    if (sl) seenSlugs.add(sl);

    const cachedSnap = getCachedMysterySnapshot(canon.id);
    const sourceObj = cachedSnap && cachedSnap.status === 'published' ? cachedSnap : canon;
    const upgraded = ensureChristmasNightmareCanon(
      ensureRealityPromoCover({
        ...sourceObj,
        id: canon.id,
        status: 'published',
      })
    );
    const chars = normalizeCharacterList(upgraded.characters || []);
    byId.set(canon.id, {
      ...upgraded,
      status: 'published',
      characters: chars,
      description: replacePlaceholderNamesWithRoles(upgraded.description, chars),
    });
  }

  return Array.from(byId.values());
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

    mystery =
      (allMysteries || []).find(
        (m: any) =>
          !String(m.id || '').includes('__u_') &&
          slugify(m.title || '') === idOrSlug.toLowerCase() &&
          m.status === 'published'
      ) ||
      (allMysteries || []).find(
        (m: any) =>
          !String(m.id || '').includes('__u_') &&
          slugify(m.title || '') === idOrSlug.toLowerCase()
      ) ||
      null;
  }

  // If DB returned a base template row that is NOT published (e.g. 'draft' or 'archived'), block public access
  const isCustomerInstance = String(idOrSlug).includes('__u_');
  if (mystery && !isCustomerInstance && mystery.status && mystery.status !== 'published') {
    return null;
  }

  if (!mystery) {
    const cached = isUuid
      ? getCachedMysterySnapshot(idOrSlug)
      : getAllCachedMysteries().find(
          (m: any) =>
            !String(m.id || '').includes('__u_') &&
            slugify(m.title || '') === idOrSlug.toLowerCase() &&
            m.status === 'published'
        ) ||
        getAllCachedMysteries().find(
          (m: any) =>
            !String(m.id || '').includes('__u_') &&
            slugify(m.title || '') === idOrSlug.toLowerCase()
        ) ||
        null;

    if (cached) {
      // Only return cached base mystery if it is published (or is a customer's isolated session instance)
      if (!isCustomerInstance && cached.status && cached.status !== 'published') {
        return null;
      }
      const upgradedCached = ensureChristmasNightmareCanon(ensureRealityPromoCover(cached));
      const cleanChars = normalizeCharacterList(upgradedCached.characters || []);
      return {
        ...upgradedCached,
        description: replacePlaceholderNamesWithRoles(upgradedCached.description, cleanChars),
        characters: cleanChars,
      };
    }

    const canonical = await getPublicMarketingMysteryBySlugOrId(idOrSlug);
    if (canonical) {
      const upgradedCanonical = ensureChristmasNightmareCanon(
        ensureRealityPromoCover({
          ...canonical,
          status: 'published',
        })
      );
      const cleanChars = normalizeCharacterList(upgradedCanonical.characters || []);
      return {
        ...upgradedCanonical,
        description: replacePlaceholderNamesWithRoles(upgradedCanonical.description, cleanChars),
        characters: cleanChars,
      };
    }

    return null;
  }

  mystery = ensureChristmasNightmareCanon(ensureRealityPromoCover(mystery, supabase), supabase);

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mystery.id)
    .order('is_victim', { ascending: false })
    .order('is_mandatory', { ascending: false })
    .order('created_at', { ascending: true });

  const charList = normalizeCharacterList(
    characters && characters.length > 0 ? characters : mystery.characters || [],
    supabase
  );

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
    const guestIdStr = String(cleanedProfile.guest_id || '').trim();
    const isUuidGuest = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(guestIdStr);
    const hasMismatchedGuestUuidInAvatar =
      isUuidGuest &&
      (curAvatarUrl.includes('character-images') || curAvatarUrl.includes('generated-avatars')) &&
      /[0-9a-f]{8}-[0-9a-f]{4}-/i.test(curAvatarUrl) &&
      !curAvatarUrl.includes(guestIdStr);

    if (guestIdStr && (!curAvatarUrl.includes('aiPhotoUrl=') || hasMismatchedGuestUuidInAvatar)) {
      let recoveredAiPhotoUrl: string | null = null;

      // 1. Check sibling characters or cached mysteries for an avatar_url whose filename matches this specific guest_id
      const allCandidateChars = [
        ...characters,
        ...cachedMysteriesList.flatMap((cm: any) => (Array.isArray(cm?.characters) ? cm.characters : [])),
      ];
      for (const cc of allCandidateChars) {
        const ccPd = cc?.profile_data;
        const ccAvatar = String(ccPd?.avatar_url || '');
        if (
          ccAvatar &&
          ccAvatar.includes('aiPhotoUrl=') &&
          (ccAvatar.includes(guestIdStr) ||
            (String(ccPd?.guest_id || '') === guestIdStr && !hasMismatchedGuestUuidInAvatar))
        ) {
          cleanedProfile.avatar_url = ccAvatar;
          profileRestored = true;
          recoveredAiPhotoUrl = ccAvatar;
          break;
        }
      }

      // 2. Check public/generated-avatars/${guestId}-*.jpg
      if (!recoveredAiPhotoUrl && localGeneratedFiles.length > 0) {
        const matchedFile = localGeneratedFiles.find(
          (f) => f.startsWith(`${guestIdStr}-`) && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'))
        );
        if (matchedFile) {
          const localUrl = `/generated-avatars/${matchedFile}`;
          const baseAvatar =
            !hasMismatchedGuestUuidInAvatar && curAvatarUrl
              ? curAvatarUrl
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanedProfile.guest_name || cleanedProfile.name || guestIdStr)}`;
          const separator = baseAvatar.includes('?') ? '&' : '?';
          cleanedProfile.avatar_url = `${baseAvatar}${separator}aiPhotoUrl=${encodeURIComponent(localUrl)}`;
          cleanedProfile.standard_character_photo_url = localUrl;
          profileRestored = true;
          recoveredAiPhotoUrl = localUrl;
        }
      }

      // 3. If avatar_url still embeds a different guest's UUID, clear it so standard_character_photo_url is used
      if (!recoveredAiPhotoUrl && hasMismatchedGuestUuidInAvatar) {
        delete cleanedProfile.avatar_url;
        profileRestored = true;
      }
    }

    // Keep cleanedProfile.accent and cleanedProfile.age synced with live avatar_url query parameters
    const finalAvatarUrl = String(cleanedProfile.avatar_url || '');
    if (finalAvatarUrl && !finalAvatarUrl.startsWith('data:')) {
      const accMatch = finalAvatarUrl.match(/[?&]accent=([^&]+)/);
      if (accMatch) {
        const urlAccent = decodeURIComponent(accMatch[1]).trim();
        if (urlAccent && cleanedProfile.accent !== urlAccent) {
          cleanedProfile.accent = urlAccent;
          profileRestored = true;
        }
      }
      const ageMatch = finalAvatarUrl.match(/[?&]age=([^&]+)/);
      if (ageMatch) {
        const urlAge = decodeURIComponent(ageMatch[1]).trim();
        if (urlAge && cleanedProfile.age !== urlAge) {
          cleanedProfile.age = urlAge;
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

function overlayLiveCarrierCharacters(targetCharacters: any[], carrierCharacters: any[] | null | undefined): any[] {
  if (!Array.isArray(targetCharacters) || !Array.isArray(carrierCharacters) || carrierCharacters.length === 0) {
    return targetCharacters || [];
  }
  return targetCharacters.map((tc: any, idx: number) => {
    const tcRole = getCharacterRoleTitle(tc).toLowerCase();
    const match =
      carrierCharacters.find((cc: any) => cc?.id === tc?.id) ||
      carrierCharacters.find((cc: any) => getCharacterRoleTitle(cc).toLowerCase() === tcRole) ||
      carrierCharacters[idx];
    if (!match?.profile_data) return tc;
    const tcPd = tc.profile_data || {};
    const mPd = match.profile_data || {};
    return {
      ...tc,
      profile_data: {
        ...tcPd,
        ...(mPd.guest_id ? { guest_id: mPd.guest_id } : {}),
        ...(mPd.guest_name ? { guest_name: mPd.guest_name } : {}),
        ...(mPd.name ? { name: mPd.name } : {}),
        ...(mPd.gender ? { gender: mPd.gender } : {}),
        ...(mPd.accent ? { accent: mPd.accent } : {}),
        ...(mPd.age ? { age: mPd.age } : {}),
        ...(mPd.eye_color ? { eye_color: mPd.eye_color } : {}),
        ...(mPd.height ? { height: mPd.height } : {}),
        ...(mPd.avatar_url ? { avatar_url: mPd.avatar_url } : {}),
        ...(mPd.standard_character_photo_url
          ? {
              standard_character_photo_url: mPd.standard_character_photo_url,
              standard_character_photo_hash: mPd.standard_character_photo_hash,
              outfit_image_url: mPd.standard_character_photo_url,
            }
          : {}),
        ...(mPd.is_active_in_session !== undefined
          ? { is_active_in_session: mPd.is_active_in_session }
          : {}),
        ...(mPd.__game_session ? { __game_session: mPd.__game_session } : {}),
      },
    };
  });
}

export const getMysteryById = cache(async (id: string) => {
  const supabase = await createClient();
  const [{ data, error }, liveCarrier] = await Promise.all([
    supabase
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
      .single() as any,
    loadLiveStateFromSupabaseClueCarrier(id, supabase),
  ]);

  if (error || !data) {
    const cached = getCachedMysterySnapshot(id);
    if (cached) {
      if (liveCarrier?.characters?.length) {
        cached.characters = overlayLiveCarrierCharacters(cached.characters || [], liveCarrier.characters);
      }
      if (Array.isArray(cached.clues)) {
        cached.clues = cached.clues.filter((c: any) => !isLiveCarrierClue(c));
      }
      return ensureChristmasNightmareCanon(cached, supabase);
    }

    const templateLookupId = liveCarrier?.templateMysteryId || id;
    const isChristmas =
      templateLookupId === '61196e53-09c3-427f-8862-30151f2ca75b' ||
      id === '61196e53-09c3-427f-8862-30151f2ca75b' ||
      isChristmasNightmareMystery(liveCarrier?.title, liveCarrier?.theme);

    if (isChristmas) {
      const christmasBase = ensureChristmasNightmareCanon({
        id,
        template_mystery_id: '61196e53-09c3-427f-8862-30151f2ca75b',
        title: CHRISTMAS_NIGHTMARE_TITLE,
        theme: CHRISTMAS_NIGHTMARE_THEME,
        description: CHRISTMAS_NIGHTMARE_DESCRIPTION,
        inside_jokes: CHRISTMAS_NIGHTMARE_INSIDE_JOKES,
        min_players: 6,
        max_players: 6,
        complexity: 'medium',
        spice_level: 'mild',
        status: 'published',
        current_round: liveCarrier?.current_round ?? 0,
        characters: [],
        plot_beats: [],
        clues: [],
        subplots: [],
      });
      if (liveCarrier?.characters?.length) {
        christmasBase.characters = overlayLiveCarrierCharacters(
          christmasBase.characters,
          liveCarrier.characters
        );
      }
      christmasBase.characters = normalizeCharacterList(christmasBase.characters);
      cacheMysterySnapshot(id, christmasBase);
      return christmasBase;
    }

    const canonical = getCanonicalActiveMysteryBySlugOrId(templateLookupId, { includeDrafts: true });
    if (canonical) {
      const upgradedCanonical = ensureChristmasNightmareCanon(
        ensureRealityPromoCover({
          ...canonical,
          id,
          status: canonical.status || 'draft',
          current_round: liveCarrier?.current_round ?? 0,
          plot_beats:
            canonical.id === '69b65a91-1cc2-4267-94a4-59297428af28'
              ? Object.entries(LOTR_CANONICAL_BEATS).map(([num, b]) => ({
                  id: `lotr-beat-${num}`,
                  mystery_id: id,
                  beat_number: Number(num),
                  sort_order: Number(num),
                  event_title: b.event_title,
                  description: b.description,
                  is_required: true,
                  beat_type: 'discovery',
                  timeline_phase: 'investigation',
                }))
              : [],
        })
      );
      if (liveCarrier?.characters?.length) {
        upgradedCanonical.characters = overlayLiveCarrierCharacters(
          upgradedCanonical.characters || [],
          liveCarrier.characters
        );
      }
      upgradedCanonical.characters = normalizeCharacterList(upgradedCanonical.characters || []);
      cacheMysterySnapshot(id, upgradedCanonical);
      return upgradedCanonical;
    }
    if (error?.code === '42703') {
      console.error('CRITICAL: Database column missing in mystery fetch. Please run character SQL migration.', error);
    } else if (error) {
      console.error('Error fetching mystery details:', error);
    }
    return null;
  }

  if (Array.isArray(data.clues)) {
    data.clues = data.clues.filter((c: any) => !isLiveCarrierClue(c));
  }

  const cachedSnapshot = getCachedMysterySnapshot(id);
  if (cachedSnapshot) {
    if (Array.isArray(data.characters) && Array.isArray(cachedSnapshot.characters)) {
      data.characters = overlayLiveCarrierCharacters(data.characters, cachedSnapshot.characters);
    }
    if (Array.isArray(data.clues) && Array.isArray(cachedSnapshot.clues)) {
      data.clues = data.clues.map((dbClue: any) => {
        const cachedClue = cachedSnapshot.clues.find((cc: any) => cc?.id === dbClue?.id);
        if (cachedClue?.static_image_url) {
          return {
            ...dbClue,
            static_image_url: cachedClue.static_image_url,
          };
        }
        return dbClue;
      });
    }
  }

  if (liveCarrier?.characters?.length && Array.isArray(data.characters)) {
    data.characters = overlayLiveCarrierCharacters(data.characters, liveCarrier.characters);
  }

  const upgradedData = ensureChristmasNightmareCanon(ensureRealityPromoCover(data, supabase), supabase);
  data.image_url = upgradedData.image_url;

  if (liveCarrier?.characters?.length && Array.isArray(data.characters)) {
    data.characters = overlayLiveCarrierCharacters(data.characters, liveCarrier.characters);
  }

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
  const [{ data, error }, liveCarrier] = await Promise.all([
    supabase
      .from('characters')
      .select(`
        *,
        motives!motives_character_id_fkey (*)
      `)
      .eq('mystery_id', mysteryId)
      .order('created_at', { ascending: true }) as any,
    loadLiveStateFromSupabaseClueCarrier(mysteryId, supabase),
  ]);

  if (error || !data || data.length === 0) {
    const full = await getMysteryById(mysteryId);
    if (full && Array.isArray(full.characters) && full.characters.length > 0) {
      return full.characters;
    }
    return [];
  }

  const overlaid = liveCarrier?.characters?.length
    ? overlayLiveCarrierCharacters(data, liveCarrier.characters)
    : data;
  return normalizeCharacterList(overlaid, supabase);
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
  const normalized = clues.filter((c: any) => !isLiveCarrierClue(c)).map((c: any) => {
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

    const canonicalChristmasSpec = CHRISTMAS_NIGHTMARE_CLUES.find((cc) => cc.legacyId === c.id);
    const rawAudioUrl =
      c.audio_url || extractAudioUrlFromNotes(cleanRawNotes) || canonicalChristmasSpec?.audio_url || null;
    const resolvedAudioUrl = resolveLocalMysteryAudioUrl(c.mystery_id, c.id, rawAudioUrl);

    return {
      ...c,
      title: cleanTitle,
      description: cleanDesc,
      prompt_template: cleanPrompt,
      format: c.format || extractFormatTagFromNotes(cleanRawNotes) || canonicalChristmasSpec?.format || null,
      audio_url: resolvedAudioUrl,
      voice_region: c.voice_region || extractVoiceRegionFromNotes(cleanRawNotes) || canonicalChristmasSpec?.voice_region || (resolvedAudioUrl ? 'en-AU' : null),
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
