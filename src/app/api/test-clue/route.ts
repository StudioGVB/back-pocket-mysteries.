import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

function extractAiPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    if (url.includes('aiPhotoUrl=')) {
      const match = url.match(/[?&]aiPhotoUrl=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    if (url.startsWith('data:image/') || url.includes('/storage/v1/object/public/')) {
      return url;
    }
  } catch (e) {
    console.error('Error parsing aiPhotoUrl:', e);
  }
  return null;
}

async function getBase64FromUrl(url: string): Promise<string> {
  if (url.startsWith('data:image/')) {
    const commaIndex = url.indexOf(',');
    return url.substring(commaIndex + 1);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${url}, status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

function getFriendlyHairColor(hex: string | null): string {
  if (!hex) return '';
  const cleanHex = hex.replace('#', '').toLowerCase();
  const mapping: Record<string, string> = {
    '282828': 'black',
    '4a3123': 'dark brown',
    'a0785a': 'light brown',
    'a55728': 'auburn',
    'c2a67e': 'ash blonde',
    'e8b07d': 'strawberry blonde',
    'd6b370': 'golden blonde',
    'f4f0e6': 'white blonde',
    'd95319': 'orange red',
    'ca4444': 'cherry red',
    'e8e1e1': 'silver / white',
    'f59797': 'pastel pink',
    'e84393': 'hot pink',
    '4b0082': 'indigo',
    '00a8ff': 'bright blue',
    '00b894': 'mint green'
  };
  return mapping[cleanHex] || '';
}

function extractHairColorFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[&?]hairColor=([^&]+)/);
  return match ? match[1] : null;
}

function extractHairLengthFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[&?]hairLength=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function extractHairTextureFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[&?]hairTexture=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildCharDescription(char: any, refId?: number) {
  const profile = char.profile_data || {};
  const cleanName = (char.name || '').split('|')[0]?.trim();
  const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
  const genderStr = char.gender || profile.gender || '';

  const eyeColor = profile.eye_color || profile.eyeColor;
  const url = profile.avatar_url || profile.avatarUrl;
  const hairHex = extractHairColorFromAvatarUrl(url);
  const hairColor = getFriendlyHairColor(hairHex);
  const hairLength = extractHairLengthFromAvatarUrl(url);
  const hairTexture = extractHairTextureFromAvatarUrl(url);

  const parts = [];
  if (hairColor) {
    if (hairLength && hairLength !== 'Bald') {
      if (['Hijab', 'Turban', 'Beanie'].includes(hairLength)) {
        parts.push(`${hairColor.toLowerCase()} hair under a ${hairLength.toLowerCase()}`);
      } else {
        const textureStr = hairTexture ? ` ${hairTexture.toLowerCase()}` : ' straight';
        parts.push(`${hairLength.toLowerCase()} length,${textureStr} texture ${hairColor.toLowerCase()} hair`);
      }
    } else if (hairLength === 'Bald') {
      parts.push('bald / no hair');
    } else {
      parts.push(`${hairColor} hair`);
    }
  } else if (hairLength === 'Bald') {
    parts.push('bald / no hair');
  }

  if (eyeColor) parts.push(`${eyeColor.toLowerCase()} eyes`);
  if (genderStr) parts.push(genderStr.toLowerCase());
  const desc = parts.join(', ');

  let outfit = profile.outfit_advice || '';
  if (!outfit) {
    const pres = (genderStr || '').toLowerCase().includes('female') || (genderStr || '').toLowerCase() === 'f'
      ? profile.presentation_female 
      : profile.presentation_male;
    if (pres) {
      outfit = pres.outfit_advice || '';
    }
  }

  let mergedDesc = desc;
  if (outfit) {
    mergedDesc = desc ? `${desc}, styled like: ${outfit}` : `styled like: ${outfit}`;
  }

  const refStr = refId ? ` (matching subject [${refId}])` : '';
  return mergedDesc ? `${guestName}${refStr} (${mergedDesc})` : `${guestName}${refStr}`;
}

function getInvolvedCharacters(clue: any, characters: any[]): any[] {
  const title = (clue.title || '').toLowerCase().replace(/[_\-\/\\()]/g, ' ');
  const desc = clue.description || '';
  const descNormalized = desc.toLowerCase().replace(/[_\-\/\\()]/g, ' ');
  const prompt = (clue.generation_prompt || '').toLowerCase().replace(/[_\-\/\\()]/g, ' ');

  const involved = new Set<any>();

  // 1. Check if there are active speaker/sender/recipient markers in the description
  const activeNames = new Set<string>();
  const lines = desc.split('\n').map((l: string) => l.trim());
  
  for (const line of lines) {
    // Match "Sender: {{Name}}" or "Sender: Name" or "Recipient: {{Name}}" or "Recipient: Name" or "Speakers: {{Name}}"
    const srMatch = line.match(/^(?:Sender|Recipient|Speakers):\s*(?:\{\{)?([^\}]+?)(?:\}\})?(?:\s*\||$)/i);
    if (srMatch) {
      const names = srMatch[1]
        .replace(/[_\-\/\\()]/g, ' ')
        .split(/[\s,&]+/)
        .map((n: string) => n.trim().toLowerCase());
      names.forEach((n: string) => {
        if (n) activeNames.add(n);
      });
    }

    // Match "[time] {{Name}}:" or "[time] Name:"
    const chatMatch = line.match(/^\[[^\]]+\]\s*(?:\{\{)?([^\}]+?)(?:\}\})?:\s*/i);
    if (chatMatch) {
      const names = chatMatch[1]
        .replace(/[_\-\/\\()]/g, ' ')
        .split(/[\s,&]+/)
        .map((n: string) => n.trim().toLowerCase());
      names.forEach((n: string) => {
        if (n) activeNames.add(n);
      });
    }
  }

  // If we found any active participants, we only involve characters who are active participants
  if (activeNames.size > 0) {
    for (const char of characters) {
      const rawName = char.name || '';
      const cleanName = rawName.split('|')[0]?.trim().toLowerCase();
      if (!cleanName) continue;

      const profile = char.profile_data || {};
      const guestName = (profile.name || profile.guest_name || profile.guestName || '').toLowerCase();

      if (
        activeNames.has(cleanName) || 
        (guestName && activeNames.has(guestName)) ||
        Array.from(activeNames).some(activeWord => activeWord === cleanName || (guestName && activeWord === guestName))
      ) {
        involved.add(char);
      }
    }
  } else {
    // Fall back to scanning the entire text
    for (const char of characters) {
      const rawName = char.name || '';
      const cleanName = rawName.split('|')[0]?.trim();
      if (!cleanName) continue;

      const tokenRegex = new RegExp(`\\{\\{${cleanName}\\}\\}`, 'i');
      const wordRegex = new RegExp(`\\b${cleanName}\\b`, 'i');

      const profile = char.profile_data || {};
      const guestName = profile.name || profile.guest_name || profile.guestName || '';
      const guestTokenRegex = guestName ? new RegExp(`\\{\\{${guestName}\\}\\}`, 'i') : null;
      const guestWordRegex = guestName ? new RegExp(`\\b${guestName}\\b`, 'i') : null;

      if (
        tokenRegex.test(title) || tokenRegex.test(descNormalized) || tokenRegex.test(prompt) ||
        wordRegex.test(title) || wordRegex.test(descNormalized) || wordRegex.test(prompt) ||
        (guestTokenRegex && (guestTokenRegex.test(title) || guestTokenRegex.test(descNormalized) || guestTokenRegex.test(prompt))) ||
        (guestWordRegex && (guestWordRegex.test(title) || guestWordRegex.test(descNormalized) || guestWordRegex.test(prompt)))
      ) {
        involved.add(char);
      }
    }
  }

  return Array.from(involved);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  try {
    const mysteryId = '69b65a91-1cc2-4267-94a4-59297428af28';
    const clueId = 'eef0ae36-73a5-46ab-ae21-26fd1b18207b'; // Rikki's Side Chat

    const { data: mystery } = await supabase.from('mysteries').select('*').eq('id', mysteryId).single();
    const { data: characters } = await supabase.from('characters').select('*').eq('mystery_id', mysteryId);
    const { data: guests } = await supabase.from('guests').select('*').eq('user_id', mystery?.created_by || '');
    const { data: clue } = await supabase.from('clues').select('*').eq('id', clueId).single();

    if (!clue) {
      return NextResponse.json({ error: 'Clue not found' });
    }

    const guestMap = new Map<string, any>();
    if (guests) {
      for (const guest of guests) {
        guestMap.set(guest.id, guest);
      }
    }

    const hydratedCharacters = (characters || []).map(char => {
      const charProfile = (char.profile_data as any) || {};
      const guestId = charProfile.guest_id;
      if (guestId && guestMap.has(guestId)) {
        const guest = guestMap.get(guestId);
        return {
          ...char,
          gender: guest.gender || char.gender,
          profile_data: {
            ...charProfile,
            avatar_url: guest.avatar_url,
            eye_color: guest.eye_color || charProfile.eye_color,
            height: guest.height || charProfile.height,
            ethnicity: guest.ethnicity || charProfile.ethnicity,
            guest_name: guest.name,
          }
        };
      }
      return char;
    });

    const isScreen = true;

    let basePrompt = clue.generation_prompt?.trim() || clue.title || '';
    basePrompt = basePrompt.replace(/[_\-]/g, ' ');

    const involvedCharacters = getInvolvedCharacters(clue, hydratedCharacters);

    const referenceImages: any[] = [];
    const charToRefIdMap = new Map<string, number>();
    let refIdCounter = 1;

    for (const char of involvedCharacters) {
      const cleanName = (char.name || '').split('|')[0]?.trim();
      if (!cleanName) continue;

      const aiUrl = extractAiPhotoUrl(char.profile_data?.avatar_url);
      if (aiUrl) {
        try {
          const base64Bytes = await getBase64FromUrl(aiUrl);
          referenceImages.push({
            referenceId: refIdCounter,
            referenceImage: {
              imageBytes: base64Bytes
            }
          });
          charToRefIdMap.set(cleanName, refIdCounter);
          refIdCounter++;
        } catch (e) {
          console.error(`Failed to download avatar:`, e);
        }
      }
    }

    const cleanName1 = (involvedCharacters[0].name || '').split('|')[0]?.trim();
    const refId1 = charToRefIdMap.get(cleanName1);
    const desc1 = buildCharDescription(involvedCharacters[0], refId1);
    const cleanName2 = (involvedCharacters[1].name || '').split('|')[0]?.trim();
    const refId2 = charToRefIdMap.get(cleanName2);
    const desc2 = buildCharDescription(involvedCharacters[1], refId2);
    const device = 'smartphone';

    const finalPrompt = `A professional photograph showing a vertical split-screen. On the left side: a close-up of ${desc1} looking at a ${device} in a dimly lit room. On the right side: a close-up of ${desc2} looking at a ${device} in a dimly lit room. Both ${device} screens are completely black, dark, off, with absolutely NO text, NO writing, NO letters, NO numbers, and NO symbols. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`;
    const payload = {
      instances: [
        {
          prompt: finalPrompt,
          ...(referenceImages.length > 0 ? { reference_images: referenceImages } : {})
        }
      ],
      parameters: { 
        sampleCount: 1, 
        aspectRatio: "1:1", 
        outputOptions: { mimeType: "image/jpeg" },
        personGeneration: "allow_adult"
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseText = await res.text();

    return NextResponse.json({
      googleStatus: res.status,
      googleOk: res.ok,
      involvedCharacters: involvedCharacters.map(c => c.name),
      finalPrompt,
      referenceImagesCount: referenceImages.length,
      responseJson: responseText.startsWith('{') ? JSON.parse(responseText) : responseText
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
