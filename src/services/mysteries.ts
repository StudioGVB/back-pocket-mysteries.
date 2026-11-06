import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database';
import {
  extractFormatTagFromNotes,
  extractAudioUrlFromNotes,
  extractVoiceRegionFromNotes,
  stripFormatTagFromNotes,
  embedFormatTagInNotes,
} from '@/utils/clue-format';
import { getCharacterRoleTitle, hydrateTextWithCharacters } from '@/utils/hydration';
import {
  LOTR_GOSSIP_MOODBOARD,
  LOTR_MAIN_COVER_URL,
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
import { cache } from 'react';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type MysteryInsert = Database['public']['Tables']['mysteries']['Insert'];

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

export async function getMysteries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mysteries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching mysteries:', error);
    return [];
  }

  return (data || []).map((m: any) => ensureRealityPromoCover(m, supabase));
}

export function replacePlaceholderNamesWithRoles(
  text: string | null | undefined,
  characters: any[]
): string {
  if (!text) return '';
  let result = text;

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
  return result;
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
];

export function replaceLegacyNamesWithRoleTokens(text: string | null | undefined): string {
  if (!text) return '';
  let updated = text;
  for (const [re, rep] of LEGACY_TOKEN_REPLACEMENTS) {
    updated = updated.replace(re, rep);
  }
  return updated;
}

function normalizeCharacterList(characters: any[] | null | undefined, supabase?: any): any[] {
  if (!Array.isArray(characters)) return [];
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
    for (const [re, rep] of LEGACY_TOKEN_REPLACEMENTS) {
      profileStr = profileStr.replace(re, rep);
    }
    const cleanedProfile = JSON.parse(profileStr);

    // Preserve real guest names so a guest named "Gabby" isn't overwritten with "The Star"
    if (origGuestName !== undefined) {
      if (origGuestName === 'The Star' && roleTitle === 'The Star' && cleanedProfile.guest_id) {
        cleanedProfile.guest_name = 'Gabby';
      } else {
        cleanedProfile.guest_name = origGuestName;
      }
    }
    if (origProfileName !== undefined) {
      if (origProfileName === 'The Star' && roleTitle === 'The Star' && cleanedProfile.guest_id) {
        cleanedProfile.name = 'Gabby';
      } else {
        cleanedProfile.name = origProfileName;
      }
    }

    // Ensure canonical role bio/outfit/act_summary are present if missing
    const canonicalMatch = LOVE_ON_THE_ROCKS_MYSTERY.characters.find(
      (c) => c.roleTitle.toLowerCase() === roleTitle.toLowerCase()
    );
    let profileRestored = false;
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
    }

    // Also normalize legacy names in character motives
    let normalizedMotives = char.motives;
    if (Array.isArray(char.motives)) {
      normalizedMotives = char.motives.map((m: any) => {
        if (!m || !m.notes) return m;
        const cleanNotes = replaceLegacyNamesWithRoleTokens(m.notes);
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

    const finalProfileStr = JSON.stringify(cleanedProfile);
    if (rawName !== cleanName || origProfileStr !== finalProfileStr || profileRestored) {
      if (supabase && char.id) {
        supabase
          .from('characters')
          .update({ name: cleanName, profile_data: cleanedProfile })
          .eq('id', char.id)
          .then(() => {});
      }
      return {
        ...char,
        name: cleanName,
        profile_data: cleanedProfile,
        motives: normalizedMotives,
      };
    }
    return {
      ...char,
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
      return cached;
    }
    if (error?.code === '42703') {
      console.error('CRITICAL: Database column missing in mystery fetch. Please run character SQL migration.', error);
    } else if (error) {
      console.error('Error fetching mystery details:', error);
    }
    return null;
  }

  const upgradedData = ensureRealityPromoCover(data, supabase);
  data.image_url = upgradedData.image_url;

  if (Array.isArray(data?.characters)) {
    data.characters = normalizeCharacterList(data.characters, supabase);
  }

  if (Array.isArray(data?.plot_beats)) {
    data.plot_beats = normalizePlotBeats(data.plot_beats, id, supabase);
  }

  if (Array.isArray(data?.subplots)) {
    data.subplots = data.subplots.map((s: any) => ({
      ...s,
      title: replaceLegacyNamesWithRoleTokens(s.title),
      description: s.description ? replaceLegacyNamesWithRoleTokens(s.description) : s.description,
    }));
  }

  if (data?.description && Array.isArray(data?.characters)) {
    data.description = hydrateTextWithCharacters(data.description, data.characters, 'role');
  }

  if (Array.isArray(data?.clues)) {
    data.clues = normalizeClueList(data.clues, supabase);
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

    if (fallbackError) {
      console.error('Fallback fetch characters error:', fallbackError);
      return [];
    }
    return normalizeCharacterList(fallbackData, supabase);
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
      "High on cocaine in glam and spiralling, {{The Ex}} uses his prescribed Temazepam sleep medication — fatal when mixed with alcohol — to spike a champagne glass intended for {{The Host}}. {{The Hair & Makeup Artist}} warns {{The Producer Plant}}, who ignores it for content.",
  },
  6: {
    event_title: '{{The Superfan}} Switches The Poisoned Glass',
    description:
      'At 5:38 PM backstage, a hooded {{The Superfan}} reaches across the drinks table and switches the spiked champagne glass so that {{The Star}} — not {{The Host}} — will drink the fatal dose.',
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

export function normalizePlotBeats(beats: any[], mysteryId: string, supabase?: any): any[] {
  if (!Array.isArray(beats) || mysteryId !== '69b65a91-1cc2-4267-94a4-59297428af28') {
    return (beats || []).map((b: any) => ({
      ...b,
      event_title: replaceLegacyNamesWithRoleTokens(b.event_title),
      description: replaceLegacyNamesWithRoleTokens(b.description),
    }));
  }

  return beats.map((beat: any) => {
    const canonical = LOTR_CANONICAL_BEATS[beat.beat_number];
    if (!canonical) {
      return {
        ...beat,
        event_title: replaceLegacyNamesWithRoleTokens(beat.event_title),
        description: replaceLegacyNamesWithRoleTokens(beat.description),
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

  if (error) {
    console.error('Error fetching plot beats:', error);
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

function normalizeClueList(clues: any[], supabase?: any): any[] {
  if (!Array.isArray(clues)) return [];
  return clues.map((c: any) => {
    const cleanTitle = replaceLegacyNamesWithRoleTokens(c.title);
    const cleanDesc = replaceLegacyNamesWithRoleTokens(c.description);
    const cleanRawNotes = c.internal_notes ? replaceLegacyNamesWithRoleTokens(c.internal_notes) : c.internal_notes;
    const cleanPrompt = c.prompt_template ? replaceLegacyNamesWithRoleTokens(c.prompt_template) : c.prompt_template;

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
}

export const getCluesByMysteryId = cache(async (mysteryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clues')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching clues:', error);
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
