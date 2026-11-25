import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const k = match[1].trim();
      const v = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiKey) {
  console.error('Missing SUPABASE or GEMINI env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);
const MYSTERY_ID = '61196e53-09c3-427f-8862-30151f2ca75b';

const ONLY_IDS = new Set([
  '5f9b36e0-44ae-4c3d-9762-432c5bb17783',
]);

const CHARACTER_SPECS = {
  'da18ef00-ecdc-41e7-8c71-97d78046e43b': {
    roleTitle: 'The Husband',
    guestName: 'Luke',
    gender: 'male',
    physicalDesc:
      'Handsome Caucasian adult man in his early 30s with short styled dark brown hair, warm brown eyes, and a neat short trimmed dark beard/stubble (strictly NO glasses)',
    outfit:
      'Rich emerald-green velvet dinner jacket blazer over a crisp white dress shirt with a black silk bow tie (Signature Color: Forest Green)',
  },
  '44d70cd0-9f04-408b-8ac9-e064eb5c31d0': {
    roleTitle: 'The Wife',
    guestName: 'Gabby',
    gender: 'female',
    physicalDesc:
      'Beautiful Caucasian adult woman in her late 20s to early 30s with long wavy golden-blonde hair parted in the middle, blue-green eyes, warm poised expression (strictly NO glasses)',
    outfit:
      'Elegant crimson-red velvet off-the-shoulder evening dress bodice with delicate gold necklace and drop earrings (Signature Color: Crimson Red)',
  },
  'd1433643-ac1b-4689-af57-84bb77c2be33': {
    roleTitle: 'The Sister-in-Law',
    guestName: 'Elia',
    gender: 'female',
    physicalDesc:
      'Beautiful Mediterranean / Caucasian adult woman in her late 20s with sleek straight dark black-brown hair parted in the middle with a delicate crystal snowflake hair clip on one side, expressive brown eyes, and deep berry-red lipstick (strictly NO glasses)',
    outfit:
      'Chic icy-silver satin collared silk blouse buttoned at the chest with layered silver chain necklaces (Signature Color: Icy Silver)',
  },
  '5f9b36e0-44ae-4c3d-9762-432c5bb17783': {
    roleTitle: 'The Mistress',
    guestName: 'kiri',
    gender: 'female',
    physicalDesc:
      'Glamorous Caucasian adult woman in her mid-20s with sleek straight platinum-honey blonde hair tucked behind her ears, bright blue eyes, and bold red evening lipstick (strictly NO glasses)',
    outfit:
      'Glamorous metallic champagne-gold sequin spaghetti-strap cocktail dress bodice with crystal and pearl drop earrings (Signature Color: Metallic Gold)',
  },
  '3f17dfda-9758-49fa-a3df-cdf4f6b25ef7': {
    roleTitle: 'The Co-Worker',
    guestName: 'Jason',
    gender: 'male',
    physicalDesc:
      'Caucasian adult man in his early 30s with short neat dark brown hair, light facial stubble, wearing stylish dark-framed rectangular eyeglasses',
    outfit:
      'Tailored navy-charcoal wool dinner blazer over a deep burgundy dress shirt with a silk tie (Signature Color: Charcoal Grey)',
  },
  'f3187085-155b-4389-9bf2-58c6dcc26d1b': {
    roleTitle: 'The Bestie',
    guestName: 'Matt',
    gender: 'male',
    physicalDesc:
      'Caucasian adult man in his early 30s with sandy medium-brown wavy hair, friendly blue eyes, and a short neat trimmed beard (strictly NO glasses)',
    outfit:
      'Rich plum-burgundy shawl-collar knit cardigan layered over a crisp dark charcoal dress shirt and festive tie (Signature Color: Burgundy Wine)',
  },
};

async function auditPortraitWithCritic(b64, spec) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const criticPrompt = `You are a strict Portrait QA Critic. Inspect this portrait for ${spec.guestName} (${spec.roleTitle}).
Check these 3 mandatory rules:
1. Full-Bleed Edge-to-Edge 1:1 Frame: Does the dark background fill 100% of the image from the far-left edge to the far-right edge with ZERO white or light vertical letterbox bars on the sides?
2. Strict Waist-Up Medium Portrait Framing: Is the person framed from the waist/chest up to above the head (strictly NO full-body shot, NO legs/knees/shoes)?
3. Unified Dark Candlelit Room Backdrop: Is the background a dark, moody candlelit room with warm golden candle flames and bokeh lights (strictly NO bright white background, NO green tinsel wall, NO full Christmas tree with presents on the floor)?

Respond with valid JSON ONLY:
{
  "passed": <true if all 3 rules pass, else false>,
  "reason": "<brief explanation>"
}`;
    const res = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: b64 } },
            { text: criticPrompt },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 200 },
    });
    const text = res.response.text().trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(text);
  } catch (err) {
    console.warn(`Critic check warning:`, err.message);
    return { passed: true, reason: 'critic skipped' };
  }
}

async function generatePortrait(charId, spec) {
  const existingPath = path.resolve(
    process.cwd(),
    `public/generated-avatars/${charId}-synced-candlelit.jpg`
  );
  if (!ONLY_IDS.has(charId) && fs.existsSync(existingPath)) {
    console.log(`Keeping verified synced portrait for ${spec.guestName} (${spec.roleTitle})`);
    return fs.readFileSync(existingPath);
  }

  const prompt = `Create a canonical photorealistic 1:1 SQUARE FULL-BLEED STANDARD CHARACTER REFERENCE PORTRAIT (strict WAIST-UP medium studio portrait) for "${spec.roleTitle}" at an upscale candlelit Christmas Eve dinner party.

SUBJECT PHYSICAL APPEARANCE (MUST MATCH EXACTLY):
- ${spec.physicalDesc}

LOCKED SIGNATURE COSTUME (UPPER BODY DOWN TO WAIST):
- ${spec.outfit}

MANDATORY CAMERA FRAMING & UNIFIED DARK CANDLELIT BACKDROP (MUST MATCH ALL OTHER CHARACTER CARDS):
1. 100% FULL-BLEED 1:1 SQUARE FRAME (ZERO WHITE SIDE BARS / ZERO BORDERS): The dark candlelit room background MUST extend completely edge-to-edge across the entire square canvas. Strictly NO white vertical letterbox bars on the left or right sides, NO margins, and NO borders.
2. STRICT WAIST-UP MEDIUM PORTRAIT CROP: Frame the character strictly from the WAIST / HIP BELT-LINE UP to ~10% headroom above the top of their head. Their face occupies ~25% of the vertical frame height, centered horizontally, showing their upper-body torso, shoulders, arms, and waist. Strictly NO full-body shots, NO legs, NO thighs, NO knees, NO feet.
3. UNIFIED DARK CANDLELIT DINING ROOM BACKDROP: A dark, moody charcoal-mahogany candlelit evening dining room background (#181210) with soft out-of-focus warm golden candle flames on a dark mantelpiece/table and warm golden fairy-light bokeh circles (2700K) softly glowing at waist-to-shoulder height in the dark background behind the subject. Strictly NO full Christmas trees with presents on the floor, NO green walls with metallic tinsel strips, and NO plain white or solid studio backgrounds.
4. Shot on 85mm prime lens at f/2.8, cinematic warm candlelit key lighting on the face and costume with subtle rim light, natural photorealistic skin texture, 8k resolution. Strictly NO text, NO labels, NO watermarks.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    console.log(`Generating synced waist-up candlelit portrait for ${spec.guestName} (${spec.roleTitle}) [attempt ${attempt}]...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });
    if (!res.ok) {
      console.warn(`Gemini HTTP ${res.status}:`, await res.text());
      await new Promise((r) => setTimeout(r, 3500));
      continue;
    }
    const data = await res.json();
    const imgPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    const b64 = imgPart?.inlineData?.data;
    if (!b64) {
      console.warn(`Empty image on attempt ${attempt}, finishReason=${data.candidates?.[0]?.finishReason}`);
      await new Promise((r) => setTimeout(r, 2500));
      continue;
    }

    const audit = await auditPortraitWithCritic(b64, spec);
    console.log(`Critic audit for ${spec.guestName}:`, audit);
    if (audit.passed || attempt === 4) {
      return Buffer.from(b64, 'base64');
    }
  }
  throw new Error(`Failed to generate portrait for ${spec.guestName}`);
}

async function run() {
  const outDir = path.resolve(process.cwd(), 'public/generated-avatars');
  fs.mkdirSync(outDir, { recursive: true });

  const uploadedUrls = {};

  for (const [charId, spec] of Object.entries(CHARACTER_SPECS)) {
    const imgBuf = await generatePortrait(charId, spec);
    const localFileName = `${charId}-synced-candlelit.jpg`;
    const localFilePath = path.join(outDir, localFileName);
    fs.writeFileSync(localFilePath, imgBuf);
    console.log(`Saved local portrait: ${localFilePath} (${imgBuf.length} bytes)`);

    const storagePath = `standard-characters/${MYSTERY_ID}/${localFileName}`;
    const { error: upErr } = await supabase.storage
      .from('character-images')
      .upload(storagePath, imgBuf, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (upErr) {
      console.warn(`Storage upload warning for ${storagePath}:`, upErr.message);
      uploadedUrls[charId] = `/generated-avatars/${localFileName}`;
    } else {
      const { data: pubData } = supabase.storage
        .from('character-images')
        .getPublicUrl(storagePath);
      uploadedUrls[charId] = pubData.publicUrl;
      console.log(`Uploaded to Supabase Storage: ${pubData.publicUrl}`);
    }
  }

  console.log('\nFINAL SYNCED URLS:\n', JSON.stringify(uploadedUrls, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
