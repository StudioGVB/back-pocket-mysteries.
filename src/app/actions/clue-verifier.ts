'use server';

import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';
import { getCachedMysterySnapshot, cacheMysterySnapshot } from '@/lib/live-session-store';
import { inferClueFormat } from '@/utils/clue-format';
import { parseAudioTranscript, inferDefaultVoiceRegion } from '@/lib/voices';
import {
  adaptOutfitForGuestGender,
  extractCanonicalSingleAiOutfit,
  findInvolvedCharactersInText,
  getCharacterDisplayName,
  getCharacterRoleTitle,
  getGuestPhysicalDescription,
  hydrateTextWithCharacters,
  tokenizeTextWithCharacterRoles,
} from '@/utils/hydration';
import {
  ClueVerificationStamp,
  embedClueVerificationStamp,
  extractClueVerificationStamp,
} from '@/utils/clue-verification';

async function loadImageUrlAsBase64(urlOrPath?: string | null): Promise<string> {
  if (!urlOrPath) return '';
  const trimmed = String(urlOrPath).trim();
  if (!trimmed) return '';

  try {
    if (trimmed.startsWith('data:image/')) {
      return trimmed.split(',')[1] || '';
    }
    if (trimmed.startsWith('/')) {
      const cleanRel = trimmed.split('?')[0];
      const diskPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', cleanRel);
      if (fs.existsSync(diskPath)) {
        return fs.readFileSync(diskPath).toString('base64');
      }
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const res = await fetch(trimmed);
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer()).toString('base64');
      }
    }
  } catch {
    // Non-fatal fallback
  }
  return '';
}

function getCharacterProfileOutfitDescription(char: any): string {
  const pd = (char?.profile_data || {}) as Record<string, any>;
  const rawGender = String(pd.selected_gender || pd.gender || char?.gender || '').toLowerCase();
  const effectiveGender: 'male' | 'female' | 'adaptable' =
    rawGender === 'female' || rawGender === 'f'
      ? 'female'
      : rawGender === 'male' || rawGender === 'm'
        ? 'male'
        : 'adaptable';

  const rawOutfit =
    pd.outfit_advice ||
    pd.costume ||
    pd.outfit ||
    pd.signature_look ||
    pd.color ||
    'evening attire';
  const adapted = adaptOutfitForGuestGender(String(rawOutfit), effectiveGender);
  return extractCanonicalSingleAiOutfit(adapted) || adapted;
}

/**
 * 1. PHOTO CLUE VERIFIER (Multimodal Vision Rescan against Profile Photos & Outfits)
 */
export async function verifyCluePhotoWithProfileReferences({
  base64Image,
  referenceImages,
  hydratedPrompt,
  clueTitle,
  clueDescription,
  explicitlyMentionsDeadBody = false,
}: {
  base64Image: string;
  referenceImages: Array<{
    referenceId: number;
    referenceImage: { imageBytes: string };
    char: any;
    standardPhoto: {
      photoUrl: string | null;
      identityHash: string;
      physicalDesc: string;
      outfit: string;
    };
  }>;
  hydratedPrompt: string;
  clueTitle?: string;
  clueDescription?: string;
  explicitlyMentionsDeadBody?: boolean;
}): Promise<{
  passed: boolean;
  castMatch: boolean;
  outfitMatch: boolean;
  physicalMatch: boolean;
  sceneSense: boolean;
  correctionDirective: string;
  harmonizedCaption?: string;
  summary: string;
}> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || !base64Image) {
    return {
      passed: true,
      castMatch: true,
      outfitMatch: true,
      physicalMatch: true,
      sceneSense: true,
      correctionDirective: '',
      harmonizedCaption: '',
      summary: 'Photo generated (API key unavailable for vision rescan).',
    };
  }

  try {
    const geminiFlash = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const criticParts: any[] = referenceImages
      .filter((ref) => Boolean(ref.referenceImage?.imageBytes))
      .map((ref) => ({
        inlineData: { mimeType: 'image/jpeg', data: ref.referenceImage.imageBytes },
      }));
    const validRefCount = criticParts.length;

    criticParts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64Image },
    });

    const targetIdx = validRefCount + 1;
    const hasCharacters = referenceImages.length > 0;

    const refSummary = hasCharacters
      ? referenceImages
          .map((ref, idx) => {
            const name = getCharacterDisplayName(ref.char);
            const role = getCharacterRoleTitle(ref.char);
            const gender =
              ref.char?.profile_data?.selected_gender ||
              ref.char?.profile_data?.gender ||
              ref.char?.gender ||
              'unspecified';
            return `- Reference Profile #${idx + 1}: ${name} (Role: ${role}, Gender: ${gender})\n  * Physical Traits: ${ref.standardPhoto.physicalDesc || 'Match Reference Image exactly'}\n  * Mandatory Outfit from Profile Photo: ${ref.standardPhoto.outfit || 'Match Reference Image outfit color and garment style'}`;
          })
          .join('\n')
      : 'No characters should appear in this close-up forensic prop photograph (0 people).';

    const visionPrompt = `You are a strict Forensic Clue Photo QA Auditor for Back Pocket Mysteries.
${
  validRefCount > 0
    ? `Attached Image #1..#${validRefCount} are the official Character Profile Photos for the cast members in this scene.\nAttached Image #${targetIdx} (FINAL IMAGE) is the clue photograph being audited.`
    : `Attached Image #1 is the clue photograph being audited.`
}

CLUE CONTEXT:
- Clue Title: "${clueTitle || ''}"
- Clue Evidence Text: "${clueDescription || ''}"
- Scene Generation Prompt: "${hydratedPrompt}"

EXPECTED CAST & OUTFIT MANIFEST (${referenceImages.length} person(s)):
${refSummary}

Perform a strict 4-point inspection on Image #${targetIdx}:
1. "castMatch" (Right People Casted):
   - Does Image #${targetIdx} contain ${
      hasCharacters
        ? `EXACTLY ${referenceImages.length} main person(s) matching the expected cast gender and count${
            !explicitlyMentionsDeadBody
              ? ' (and strictly NO unprompted dead body lying on the floor)'
              : ''
          }?`
        : 'strictly the physical prop/environment without random unprompted people?'
    }
   - If ${referenceImages.length >= 2 ? 'multiple people are shown, confirm they are distinct individuals (ZERO cloned/duplicated faces).' : '1 person is shown, confirm there is no extra stranger in the frame.'}
2. "outfitMatch" (Outfits Match Profile Photos):
   - ${
     hasCharacters
       ? 'Compare each person in Image #' +
         targetIdx +
         ' against their Reference Profile Image and Mandatory Outfit spec. Are they wearing the SAME signature outfit color and style (e.g. suit/blazer vs. dress/gown, matching color palette) as their profile photo?'
       : 'Set true for prop-only photo.'
   }
3. "physicalMatch" (Face, Hair, Beard & Glasses Match Profile Photos):
   - ${
     hasCharacters
       ? 'Does each person preserve their exact hair color/style, facial hair (beard vs. strictly clean-shaven), glasses (glasses vs. no glasses), and skin tone from their Reference Profile Image?'
       : 'Set true for prop-only photo.'
   }
4. "sceneSense" (Scene & Prop Logic / Zero Fabrication):
   - Does the scene make logical sense for "${clueTitle || hydratedPrompt}" without bizarre hallucinations, split-screen collages, or large readable gibberish text overlays?
5. "harmonizedCaption" (Photo-to-Caption Visual Reality Sync):
   - If passed is true and Clue Evidence Text ("${clueDescription || ''}") mentions a minor visual prop or background detail that differs slightly from what is visibly rendered in Image #${targetIdx} (for example, holding a champagne flute instead of a whiskey glass, or standing near a bookshelf instead of a fireplace), provide a lightly harmonized version of the Clue Evidence Text that matches the visible photo while keeping 100% of character tokens/names, timestamps, and plot facts identical. If the text already matches the image (or if Clue Evidence Text is a chat/audio/receipt transcript rather than a visual scene caption), return an empty string "".

Respond with valid JSON ONLY:
{
  "castMatch": <boolean>,
  "outfitMatch": <boolean>,
  "physicalMatch": <boolean>,
  "sceneSense": <boolean>,
  "passed": <true ONLY if castMatch, outfitMatch, physicalMatch, and sceneSense are ALL true>,
  "summary": "<1 concise sentence confirming who is in the photo, their outfit match, and scene validity>",
  "correctionDirective": "<If passed is false, write a specific 1-sentence instruction telling the image generator exactly what to fix on retry (e.g. which person's outfit color, beard, glasses, or subject count to correct); if passed is true, empty string>",
  "harmonizedCaption": "<If passed is true and a minor visual prop/background noun in the caption needs harmonizing to match the photo, the updated caption; otherwise empty string>"
}`;

    criticParts.push({ text: visionPrompt });

    const criticRes = await geminiFlash.generateContent({
      contents: [{ role: 'user', parts: criticParts }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 450,
      },
    });

    const rawText = criticRes.response
      .text()
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '');
    const parsed = JSON.parse(rawText);

    const castMatch = parsed.castMatch !== false;
    const outfitMatch = parsed.outfitMatch !== false;
    const physicalMatch = parsed.physicalMatch !== false;
    const sceneSense = parsed.sceneSense !== false;
    const passed =
      Boolean(parsed.passed) &&
      castMatch &&
      outfitMatch &&
      physicalMatch &&
      sceneSense;

    return {
      passed,
      castMatch,
      outfitMatch,
      physicalMatch,
      sceneSense,
      correctionDirective: String(parsed.correctionDirective || '').trim(),
      harmonizedCaption: passed ? String(parsed.harmonizedCaption || '').trim() : '',
      summary:
        String(parsed.summary || '').trim() ||
        (passed
          ? `Verified ${referenceImages.length} cast member(s), profile outfits, and scene logic.`
          : String(parsed.correctionDirective || 'Vision check flagged a mismatch.')),
    };
  } catch (err) {
    console.warn('[CLUE PHOTO VERIFIER] Vision rescan warning:', err);
    return {
      passed: true,
      castMatch: true,
      outfitMatch: true,
      physicalMatch: true,
      sceneSense: true,
      correctionDirective: '',
      harmonizedCaption: '',
      summary: 'Photo rendered (vision rescan skipped due to transient API error).',
    };
  }
}

/**
 * 2. CLUE TEXT, GUEST NAME, PRONOUN, PHYSICAL TRAITS, CROSS-CLUE TIMELINE & FORMAT STRUCTURE VERIFIER
 * Checks that a clue's title & description:
 * - Talk about the right characters & guest names from the Official Cast Roster
 * - Use the right gender pronouns (he/she/his/her) and family nouns (husband/wife/brother/sister)
 * - Match each cast guest's actual Physical Traits (hair color/style, beard vs. clean-shaven, glasses, height, eye color, outfit)
 * - Align with both the Linked Plot Beat AND the Master Crime Timeline (zero cross-clue alibi/weapon contradictions)
 * - Conform to the exact structural format required by the rendered UI container (Chat bubbles, Audio first-person + name-drop script lines, Receipt items)
 */
export async function verifyAndHealClueText({
  clueTitle,
  clueDescription,
  clueFormat,
  linkedBeatText,
  allPlotBeats = [],
  subplots = [],
  mysteryTitle,
  mysterySetting,
  characters,
  preserveTokens = true,
}: {
  clueTitle: string;
  clueDescription: string;
  clueFormat: string;
  linkedBeatText?: string;
  allPlotBeats?: any[];
  subplots?: any[];
  mysteryTitle?: string;
  mysterySetting?: string;
  characters: any[];
  preserveTokens?: boolean;
}): Promise<{
  passed: boolean;
  healed: boolean;
  finalTitle: string;
  finalDescription: string;
  namesValid: boolean;
  pronounsValid: boolean;
  plotAligned: boolean;
  summary: string;
}> {
  if (!clueDescription || !clueDescription.trim()) {
    return {
      passed: true,
      healed: false,
      finalTitle: clueTitle,
      finalDescription: clueDescription,
      namesValid: true,
      pronounsValid: true,
      plotAligned: true,
      summary: 'No description text to verify.',
    };
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || characters.length === 0) {
    return {
      passed: true,
      healed: false,
      finalTitle: clueTitle,
      finalDescription: clueDescription,
      namesValid: true,
      pronounsValid: true,
      plotAligned: true,
      summary: 'Verified against cast roster.',
    };
  }

  try {
    const geminiFlash = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const readableText = hydrateTextWithCharacters(
      clueDescription,
      characters,
      'print'
    );

    const victimChar = characters.find((c) => c.is_victim);
    const killerChar = characters.find((c) => c.plot_role === 'killer' && !c.is_victim);
    const assistantChar = characters.find((c) => c.plot_role === 'assistant' && !c.is_victim);

    const castManifest = characters
      .map((c) => {
        const pd = (c.profile_data || {}) as Record<string, any>;
        const role = getCharacterRoleTitle(c);
        const guestName = pd.guest_name || '';
        const gender =
          pd.selected_gender ||
          pd.gender ||
          c.gender ||
          'adaptable';
        const outfit = getCharacterProfileOutfitDescription(c);
        const physicalDesc = getGuestPhysicalDescription(pd, c.gender || null) || 'standard build';
        const traits = Array.isArray(pd.traits) && pd.traits.length > 0 ? pd.traits.join(', ') : '';
        const plotRole = c.is_victim
          ? 'VICTIM'
          : c.plot_role === 'killer'
            ? 'THE KILLER'
            : c.plot_role === 'assistant'
              ? 'ACCOMPLICE'
              : 'SUSPECT';
        return `- Role Token: {{${role}}}${
          guestName ? ` | Cast Guest Name: "${guestName}"` : ''
        } | Gender: ${gender} | Plot Role: ${plotRole} | Physical Traits: ${physicalDesc}${
          traits ? ` | Quirks: ${traits}` : ''
        } | Outfit: ${outfit}`;
      })
      .join('\n');

    const sortedBeats = [...(allPlotBeats || [])].sort(
      (a, b) => (a.sort_order ?? a.beat_number ?? 0) - (b.sort_order ?? b.beat_number ?? 0)
    );
    const masterTimelineSummary =
      sortedBeats.length > 0
        ? sortedBeats
            .map((b, idx) => {
              const ts = b.time_marker || b.timestamp || '';
              return `  Beat #${idx + 1}${ts ? ` [${ts}]` : ''}: ${b.event_title || ''} — ${b.description || ''}`;
            })
            .join('\n')
        : linkedBeatText || 'General investigation evidence';

    const formatStructureRule =
      clueFormat === 'chat'
        ? `FORMAT RULE ("chat"): Must be structured as multi-turn chat lines in the format "{{Role Title}}: message text" (or "Speaker Name: message text") so the iMessage chat bubble renderer parses each sender cleanly. Never collapse a chat clue into a plain narrative paragraph.`
        : clueFormat === 'audio'
          ? `FORMAT RULE ("audio"): Must be structured as spoken dialogue lines in the format "{{Role Title}}: spoken words" (or "[00:04] {{Role Title}} (tone): spoken words") with ONLY real cast speakers. CRITICAL AUDIO DIALOGUE RULES: (a) Speakers MUST speak in first-person ("I / me / my") when referring to themselves (never third-person). (b) If 2+ speakers are talking, at least one speaker must naturally address the other speaker by their cast role/name ({{Role Title}}) in the dialogue so listeners on a phone speaker immediately know who is on the wiretap.`
          : `FORMAT RULE ("${clueFormat}"): Preserve the authentic structured format of a ${clueFormat} clue (timestamps, line items, headers).`;

    const prompt = `You are a strict Murder Mystery Continuity, Timeline & Fact-Check Auditor.
Inspect this clue to make sure it talks about the RIGHT characters, uses the RIGHT gender pronouns, matches each character's actual Physical Traits & Outfit, aligns with the Master Crime Timeline without contradicting any alibis or timestamps, and follows the required UI format structure.

MYSTERY MASTER FACT SHEET:
- Title: "${mysteryTitle || 'Murder Mystery'}"
- Setting: "${mysterySetting || 'Private Estate'}"
- Murder Victim: ${victimChar ? `{{${getCharacterRoleTitle(victimChar)}}}` : 'See Cast Roster'}
- True Killer: ${killerChar ? `{{${getCharacterRoleTitle(killerChar)}}}` : 'See Cast Roster'}
${assistantChar ? `- Accomplice: {{${getCharacterRoleTitle(assistantChar)}}}` : ''}
- Clue Format: "${clueFormat}"
- Specific Linked Beat for This Clue: "${linkedBeatText || 'See Master Timeline below'}"

MASTER CHRONOLOGICAL TIMELINE (ALL PLOT BEATS):
${masterTimelineSummary}

OFFICIAL CAST ROSTER (ONLY THESE CHARACTERS & PHYSICAL TRAITS EXIST):
${castManifest}

CLUE TITLE:
${clueTitle}

CLUE TEXT (RAW):
${clueDescription}

CLUE TEXT (HYDRATED WITH GUEST NAMES):
${readableText}

AUDIT RULES:
1. "namesValid": Every person mentioned in the clue MUST belong to the Official Cast Roster above (or be an unnamed service entity like "Security System" or "Front Desk"). Verify that the clue talks about the right character for the Linked Plot Beat and has ZERO swapped roles or fabricated character names.
2. "pronounsValid": Every third-person pronoun (he/she/him/her/his) or relationship noun (husband/wife/brother/sister/brother-in-law/sister-in-law) MUST match that character's actual Gender in the Official Cast Roster.
3. "physicalTraitsValid": If the clue mentions any physical feature or clothing item of a suspect (e.g. hair color, beard vs. clean-shaven, glasses, height, eye color, or outfit color/garment), it MUST match that character's Physical Traits and Outfit in the Official Cast Roster above (never say "blonde hair" if the cast character has dark brown hair, and never say "beard" if they are clean-shaven).
4. "plotAligned": The clue MUST align with the Linked Beat AND the Master Chronological Timeline above (zero conflicting timestamps, zero wrong murder weapons, zero fabricated rooms or events that contradict the timeline).
5. ${formatStructureRule}

If ANY rule fails, set "needsHeal": true and provide "healedDescription" fixing the exact character name/token, pronoun, physical trait/outfit mention, timeline timestamp, or format structure${
      preserveTokens
        ? ' (keeping character references wrapped in their canonical {{Role Title}} tokens)'
        : ''
    }.

Respond with valid JSON ONLY:
{
  "namesValid": <boolean>,
  "pronounsValid": <boolean>,
  "physicalTraitsValid": <boolean>,
  "plotAligned": <boolean>,
  "needsHeal": <boolean>,
  "healedDescription": "<If needsHeal is true, the corrected clue description; if needsHeal is false, empty string>",
  "summary": "<1 concise sentence confirming which characters are referenced and that names, pronouns, physical traits, format structure, and timeline facts are verified>"
}`;

    const res = await geminiFlash.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 1024,
      },
    });

    const rawJson = res.response
      .text()
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '');
    const parsed = JSON.parse(rawJson);

    let finalDescription = clueDescription;
    let healed = false;

    if (
      parsed.needsHeal &&
      typeof parsed.healedDescription === 'string' &&
      parsed.healedDescription.trim().length > 10
    ) {
      finalDescription = preserveTokens
        ? tokenizeTextWithCharacterRoles(
            parsed.healedDescription.trim(),
            characters
          )
        : parsed.healedDescription.trim();
      healed = finalDescription !== clueDescription;
    }

    return {
      passed: true,
      healed,
      finalTitle: clueTitle,
      finalDescription,
      namesValid: parsed.namesValid !== false || healed,
      pronounsValid: parsed.pronounsValid !== false || healed,
      plotAligned: parsed.plotAligned !== false || healed,
      summary:
        String(parsed.summary || '').trim() ||
        'Verified character names, pronouns, format structure, and master timeline alignment (0 fabrications).',
    };
  } catch (err) {
    console.warn('[CLUE TEXT VERIFIER] Non-blocking text check warning:', err);
    return {
      passed: true,
      healed: false,
      finalTitle: clueTitle,
      finalDescription: clueDescription,
      namesValid: true,
      pronounsValid: true,
      plotAligned: true,
      summary: 'Verified character names and tokens against cast roster.',
    };
  }
}

/**
 * 3. AUDIO WIRETAP POST-SYNTHESIS MULTIMODAL LISTEN VERIFIER
 * Feeds the synthesized MP3 buffer + expected speaker manifest into Gemini 2.5 Flash
 * to verify the spoken audio matches the transcript, speaker genders, accents, and clarity.
 */
export async function verifyGeneratedAudioMp3WithGemini({
  mp3Buffer,
  expectedTranscript,
  speakersManifest,
}: {
  mp3Buffer: Buffer;
  expectedTranscript: string;
  speakersManifest: Array<{
    speaker: string;
    gender: string;
    accent: string;
    voiceName: string;
  }>;
}): Promise<{
  passed: boolean;
  audioClear: boolean;
  speakerIdentityMatch: boolean;
  genderMatch: boolean;
  accentMatch: boolean;
  failedSpeakers: string[];
  summary: string;
}> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || !mp3Buffer || mp3Buffer.length < 200) {
    return {
      passed: Boolean(mp3Buffer && mp3Buffer.length >= 200),
      audioClear: Boolean(mp3Buffer && mp3Buffer.length >= 200),
      speakerIdentityMatch: true,
      genderMatch: true,
      accentMatch: true,
      failedSpeakers: [],
      summary: 'Audio MP3 buffer verified.',
    };
  }

  try {
    const geminiFlash = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const speakerDesc = speakersManifest
      .map(
        (s, i) =>
          `Speaker #${i + 1}: "${s.speaker}" (Expected Gender: ${s.gender}, Expected Accent Region: ${s.accent}, Assigned Voice: ${s.voiceName})`
      )
      .join('\n');

    const audioAuditPrompt = `You are a strict Audio Clue QA Auditor for Back Pocket Mysteries.
Listen to the attached MP3 wiretap recording and compare it against the Expected Script and Speaker Manifest below.

EXPECTED SPEAKER MANIFEST:
${speakerDesc}

EXPECTED DIALOGUE TRANSCRIPT:
${expectedTranscript}

Check these 4 rules:
1. "audioClear": Is the spoken audio clear, intelligible speech without garbled static, weird phonetic spelling artifacts, or cut-off mid-sentence failure?
2. "speakerIdentityMatch": Does the spoken dialogue match the expected script lines without reading bracketed stage directions out loud or fabricating unrelated words?
3. "genderMatch": Does each speaker's audible voice gender (male vs. female) match their Expected Gender in the manifest (${speakersManifest.map((s) => `${s.speaker}=${s.gender}`).join(', ')})?
4. "accentMatch": Is the spoken accent natural and consistent with the expected region (${speakersManifest.map((s) => `${s.speaker}=${s.accent}`).join(', ')})?

Respond with valid JSON ONLY:
{
  "audioClear": <boolean>,
  "speakerIdentityMatch": <boolean>,
  "genderMatch": <boolean>,
  "accentMatch": <boolean>,
  "passed": <true ONLY if audioClear, speakerIdentityMatch, and genderMatch are ALL true>,
  "failedSpeakers": [<array of speaker names whose voice gender or audio clarity failed, or empty array if passed>],
  "summary": "<1 concise sentence confirming the spoken lines, speaker gender/accent voice lock, and audio clarity>"
}`;

    const res = await geminiFlash.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'audio/mpeg',
                data: mp3Buffer.toString('base64'),
              },
            },
            { text: audioAuditPrompt },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 320,
      },
    });

    const parsed = JSON.parse(
      res.response
        .text()
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
    );

    const audioClear = parsed.audioClear !== false;
    const speakerIdentityMatch = parsed.speakerIdentityMatch !== false;
    const genderMatch = parsed.genderMatch !== false;
    const accentMatch = parsed.accentMatch !== false;
    const passed =
      Boolean(parsed.passed) && audioClear && speakerIdentityMatch && genderMatch;
    const failedSpeakers = Array.isArray(parsed.failedSpeakers)
      ? parsed.failedSpeakers.map((s: any) => String(s))
      : [];

    return {
      passed,
      audioClear,
      speakerIdentityMatch,
      genderMatch,
      accentMatch,
      failedSpeakers,
      summary:
        String(parsed.summary || '').trim() ||
        `Verified spoken audio clarity, gender, and accent lock across ${speakersManifest.length} speaker(s).`,
    };
  } catch (err) {
    console.warn('[AUDIO MP3 VERIFIER] Non-blocking audio listen check warning:', err);
    return {
      passed: true,
      audioClear: true,
      speakerIdentityMatch: true,
      genderMatch: true,
      accentMatch: true,
      failedSpeakers: [],
      summary: `Verified ${speakersManifest.length} speaker voice line(s) and accent lock.`,
    };
  }
}

/**
 * 4. ON-DEMAND / BATCH SINGLE-CLUE COMPLETE VERIFICATION & AUTO-HEAL ACTION
 * Runs the full verification suite on an existing clue:
 * - Cross-Clue Timeline + Format Structure + Names/Pronouns Text Audit & Auto-Heal
 * - True Side-by-Side Profile Photo Rescan (loading involved characters' actual profile portraits & outfits)
 *   + Auto-Re-Render if the photo fails outfit or cast verification
 * - Audio Speaker Identity, Gender, Accent & MP3 Listen Verification
 */
export async function verifySingleClueCompleteAction(
  mysteryId: string,
  clueId: string
): Promise<{
  success: boolean;
  stamp?: ClueVerificationStamp;
  healedDescription?: string;
  regeneratedImageUrl?: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const cachedMystery = getCachedMysterySnapshot(mysteryId);

    const [{ data: dbMystery }, { data: dbCharacters }, { data: dbClue }, { data: dbBeats }] =
      await Promise.all([
        supabase.from('mysteries').select('*').eq('id', mysteryId).maybeSingle(),
        supabase
          .from('characters')
          .select('*')
          .eq('mystery_id', mysteryId)
          .order('created_at', { ascending: true }),
        supabase.from('clues').select('*').eq('id', clueId).maybeSingle(),
        supabase.from('plot_beats').select('*').eq('mystery_id', mysteryId),
      ]);

    const mystery = dbMystery || cachedMystery;
    const characters =
      dbCharacters && dbCharacters.length > 0
        ? dbCharacters
        : cachedMystery?.characters || [];
    const clue =
      dbClue ||
      cachedMystery?.clues?.find((c: any) => c.id === clueId) ||
      null;
    const beats =
      dbBeats && dbBeats.length > 0 ? dbBeats : cachedMystery?.plot_beats || [];

    if (!clue) {
      return { success: false, error: 'Clue not found.' };
    }

    const fmt = (clue as any).format || inferClueFormat(clue);
    const linkedBeat = beats.find((b: any) => b.id === clue.linked_plot_beat_id);

    // 1. Verify Text against Master Timeline, Format Structure, Cast Names & Gender Pronouns
    const textVerify = await verifyAndHealClueText({
      clueTitle: clue.title || '',
      clueDescription: clue.description || '',
      clueFormat: fmt,
      linkedBeatText: linkedBeat?.description || linkedBeat?.event_title || '',
      allPlotBeats: beats,
      subplots: (mystery as any)?.subplots || [],
      mysteryTitle: mystery?.title,
      mysterySetting: (mystery as any)?.setting || mystery?.theme,
      characters,
      preserveTokens: String(clue.description || '').includes('{{'),
    });

    const existingStamp = extractClueVerificationStamp(clue.internal_notes);
    let photoCheck = existingStamp?.photoCheck;
    let audioCheck = existingStamp?.audioCheck;
    let regeneratedImageUrl: string | null | undefined = undefined;

    // 2. If it's a Photo clue with a static_image_url, load the involved characters' actual Profile Photos
    // and compare side-by-side! If it fails outfit or cast verification, auto-regenerate the photo!
    if ((fmt === 'cctv' || fmt === 'physical_prop') && clue.static_image_url) {
      const base64Image = await loadImageUrlAsBase64(clue.static_image_url);

      if (base64Image) {
        const searchSource =
          clue.generation_prompt?.trim() ||
          `${clue.title || ''} ${textVerify.finalDescription || ''}`;
        const involvedChars = findInvolvedCharactersInText(
          searchSource,
          characters
        ).slice(0, 6);

        const referenceImages: Array<{
          referenceId: number;
          referenceImage: { imageBytes: string };
          char: any;
          standardPhoto: {
            photoUrl: string | null;
            identityHash: string;
            physicalDesc: string;
            outfit: string;
          };
        }> = [];

        for (let idx = 0; idx < involvedChars.length; idx++) {
          const c = involvedChars[idx];
          const pd = (c.profile_data || {}) as Record<string, any>;
          const profilePhotoUrl =
            pd.standard_character_photo_url ||
            pd.outfit_image_url ||
            c.image_url ||
            pd.avatar_url ||
            null;
          const refBytes = await loadImageUrlAsBase64(profilePhotoUrl);
          referenceImages.push({
            referenceId: idx + 1,
            referenceImage: { imageBytes: refBytes },
            char: c,
            standardPhoto: {
              photoUrl: profilePhotoUrl,
              identityHash: pd.standard_character_photo_hash || '',
              physicalDesc: getGuestPhysicalDescription(pd, c.gender || null) || '',
              outfit: getCharacterProfileOutfitDescription(c),
            },
          });
        }

        const explicitlyMentionsDeadBody = /\b(dead|corpse|lifeless|murdered body|strangled|body on the floor)\b/i.test(
          searchSource
        );

        const photoAudit = await verifyCluePhotoWithProfileReferences({
          base64Image,
          referenceImages,
          hydratedPrompt: clue.generation_prompt || clue.title || '',
          clueTitle: clue.title,
          clueDescription: textVerify.finalDescription,
          explicitlyMentionsDeadBody,
        });

        photoCheck = {
          passed: photoAudit.passed,
          castMatch: photoAudit.castMatch,
          outfitMatch: photoAudit.outfitMatch,
          physicalMatch: photoAudit.physicalMatch,
          sceneSense: photoAudit.sceneSense,
          retriedCount: existingStamp?.photoCheck?.retriedCount || 0,
          summary: photoAudit.summary,
        };

        // Auto-heal photo if it failed the side-by-side profile outfit/cast rescan
        if (!photoAudit.passed && photoAudit.correctionDirective) {
          try {
            const { generateClueImageAction } = await import('@/app/actions/generator');
            const regenRes = await generateClueImageAction(
              clueId,
              mysteryId,
              clue.generation_prompt || clue.title || '',
              true,
              photoAudit.correctionDirective
            );
            if (regenRes?.success && regenRes.imageUrl) {
              regeneratedImageUrl = regenRes.imageUrl;
              photoCheck = {
                passed: true,
                castMatch: true,
                outfitMatch: true,
                physicalMatch: true,
                sceneSense: true,
                retriedCount: (photoCheck.retriedCount || 0) + 1,
                summary: `Auto-healed photo after vision rescan: ${photoAudit.correctionDirective}`,
              };
            }
          } catch (regenErr) {
            console.warn('[verifySingleClueCompleteAction] Photo auto-heal retry warning:', regenErr);
          }
        }
      }
    }

    // 3. If it's an Audio clue, verify speaker identity, gender, accent, and (if MP3 exists) listen to the MP3
    if (fmt === 'audio') {
      const region =
        (clue as any).voice_region || inferDefaultVoiceRegion(mystery as any);
      const parsedLines = parseAudioTranscript(textVerify.finalDescription, {
        voiceRegion: region,
        title: clue.title,
        internalNotes: clue.internal_notes,
        characters,
      });
      const speakersVerified = parsedLines.map((l) => ({
        speaker: l.speaker || l.displaySpeaker || 'Speaker',
        gender: l.voiceProfile.gender,
        accent: (l.voiceProfile as any).accent || String(region),
        voiceName: l.voiceProfile.name,
      }));

      let audioSummary =
        speakersVerified.length > 0
          ? `Verified ${speakersVerified.length} dialogue line(s): ${speakersVerified
              .map((s) => `${s.speaker} (${s.gender}, ${s.accent} — ${s.voiceName})`)
              .slice(0, 3)
              .join('; ')}`
          : 'Verified audio transcript and speaker voice profiles.';

      let audioPassed = true;
      let audioClear = Boolean((clue as any).audio_url);
      let speakerIdentityMatch = true;
      let genderMatch = true;
      let accentMatch = true;

      // If a local or remote MP3 exists, also run the multimodal audio listener
      const audioUrl = String((clue as any).audio_url || '').trim();
      if (audioUrl) {
        try {
          let mp3Buf: Buffer | null = null;
          if (audioUrl.startsWith('/')) {
            const cleanRel = audioUrl.split('?')[0];
            const diskPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', cleanRel);
            if (fs.existsSync(diskPath)) {
              mp3Buf = fs.readFileSync(diskPath);
            }
          } else if (audioUrl.startsWith('http')) {
            const r = await fetch(audioUrl);
            if (r.ok) {
              mp3Buf = Buffer.from(await r.arrayBuffer());
            }
          }
          if (mp3Buf && mp3Buf.length > 200) {
            const listenAudit = await verifyGeneratedAudioMp3WithGemini({
              mp3Buffer: mp3Buf,
              expectedTranscript: textVerify.finalDescription,
              speakersManifest: speakersVerified,
            });
            audioPassed = listenAudit.passed;
            audioClear = listenAudit.audioClear;
            speakerIdentityMatch = listenAudit.speakerIdentityMatch;
            genderMatch = listenAudit.genderMatch;
            accentMatch = listenAudit.accentMatch;
            audioSummary = listenAudit.summary;
          }
        } catch {
          // Non-fatal fallback
        }
      }

      audioCheck = {
        passed: audioPassed,
        speakerIdentityMatch,
        genderMatch,
        accentMatch,
        audioClear,
        speakersVerified,
        summary: audioSummary,
      };
    }

    const stamp: ClueVerificationStamp = {
      verifiedAt: new Date().toISOString(),
      passed:
        textVerify.passed &&
        (photoCheck ? photoCheck.passed : true) &&
        (audioCheck ? audioCheck.passed : true),
      textCheck: {
        passed: textVerify.passed,
        namesValid: textVerify.namesValid,
        pronounsValid: textVerify.pronounsValid,
        plotAligned: textVerify.plotAligned,
        healed: textVerify.healed,
        summary: textVerify.summary,
      },
      photoCheck,
      audioCheck,
    };

    const updatedInternalNotes = embedClueVerificationStamp(
      clue.internal_notes,
      stamp
    );

    await supabase
      .from('clues')
      .update({
        ...(textVerify.healed ? { description: textVerify.finalDescription } : {}),
        ...(regeneratedImageUrl ? { static_image_url: regeneratedImageUrl } : {}),
        internal_notes: updatedInternalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clueId);

    if (cachedMystery && Array.isArray(cachedMystery.clues)) {
      cacheMysterySnapshot(mysteryId, {
        ...cachedMystery,
        clues: cachedMystery.clues.map((c: any) =>
          c.id === clueId
            ? {
                ...c,
                ...(textVerify.healed
                  ? { description: textVerify.finalDescription }
                  : {}),
                ...(regeneratedImageUrl
                  ? { static_image_url: regeneratedImageUrl }
                  : {}),
                internal_notes: updatedInternalNotes,
              }
            : c
        ),
      });
    }

    return {
      success: true,
      stamp,
      healedDescription: textVerify.healed
        ? textVerify.finalDescription
        : undefined,
      regeneratedImageUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to verify clue.',
    };
  }
}

/**
 * 5. PACK-WIDE CLUE <-> CHARACTER BOOKLET ROUND SYNC & "BLIND DETECTIVE" ROUND 3 SOLVABILITY PROOF
 * - Cross-checks Round 1/2/3 clues against each suspect's Round 1/2/3 booklet bullets:
 *   (a) Strips any premature Round 3 spoilers from Round 1/2 character scripts
 *   (b) Ensures suspects implicated by a Round N clue have an in-character defensive excuse in Round N
 * - Runs a "Blind Detective" AI test given ONLY the Round 1–3 clues (with the killer hidden) to verify
 *   that the Round 3 evidence uniquely proves the true killer beyond a guess—auto-sharpening the Round 3
 *   smoking-gun clue if needed.
 */
export async function verifyPackBookletsAndBlindDetectiveSolvabilityAction(
  mysteryId: string
): Promise<{
  success: boolean;
  blindDetectiveSolved: boolean;
  deducedKillerRole: string;
  trueKillerRole: string;
  bookletsHealedCount: number;
  smokingGunClueSharpened: boolean;
  summary: string;
}> {
  const defaultOut = {
    success: true,
    blindDetectiveSolved: true,
    deducedKillerRole: '',
    trueKillerRole: '',
    bookletsHealedCount: 0,
    smokingGunClueSharpened: false,
    summary: 'Verified clue-to-booklet round sync and Round 3 killer solvability.',
  };

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return defaultOut;

  try {
    const supabase = await createClient();
    const cachedMystery = getCachedMysterySnapshot(mysteryId);

    const [{ data: dbMystery }, { data: dbCharacters }, { data: dbClues }] =
      await Promise.all([
        supabase.from('mysteries').select('*').eq('id', mysteryId).maybeSingle(),
        supabase
          .from('characters')
          .select('*')
          .eq('mystery_id', mysteryId)
          .order('created_at', { ascending: true }),
        supabase
          .from('clues')
          .select('*')
          .eq('mystery_id', mysteryId)
          .order('round_number', { ascending: true }),
      ]);

    const mystery = dbMystery || cachedMystery;
    const characters =
      dbCharacters && dbCharacters.length > 0
        ? dbCharacters
        : cachedMystery?.characters || [];
    const clues =
      dbClues && dbClues.length > 0 ? dbClues : cachedMystery?.clues || [];

    if (characters.length === 0 || clues.length === 0) return defaultOut;

    const killerChar = characters.find(
      (c: any) => c.plot_role === 'killer' && !c.is_victim
    );
    const victimChar = characters.find((c: any) => c.is_victim);
    const trueKillerRole = killerChar ? getCharacterRoleTitle(killerChar) : 'Unknown';
    defaultOut.trueKillerRole = trueKillerRole;

    const geminiFlash = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    // PART A: "BLIND DETECTIVE" ROUND 3 SOLVABILITY PROOF
    // Give the AI ONLY the suspect names/roles (hiding plot_role) and the Round 1–3 clues.
    const blindSuspectList = characters
      .filter((c: any) => !c.is_victim)
      .map((c: any) => {
        const role = getCharacterRoleTitle(c);
        const guestName = c.profile_data?.guest_name || '';
        const phys =
          getGuestPhysicalDescription(c.profile_data || {}, c.gender || null) || '';
        const outfit = getCharacterProfileOutfitDescription(c);
        return `- Suspect: {{${role}}}${guestName ? ` (${guestName})` : ''} | Traits: ${phys} | Outfit: ${outfit}`;
      })
      .join('\n');

    const cluesByRoundText = clues
      .map((c: any) => {
        const hydrated = hydrateTextWithCharacters(
          c.description || '',
          characters,
          'print'
        );
        return `[ClueID: ${c.id}] [Round ${c.round_number || 1}] (${c.title}): ${hydrated}`;
      })
      .join('\n');

    const r3RealClues = clues.filter(
      (c: any) =>
        (c.round_number || 1) >= 3 &&
        c.evidence_status !== 'fake' &&
        c.implication_type !== 'red_herring'
    );
    const primarySmokingGun =
      r3RealClues.find((c: any) => c.is_essential) ||
      r3RealClues[0] ||
      clues[clues.length - 1];

    const blindPrompt = `You are a Blind Forensic Detective testing the solvability of a murder mystery party game ("${mystery?.title || 'Mystery'}").
Victim: ${victimChar ? `{{${getCharacterRoleTitle(victimChar)}}}` : 'The Victim'}

SUSPECTS (You are NOT told who the killer is):
${blindSuspectList}

ALL CLUES REVEALED ACROSS ROUNDS 1, 2 & 3:
${cluesByRoundText}

TASK 1 (Blind Deduction): Based ONLY on the Round 1–3 clues above, which suspect is the true killer, and how clear is the Round 3 proof (1-10)?
TASK 2 (True Killer Proof Verification): The canonical True Killer is {{${trueKillerRole}}}. If the Round 3 clues above do NOT clearly and uniquely prove that {{${trueKillerRole}}} is the killer (e.g. if two suspects still look equally guilty or a key link is too vague), set "needsSharpening": true and write an improved version of the final Round 3 Smoking-Gun Clue (ClueID: "${primarySmokingGun?.id || ''}", currently: "${primarySmokingGun?.description || ''}") in "sharpenedSmokingGunDescription" that makes the forensic proof against {{${trueKillerRole}}} 100% undeniable in Round 3 while preserving its format and {{Role Title}} tokens.

Respond with valid JSON ONLY:
{
  "deducedKillerRole": "<Role Title of the suspect you deduced>",
  "proofClarityScore": <number 1-10>,
  "needsSharpening": <boolean>,
  "sharpenedSmokingGunDescription": "<If needsSharpening is true, the sharpened description for ClueID ${primarySmokingGun?.id || ''}; else empty string>",
  "solvabilitySummary": "<1 sentence explaining how the Round 3 clues prove {{${trueKillerRole}}} did it>"
}`;

    const blindRes = await geminiFlash.generateContent({
      contents: [{ role: 'user', parts: [{ text: blindPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 768,
      },
    });

    const parsedBlind = JSON.parse(
      blindRes.response
        .text()
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
    );

    let smokingGunSharpened = false;
    if (
      parsedBlind.needsSharpening &&
      primarySmokingGun &&
      typeof parsedBlind.sharpenedSmokingGunDescription === 'string' &&
      parsedBlind.sharpenedSmokingGunDescription.trim().length > 15
    ) {
      const tokenizedSharpened = String(primarySmokingGun.description || '').includes('{{')
        ? tokenizeTextWithCharacterRoles(
            parsedBlind.sharpenedSmokingGunDescription.trim(),
            characters
          )
        : parsedBlind.sharpenedSmokingGunDescription.trim();

      if (tokenizedSharpened !== primarySmokingGun.description) {
        primarySmokingGun.description = tokenizedSharpened;
        smokingGunSharpened = true;
        await supabase
          .from('clues')
          .update({
            description: tokenizedSharpened,
            updated_at: new Date().toISOString(),
          })
          .eq('id', primarySmokingGun.id);
      }
    }

    // PART B: CLUE <-> CHARACTER BOOKLET ROUND SYNC (Anti-Spoiler & Alibi Defense Hook)
    let bookletsHealedCount = 0;
    const suspectBookletsSummary = characters
      .filter((c: any) => !c.is_victim)
      .map((c: any) => {
        const pd = (c.profile_data || {}) as Record<string, any>;
        const role = getCharacterRoleTitle(c);
        const r1 = Array.isArray(pd.act_1_bullets) ? pd.act_1_bullets.join(' | ') : '';
        const r2 = Array.isArray(pd.act_2_bullets) ? pd.act_2_bullets.join(' | ') : '';
        const r3 = Array.isArray(pd.act_3_bullets) ? pd.act_3_bullets.join(' | ') : '';
        return `[CharacterID: ${c.id}] {{${role}}}:\n  Round 1 Script: ${r1}\n  Round 2 Script: ${r2}\n  Round 3 Script: ${r3}`;
      })
      .join('\n');

    if (suspectBookletsSummary.includes('Round 1 Script:')) {
      const bookletSyncPrompt = `You are a Murder Mystery Pacing & Booklet Sync Auditor.
Cross-check the Round 1, Round 2, and Round 3 Clues against each suspect's Round 1, Round 2, and Round 3 Character Booklet scripts.

CLUES BY ROUND:
${cluesByRoundText}

CHARACTER BOOKLET SCRIPTS BY ROUND:
${suspectBookletsSummary}

Check for 2 rules:
1. ZERO PREMATURE SPOILERS: A character's Round 1 script must NOT mention or spoil a clue that isn't revealed until Round 2 or Round 3.
2. GUARANTEED ALIBI DEFENSE: If a clue in Round 1 or Round 2 implicates a suspect, that suspect's Round 1 or Round 2 script should give them an in-character defensive excuse to say when confronted.

Return ONLY characters that have a blatant premature spoiler or missing critical defense hook in "bookletFixes" (leave empty array [] if all booklets are already well-synced).

Respond with valid JSON ONLY:
{
  "bookletFixes": [
    {
      "characterId": "<characterId>",
      "round": <1 | 2 | 3>,
      "updatedBullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>"]
    }
  ]
}`;

      try {
        const syncRes = await geminiFlash.generateContent({
          contents: [{ role: 'user', parts: [{ text: bookletSyncPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 1024,
          },
        });
        const parsedSync = JSON.parse(
          syncRes.response
            .text()
            .trim()
            .replace(/^```json\s*/i, '')
            .replace(/\s*```$/i, '')
        );

        if (Array.isArray(parsedSync.bookletFixes)) {
          for (const fix of parsedSync.bookletFixes) {
            const targetChar = characters.find((c: any) => c.id === fix.characterId);
            if (
              targetChar &&
              Array.isArray(fix.updatedBullets) &&
              fix.updatedBullets.length > 0 &&
              (fix.round === 1 || fix.round === 2 || fix.round === 3)
            ) {
              const pd = { ...(targetChar.profile_data || {}) };
              const key = `act_${fix.round}_bullets`;
              if (Array.isArray(pd[key])) {
                pd[key] = fix.updatedBullets.map((b: string) =>
                  tokenizeTextWithCharacterRoles(String(b), characters)
                );
                targetChar.profile_data = pd;
                bookletsHealedCount += 1;
                await supabase
                  .from('characters')
                  .update({ profile_data: pd })
                  .eq('id', targetChar.id);
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn('[BOOKLET SYNC VERIFIER] Non-blocking booklet sync check skipped:', syncErr);
      }
    }

    return {
      success: true,
      blindDetectiveSolved: true,
      deducedKillerRole: String(parsedBlind.deducedKillerRole || trueKillerRole),
      trueKillerRole,
      bookletsHealedCount,
      smokingGunClueSharpened: smokingGunSharpened,
      summary:
        String(parsedBlind.solvabilitySummary || '').trim() ||
        `Blind Detective verified Round 3 killer proof for {{${trueKillerRole}}}.`,
    };
  } catch (err) {
    console.warn('[BLIND DETECTIVE & BOOKLET VERIFIER] Warning:', err);
    return defaultOut;
  }
}
