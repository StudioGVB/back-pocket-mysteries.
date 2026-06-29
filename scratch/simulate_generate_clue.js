const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1]] = val;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
const apiKey = env['GOOGLE_GENERATIVE_AI_API_KEY'];

function getFriendlyHairColor(hex) {
  if (!hex) return '';
  const cleanHex = hex.replace('#', '').toLowerCase();
  const mapping = {
    '282828': 'black',
    '4a3123': 'brown',
    'a55728': 'auburn/red',
    'd6b370': 'blonde',
    'f59797': 'pink',
    'e8e1e1': 'silver/white',
    'ca4444': 'red',
    '4b0082': 'purple',
    '00a8ff': 'blue',
    'e84393': 'pink',
    '00b894': 'green'
  };
  return mapping[cleanHex] || '';
}

function extractHairColorFromAvatarUrl(url) {
  if (!url) return null;
  const match = url.match(/[&?]hairColor=([^&]+)/);
  return match ? match[1] : null;
}

function getGuestPhysicalDescription(profileData, gender) {
  if (!profileData) return '';
  
  const eyeColor = profileData.eye_color || profileData.eyeColor;
  const hairHex = extractHairColorFromAvatarUrl(profileData.avatar_url || profileData.avatarUrl);
  const hairColor = getFriendlyHairColor(hairHex);
  const currentGender = profileData.gender || gender;

  const parts = [];
  if (hairColor) parts.push(`${hairColor} hair`);
  if (eyeColor) parts.push(`${eyeColor.toLowerCase()} eyes`);
  if (currentGender) parts.push(currentGender.toLowerCase());

  return parts.join(', ');
}

function hydrateTextWithCharacters(text, characters, mode, charToRefIdMap) {
  if (!text) return '';
  let hydrated = text;

  characters.forEach(char => {
    const rawName = char.name || '';
    const cleanName = rawName.split('|')[0].trim();
    if (!cleanName) return;

    const tokenRegex = new RegExp(`{{${cleanName}}}`, 'gi');
    const profile = char.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
    const genderStr = char.gender || profile.gender || '';

    if (mode === 'print') {
      hydrated = hydrated.replace(tokenRegex, guestName);
    } else {
      const desc = getGuestPhysicalDescription(profile, genderStr);
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

      let replacement = mergedDesc ? `${guestName} (${mergedDesc})` : guestName;
      if (charToRefIdMap && charToRefIdMap.has(cleanName)) {
        const refId = charToRefIdMap.get(cleanName);
        replacement = mergedDesc 
          ? `${guestName} (matching subject [${refId}], ${mergedDesc})`
          : `${guestName} (matching subject [${refId}])`;
      }
      hydrated = hydrated.replace(tokenRegex, replacement);
    }
  });

  return hydrated;
}

function extractAiPhotoUrl(url) {
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

async function getBase64FromUrl(url) {
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

function getInvolvedCharacters(clue, characters) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();

  const involved = new Set();

  for (const char of characters) {
    const rawName = char.name || '';
    const cleanName = rawName.split('|')[0].trim();
    if (!cleanName) continue;

    const tokenRegex = new RegExp(`\\{\\{${cleanName}\\}\\}`, 'i');
    const wordRegex = new RegExp(`\\b${cleanName}\\b`, 'i');

    const profile = char.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || '';
    const guestTokenRegex = guestName ? new RegExp(`\\{\\{${guestName}\\}\\}`, 'i') : null;
    const guestWordRegex = guestName ? new RegExp(`\\b${guestName}\\b`, 'i') : null;

    if (
      tokenRegex.test(title) || tokenRegex.test(desc) || tokenRegex.test(prompt) ||
      wordRegex.test(title) || wordRegex.test(desc) || wordRegex.test(prompt) ||
      (guestTokenRegex && (guestTokenRegex.test(title) || guestTokenRegex.test(desc) || guestTokenRegex.test(prompt))) ||
      (guestWordRegex && (guestWordRegex.test(title) || guestWordRegex.test(desc) || guestWordRegex.test(prompt)))
    ) {
      involved.add(char);
    }
  }

  const victim = characters.find(c => c.is_victim);
  if (victim) {
    const victimRegex = /{{victim}}/i;
    if (victimRegex.test(title) || victimRegex.test(desc) || victimRegex.test(prompt)) {
      involved.add(victim);
    }
  }

  const killer = characters.find(c => c.plot_role === 'killer');
  if (killer) {
    const killerRegex = /{{killer}}/i;
    if (killerRegex.test(title) || killerRegex.test(desc) || killerRegex.test(prompt)) {
      involved.add(killer);
    }
  }

  return Array.from(involved);
}

function buildCharDescription(char) {
  const profile = char.profile_data || {};
  const cleanName = (char.name || '').split('|')[0].trim();
  const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
  const genderStr = char.gender || profile.gender || '';

  const eyeColor = profile.eye_color || profile.eyeColor;

  const hairHex = (function() {
    const url = profile.avatar_url || profile.avatarUrl;
    if (!url) return null;
    const match = url.match(/[&?]hairColor=([^&]+)/);
    return match ? match[1] : null;
  })();

  const hairColor = (function() {
    if (!hairHex) return '';
    const cleanHex = hairHex.replace('#', '').toLowerCase();
    const mapping = {
      '282828': 'black',
      '4a3123': 'brown',
      'a55728': 'auburn/red',
      'd6b370': 'blonde',
      'f59797': 'pink',
      'e8e1e1': 'silver/white',
      'ca4444': 'red',
      '4b0082': 'purple',
      '00a8ff': 'blue',
      'e84393': 'pink',
      '00b894': 'green'
    };
    return mapping[cleanHex] || '';
  })();

  const parts = [];
  if (hairColor) parts.push(`${hairColor} hair`);
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

  return mergedDesc ? `${guestName} (${mergedDesc})` : guestName;
}

function isCctvOrVideoClue(clue) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('cctv') ||
    title.includes('video') ||
    title.includes('camera') ||
    title.includes('photo') ||
    title.includes('polaroid') ||
    desc.includes('cctv') ||
    desc.includes('security cam') ||
    desc.includes('camera footage') ||
    desc.includes('video footage') ||
    desc.includes('metadata: sec cam') ||
    prompt.includes('cctv') ||
    prompt.includes('security camera') ||
    prompt.includes('surveillance')
  );
}

function isAudioClue(clue) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('audio') ||
    title.includes('voice note') ||
    title.includes('recorded') ||
    title.includes('recording') ||
    title.includes('clip') ||
    title.includes('sound') ||
    desc.includes('🎙️') ||
    desc.includes('audio recording') ||
    desc.includes('voice note') ||
    prompt.includes('microphone') ||
    prompt.includes('soundboard') ||
    prompt.includes('audio recorder')
  );
}

function isScreenClue(clue) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('smartphone') ||
    title.includes('phone') ||
    title.includes('text') ||
    title.includes('chat') ||
    title.includes('dm') ||
    title.includes('sms') ||
    title.includes('screen') ||
    title.includes('email') ||
    title.includes('message') ||
    title.includes('whatsapp') ||
    title.includes('imessage') ||
    desc.includes('chat thread') ||
    desc.includes('text message') ||
    desc.includes('dm thread') ||
    desc.includes('private dm') ||
    prompt.includes('phone') ||
    prompt.includes('screen') ||
    prompt.includes('chat') ||
    prompt.includes('message')
  );
}

async function simulate(clueId) {
  console.log(`\n=================== Simulating Clue ${clueId} ===================`);
  
  const { data: clue, error: clueError } = await supabase
    .from('clues')
    .select('*')
    .eq('id', clueId)
    .single();

  if (clueError || !clue) {
    console.error('Clue not found:', clueError);
    return;
  }

  const { data: mystery, error: mysteryError } = await supabase
    .from('mysteries')
    .select('created_by')
    .eq('id', clue.mystery_id)
    .single();

  if (mysteryError || !mystery) {
    console.error('Mystery not found:', mysteryError);
    return;
  }

  const { data: characters, error: charError } = await supabase
    .from('characters')
    .select('id, name, gender, profile_data, is_victim, plot_role')
    .eq('mystery_id', clue.mystery_id);

  if (charError) {
    console.error('Characters fetch error:', charError);
    return;
  }

  const { data: guests, error: guestsError } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', mystery.created_by);

  if (guestsError) {
    console.error('Guests fetch error:', guestsError);
    return;
  }

  const guestMap = new Map();
  if (guests) {
    for (const g of guests) {
      guestMap.set(g.id, g);
    }
  }

  const hydratedCharacters = characters.map(char => {
    const charProfile = char.profile_data || {};
    const guestId = charProfile.guest_id;
    if (guestId && guestMap.has(guestId)) {
      const g = guestMap.get(guestId);
      return {
        ...char,
        profile_data: {
          ...charProfile,
          avatar_url: g.avatar_url,
        }
      };
    }
    return char;
  });

  const isAudio = isAudioClue(clue);
  const isCctv = isCctvOrVideoClue(clue) && !isAudio;
  const isScreen = isScreenClue(clue) && !isAudio && !isCctv;

  console.log('Clue Title:', clue.title);
  console.log('Clue Type flags:', { isAudio, isCctv, isScreen });
  
  let basePrompt = clue.generation_prompt?.trim() || clue.title || '';
  basePrompt = basePrompt.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').trim();

  const victim = hydratedCharacters.find(c => c.is_victim);
  const killer = hydratedCharacters.find(c => c.plot_role === 'killer');
  if (victim) {
    const victimName = (victim.name || '').split('|')[0].trim();
    basePrompt = basePrompt.replace(/{{victim}}/gi, `{{${victimName}}}`);
  }
  if (killer) {
    const killerName = (killer.name || '').split('|')[0].trim();
    basePrompt = basePrompt.replace(/{{killer}}/gi, `{{${killerName}}}`);
  }

  for (const char of hydratedCharacters) {
    const rawName = char.name || '';
    const cleanName = rawName.split('|')[0].trim();
    if (!cleanName) continue;

    const profile = char.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || '';

    const charNameRegex = new RegExp(`(?<!\\{\\{)\\b${cleanName}\\b(?!\\}\\})`, 'gi');
    basePrompt = basePrompt.replace(charNameRegex, `{{${cleanName}}}`);

    if (guestName && guestName.toLowerCase() !== cleanName.toLowerCase()) {
      const guestNameRegex = new RegExp(`(?<!\\{\\{)\\b${guestName}\\b(?!\\}\\})`, 'gi');
      basePrompt = basePrompt.replace(guestNameRegex, `{{${cleanName}}}`);
    }
  }

  const involvedCharacters = getInvolvedCharacters(clue, hydratedCharacters);
  console.log('Involved characters:', involvedCharacters.map(c => c.name));

  const referenceImages = [];
  const charToRefIdMap = new Map();
  let refIdCounter = 1;

  for (const char of involvedCharacters) {
    const cleanName = (char.name || '').split('|')[0].trim();
    if (!cleanName) continue;

    const aiUrl = extractAiPhotoUrl(char.profile_data?.avatar_url);
    if (aiUrl) {
      try {
        console.log(`[DOWNLOAD REFERENCE] Downloading avatar for ${cleanName} from ${aiUrl}...`);
        const base64Bytes = await getBase64FromUrl(aiUrl);
        referenceImages.push({
          referenceId: refIdCounter,
          referenceImage: {
            imageBytes: base64Bytes
          },
          config: {
            referenceType: 'SUBJECT'
          }
        });
        charToRefIdMap.set(cleanName, refIdCounter);
        refIdCounter++;
      } catch (err) {
        console.error(`Failed to fetch avatar for ${cleanName}:`, err.message);
      }
    }
  }

  const hydratedPrompt = hydrateTextWithCharacters(basePrompt, hydratedCharacters, 'ai', charToRefIdMap);
  console.log('Hydrated Prompt:', hydratedPrompt);

  let finalPrompt = '';
  const charCount = involvedCharacters.length;

  if (isAudio) {
    finalPrompt = `A premium, dramatic, close-up photograph of a voice recorder in a dark room. The screen is completely black, dark, off, with absolutely NO text. Gritty noir aesthetic.`;
  } else if (isCctv) {
    finalPrompt = `A grainy, high-angle CCTV security camera footage frame of: ${hydratedPrompt}. Gritty noir aesthetic. CRITICAL: The image MUST contain absolutely NO text.`;
  } else if (isScreen) {
    if (charCount === 0) {
      finalPrompt = `A premium, dramatic, close-up photograph of a smartphone lying face-down, no screen visible. Gritty noir aesthetic.`;
    } else if (charCount === 1) {
      const desc1 = buildCharDescription(involvedCharacters[0]);
      finalPrompt = `A professional photograph of ${desc1} (matching subject [1]) looking down at a smartphone screen that is completely blank/black. Gritty noir aesthetic.`;
    } else if (charCount === 2) {
      const desc1 = buildCharDescription(involvedCharacters[0]);
      const desc2 = buildCharDescription(involvedCharacters[1]);
      finalPrompt = `A professional photograph showing a vertical split-screen. Left: ${desc1} (matching subject [1]) looking at a phone. Right: ${desc2} (matching subject [2]) looking at a phone. Both screens are blank/black. Gritty noir aesthetic.`;
    } else {
      finalPrompt = `A professional photograph showing a multi-panel collage of characters. Panel 1: matching subject [1]. Panel 2: matching subject [2]. Panel 3: matching subject [3]. All screens blank/black. Gritty noir aesthetic.`;
    }
  } else {
    finalPrompt = `A professional close-up photograph of a clue item: ${hydratedPrompt}. Gritty noir aesthetic.`;
  }
  
  console.log('Final Prompt sent to Imagen:', finalPrompt);
  console.log(`Reference images attached count: ${referenceImages.length}`);

  // Call Imagen
  console.log('Calling Imagen API...');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [
        {
          prompt: finalPrompt,
          ...(referenceImages.length > 0 ? { reference_images: referenceImages } : {})
        }
      ],
      parameters: { 
        sampleCount: 1, 
        aspectRatio: "1:1"
      }
    })
  });

  console.log('Imagen response status:', res.status);
  const responseText = await res.text();
  try {
    const data = JSON.parse(responseText);
    if (data.predictions?.[0]?.bytesBase64Encoded) {
      console.log('SUCCESS: Generated image bytes found.');
    } else {
      console.log('FAILED: No image bytes. Full response:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log('FAILED parsing JSON. Response body:', responseText);
  }
}

async function run() {
  const email = 'hello@studiogvb.com';
  const password = 'Password123!';

  console.log(`Signing in as ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('Sign in failed:', authError.message);
    return;
  }

  const { data: clues } = await supabase
    .from('clues')
    .select('id')
    .eq('mystery_id', '69b65a91-1cc2-4267-94a4-59297428af28')
    .limit(1);
  
  if (clues && clues.length > 0) {
    await simulate(clues[0].id);
  } else {
    console.error("No clues found in database for mystery 69b65a91-1cc2-4267-94a4-59297428af28");
  }
}

run();
