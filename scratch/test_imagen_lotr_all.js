const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
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

const apiKey = env['GOOGLE_GENERATIVE_AI_API_KEY'];

// Mock characters and their guest cast info
const characters = [
  { name: 'Sienna', guestName: 'Polly', desc: 'female, blonde hair, blue eyes', outfit: 'Bookish but curated' },
  { name: 'Zayn', guestName: 'Matt', desc: 'male, black hair, brown eyes', outfit: 'Sleek, modern dark blazer' },
  { name: 'Rikki', guestName: 'Scarlett', desc: 'female, brown hair, green eyes', outfit: 'Edgy leather jacket' },
  { name: 'Brooke', guestName: 'Elia', desc: 'female, auburn hair, hazel eyes', outfit: 'Elegant evening gown' },
  { name: 'Gabby', guestName: 'Gabriella Blyth', desc: 'female, black hair, brown eyes', outfit: 'High-fashion velvet suit' },
  { name: 'Dane', guestName: 'Luke', desc: 'male, blonde hair, blue eyes', outfit: 'Casual designer hoodie' },
  { name: 'Milo', guestName: 'Seedy', desc: 'male, short orange hair, green eyes', outfit: 'Bright orange retro jacket' },
  { name: 'Jeremy', guestName: 'Jeremy', desc: 'male, brown hair, brown eyes', outfit: 'Classic production wear' },
  { name: 'Ava', guestName: 'Ava', desc: 'female, blonde hair, green eyes', outfit: 'Chic cocktail dress' }
];

function hydratePrompt(basePrompt) {
  let prompt = basePrompt;
  characters.forEach(char => {
    const regex = new RegExp(char.name, 'g');
    const replacement = `${char.guestName} (${char.desc}, styled like: ${char.outfit})`;
    prompt = prompt.replace(regex, replacement);
  });
  return prompt;
}

const testClues = [
  {
    title: "Sienna & Zayn's Plan",
    basePrompt: "Split screen photograph with a clean vertical divide line in the middle. On the left: Sienna looking down at a glowing blank smartphone screen in a dressing room. On the right: Zayn looking down at a glowing blank smartphone screen on a dark penthouse balcony. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.",
    isScreen: true
  },
  {
    title: "Rikki's Side Chat",
    basePrompt: "Split screen photograph with a clean vertical divide line in the middle. On the left: Rikki looking down at a glowing blank smartphone screen in a dimly-lit bar lounge. On the right: Ava looking down at a glowing blank smartphone screen in a luxury bedroom. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.",
    isScreen: true
  },
  {
    title: "The Wardrobe Intercept Audio",
    basePrompt: "A premium matte-black podcasting microphone standing on a sleek glossy table, illuminated by a moody green spotlight from behind. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k.",
    isAudio: true
  },
  {
    title: "The Recorded Argument",
    basePrompt: "A moody close-up of a professional sound mixing board in a dimly lit audio suite, with small green and yellow indicator lights glowing in the dark. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k.",
    isAudio: true
  }
];

async function runTest() {
  for (const clue of testClues) {
    console.log(`\n================== TESTING CLUE: ${clue.title} ==================`);
    const hydrated = hydratePrompt(clue.basePrompt);
    console.log('Hydrated Prompt:', hydrated);

    let finalPrompt = '';
    if (clue.isAudio) {
      finalPrompt = `A high-quality, professional photograph: ${hydrated}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: This is a real, live-action photograph taken with a DSLR camera. The image MUST be highly photorealistic. CRITICAL: Any people in the image MUST look between 25 and 30 years old. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art, NO vector graphics. CRITICAL: The image MUST contain absolutely NO text, NO writing, NO letters, NO numbers, and NO symbols. Any device screens shown must be completely blank, dark, or out of focus.`;
    } else if (clue.isScreen) {
      finalPrompt = `A high-quality, professional photograph: ${hydrated}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: This is a real, live-action photograph taken with a DSLR camera. The image MUST be highly photorealistic. CRITICAL: Any people in the image MUST look between 25 and 30 years old. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art, NO vector graphics. CRITICAL: The phone or laptop screen in the image MUST be completely blank, dark, or out of focus with absolutely NO text, NO writing, NO letters, and NO numbers.`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    const payload = {
      instances: [{ prompt: finalPrompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1", outputOptions: { mimeType: "image/jpeg" }, personGeneration: "allow_adult" }
    };

    console.log('Sending API request...');
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log('API Status:', res.status);
    const body = await res.json();
    if (res.ok) {
      console.log('SUCCESS! Generated image bytes length:', body.predictions?.[0]?.bytesBase64Encoded?.length || 0);
    } else {
      console.error('ERROR response:', body);
    }
  }
}

runTest();
