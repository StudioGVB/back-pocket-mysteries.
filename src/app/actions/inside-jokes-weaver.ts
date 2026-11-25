'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getStoredGameSession,
  getCachedMysterySnapshot,
  cacheMysterySnapshot,
  updateMysteryGenerationInStore,
  loadLiveStateFromSupabaseClueCarrier,
  syncLiveStateToSupabaseClueCarrier,
} from '@/lib/live-session-store';
import { getMysteryById } from '@/services/mysteries';
import { getCharacterRoleTitle, getCharacterDisplayName } from '@/utils/hydration';
import { inferClueFormat } from '@/utils/clue-format';
import { createClient } from '@/utils/supabase/server';

export interface WeaveInsideJokesResult {
  success: boolean;
  charactersUpdated: number;
  chatCluesUpdated: number;
  error?: string;
}

/**
 * 3-Zone Personality & Inside Joke Weaver (Stage 0 of Mystery Generation + On-Demand Host Re-Weave):
 * - Zone 1: Pre-Party Character Sheet ("First Glance Bio" addon + "How to Play" roleplay bullet)
 * - Zone 2: Secret Party-Night "Roast & Banter Mission" on the player's Live Game Character Sheet
 * - Zone 3: 1-line opening banter on Round 1/2 Leaked Chat / Social Post clues (100% preserving all forensic text & HH:MM timestamps verbatim)
 * (Zone 4 Relationship Cards are intentionally left 100% untouched.)
 */
export async function weavePersonalitiesAndInsideJokesAction(
  mysteryId: string,
  overrideGroupJokes?: string
): Promise<WeaveInsideJokesResult> {
  try {
    await loadLiveStateFromSupabaseClueCarrier(mysteryId);
    const baseId = mysteryId.split('__u_')[0];
    if (baseId !== mysteryId) {
      await loadLiveStateFromSupabaseClueCarrier(baseId);
    }

    const session = getStoredGameSession(mysteryId);
    const baseSession = baseId !== mysteryId ? getStoredGameSession(baseId) : null;

    const groupInsideJokes = (
      overrideGroupJokes ??
      session?.partyDetails?.groupInsideJokes ??
      baseSession?.partyDetails?.groupInsideJokes ??
      ''
    ).trim();

    let snapshot = getCachedMysterySnapshot(mysteryId);
    if (!snapshot) {
      const fetched = await getMysteryById(mysteryId);
      if (fetched) {
        snapshot = fetched;
      }
    }
    if (!snapshot || !Array.isArray(snapshot.characters)) {
      return { success: false, charactersUpdated: 0, chatCluesUpdated: 0, error: 'Mystery snapshot not found.' };
    }

    const characters: any[] = snapshot.characters || [];
    const activeChars = characters.filter((c) => c.profile_data?.is_active_in_session !== false);
    const clues: any[] = Array.isArray(snapshot.clues) ? snapshot.clues : [];

    const jokeItems = groupInsideJokes
      .split(/\n|;|•/)
      .map((s) => s.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean);

    // Find up to 2 Round 1 or Round 2 chat / social_post clues for Zone 3
    const eligibleChatClues = clues
      .filter((c) => {
        const fmt = c?.format || inferClueFormat(c);
        const r = Number(c?.round_unlocked ?? c?.round_number ?? 1);
        return (fmt === 'chat' || fmt === 'social_post') && r <= 2 && Boolean(c?.description);
      })
      .slice(0, 2);

    // Build deterministic fallback values first so every character is guaranteed a tailored Zone 1 & Zone 2 output
    const charPlans = new Map<
      string,
      {
        custom_act_bullet: string;
        custom_blurb_addon: string;
        roast_mission: string;
      }
    >();

    activeChars.forEach((char, idx) => {
      const profile = char.profile_data || {};
      const guestName = getCharacterDisplayName(char) || 'you';
      const roleTitle = getCharacterRoleTitle(char) || 'The Suspect';
      const traits: string[] = Array.isArray(profile.traits)
        ? profile.traits.map((t: any) => String(t || '').trim()).filter(Boolean)
        : [];
      const guestBio = String(profile.guest_bio || '').trim();
      const assignedGroupJoke = jokeItems.length > 0 ? jokeItems[idx % jokeItems.length] : '';
      const otherChar = activeChars[(idx + 1) % activeChars.length];
      const otherName = otherChar ? getCharacterDisplayName(otherChar) : 'another suspect';

      const personalHook =
        traits.length > 0 && guestBio
          ? `${traits.slice(0, 2).join(' and ')} (${guestBio})`
          : traits.length > 0
          ? traits.slice(0, 2).join(' and ')
          : guestBio
          ? guestBio
          : assignedGroupJoke || 'the group’s resident main character';

      const jokeRef = assignedGroupJoke
        ? ` — and find an excuse to bring up "${assignedGroupJoke}" with a straight face`
        : '';

      const custom_act_bullet = `Play ${roleTitle} with ${guestName}'s signature ${personalHook} energy${jokeRef}.`;
      const custom_blurb_addon =
        traits.length > 0 || guestBio || assignedGroupJoke
          ? `Among close friends, ${guestName} is known for ${personalHook}${
              assignedGroupJoke && !personalHook.includes(assignedGroupJoke)
                ? ` and never letting anyone forget about ${assignedGroupJoke}`
                : ''
            }.`
          : '';
      const roast_mission = assignedGroupJoke
        ? `Before answering any Round 1 questions about your alibi, corner ${otherName} and accuse them of still deflecting from "${assignedGroupJoke}"${
            traits[0] ? ` while leaning into your ${traits[0]} reputation` : ''
          }.`
        : `During Round 1 questioning, use your real-life ${personalHook} energy to flip the interrogation back onto ${otherName} before revealing where you were.`;

      charPlans.set(char.id, {
        custom_act_bullet,
        custom_blurb_addon,
        roast_mission,
      });
    });

    const chatOpeners = new Map<string, string>();
    eligibleChatClues.forEach((clue, idx) => {
      const joke = jokeItems[idx % Math.max(1, jokeItems.length)];
      const speakerChar = activeChars[idx % Math.max(1, activeChars.length)];
      const speakerName = speakerChar ? getCharacterDisplayName(speakerChar) : 'Group Chat';
      const speakerTrait = speakerChar?.profile_data?.traits?.[0] || '';
      if (joke) {
        chatOpeners.set(
          clue.id,
          `[${speakerName}]: "Still recovering from ${joke} tbh, anyway don't delete this thread 👀"`
        );
      } else if (speakerTrait) {
        chatOpeners.set(
          clue.id,
          `[${speakerName}]: "Call it my ${speakerTrait} instinct, but everyone needs to read the receipts below 👀"`
        );
      }
    });

    // If GEMINI_API_KEY is available and we have either groupInsideJokes or guest traits/bios, refine via Gemini 2.5 Flash
    const hasAnyPersonalizationInput =
      Boolean(groupInsideJokes) ||
      activeChars.some(
        (c) =>
          (Array.isArray(c.profile_data?.traits) && c.profile_data.traits.length > 0) ||
          Boolean(String(c.profile_data?.guest_bio || '').trim())
      );

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (apiKey && hasAnyPersonalizationInput) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.75,
          },
        });

        const castInput = activeChars.map((c) => ({
          id: c.id,
          guestName: getCharacterDisplayName(c),
          roleTitle: getCharacterRoleTitle(c),
          isVictim: Boolean(c.is_victim),
          traits: Array.isArray(c.profile_data?.traits) ? c.profile_data.traits : [],
          personalInsideJokeOrBio: String(c.profile_data?.guest_bio || '').trim(),
        }));

        const cluesInput = eligibleChatClues.map((c) => ({
          id: c.id,
          title: c.title,
          preview: String(c.description || '').slice(0, 220),
        }));

        const prompt = `You are personalizing a murder mystery dinner party called "${
          snapshot.title || 'Murder Mystery'
        }" (${snapshot.theme || 'Dinner Party'}) for a real group of friends.

STRICT RULES:
1. NEVER alter or invent any crime timestamps, murder weapons, or spoiler solutions.
2. Weave the guests' real personality traits, personal notes, and the Group Inside Jokes naturally and wittily into 3 safe zones:
   - Zone 1 (Pre-Party Character Sheet):
     * "custom_act_bullet": 1 punchy sentence (max 24 words) telling the player how to blend their real-life quirk/inside joke into their character demeanor.
     * "custom_blurb_addon": 1 witty sentence (max 26 words) connecting their real personality or a group inside joke to their character bio.
   - Zone 2 (Secret Party-Night Banter & Roast Mission):
     * "roast_mission": 1-2 sentences (max 34 words) giving this player a hilarious in-character banter/roast challenge to use on another named guest at the table during Round 1 questioning.
   - Zone 3 (Leaked Chat / Social Post Opening Banter):
     * For each clue in cluesInput, write a single 1-line in-character opening text message ("openerLine", formatted like '[GuestName]: "..."', max 22 words) referencing a group inside joke or guest quirk before the serious messages begin.

GROUP INSIDE JOKES & SHARED LORE FROM HOST:
${groupInsideJokes || '(None provided - use each guest’s personal traits and bio below)'}

CAST MEMBERS:
${JSON.stringify(castInput, null, 2)}

CHAT CLUES FOR ZONE 3 OPENER:
${JSON.stringify(cluesInput, null, 2)}

Return JSON matching:
{
  "characters": [
    {
      "id": "string",
      "custom_act_bullet": "string",
      "custom_blurb_addon": "string",
      "roast_mission": "string"
    }
  ],
  "chatOpeners": [
    {
      "clueId": "string",
      "openerLine": "string"
    }
  ]
}`;

        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
        ]);

        if (result && result.response) {
          const parsed = JSON.parse(result.response.text());
          if (Array.isArray(parsed?.characters)) {
            for (const row of parsed.characters) {
              if (!row?.id || !charPlans.has(row.id)) continue;
              const fallback = charPlans.get(row.id)!;
              charPlans.set(row.id, {
                custom_act_bullet: String(row.custom_act_bullet || fallback.custom_act_bullet).trim(),
                custom_blurb_addon: String(row.custom_blurb_addon || fallback.custom_blurb_addon).trim(),
                roast_mission: String(row.roast_mission || fallback.roast_mission).trim(),
              });
            }
          }
          if (Array.isArray(parsed?.chatOpeners)) {
            for (const row of parsed.chatOpeners) {
              if (row?.clueId && row?.openerLine) {
                chatOpeners.set(String(row.clueId), String(row.openerLine).trim());
              }
            }
          }
        }
      } catch (aiErr) {
        console.warn('[weavePersonalitiesAndInsideJokesAction] Using deterministic fallback:', aiErr);
      }
    }

    // Apply Zone 1 & Zone 2 to characters
    let charactersUpdated = 0;
    const updatedCharacters = characters.map((char) => {
      const plan = charPlans.get(char.id);
      if (!plan) return char;
      charactersUpdated++;
      return {
        ...char,
        profile_data: {
          ...(char.profile_data || {}),
          custom_act_bullet: plan.custom_act_bullet,
          custom_blurb_addon: plan.custom_blurb_addon,
          roast_mission: plan.roast_mission,
        },
      };
    });

    // Apply Zone 3 to chat/social_post clues (100% preserving original forensic description & timestamps!)
    let chatCluesUpdated = 0;
    const updatedClues = clues.map((clue) => {
      const opener = chatOpeners.get(clue.id);
      if (!opener) return clue;
      const originalDesc = String(clue.__original_description || clue.description || '').trim();
      if (!originalDesc) return clue;
      chatCluesUpdated++;
      return {
        ...clue,
        __original_description: originalDesc,
        description: `${opener}\n${originalDesc}`,
      };
    });

    cacheMysterySnapshot(mysteryId, {
      ...snapshot,
      characters: updatedCharacters,
      clues: updatedClues,
    });

    updateMysteryGenerationInStore(mysteryId, {
      insideJokesWeaved: true,
    });

    await syncLiveStateToSupabaseClueCarrier(mysteryId);

    // Best-effort persist to Supabase characters table if present
    try {
      const supabase = await createClient();
      for (const c of updatedCharacters) {
        if (!charPlans.has(c.id)) continue;
        await (supabase as any)
          .from('characters')
          .update({ profile_data: c.profile_data })
          .eq('id', c.id);
      }
    } catch {
      // ignore on cached/isolated instances
    }

    return {
      success: true,
      charactersUpdated,
      chatCluesUpdated,
    };
  } catch (err: any) {
    console.error('[weavePersonalitiesAndInsideJokesAction] Error:', err);
    return {
      success: false,
      charactersUpdated: 0,
      chatCluesUpdated: 0,
      error: err?.message || 'Failed to weave inside jokes.',
    };
  }
}
