import { NextRequest, NextResponse } from 'next/server';
import { logAiUsage } from '@/utils/ai-logger';

const VALID_GENDERS = ['Masculine', 'Feminine', 'Neutral'] as const;
const VALID_AGES = ['young', 'middle_aged', 'old'] as const;
const VALID_ETHNICITIES = [
  'Caucasian / White',
  'Black / African Descent',
  'East Asian',
  'South Asian',
  'Southeast Asian',
  'Hispanic / Latino',
  'Middle Eastern',
  'Native American / Indigenous',
  'Pacific Islander',
  'Mixed / Multiracial',
] as const;

const SKIN_COLOR_MAP: Record<string, string> = {
  Porcelain: 'ffe0bd',
  Fair: 'ffcd94',
  Light: 'eac086',
  Olive: 'd08b5b',
  'Light Brown': 'ae5d29',
  'Medium Brown': '8d5524',
  'Dark Brown': '614335',
  Deep: '3b2219',
};

const HAIR_COLOR_MAP: Record<string, string> = {
  Black: '282828',
  'Dark Brown': '4a3123',
  'Light Brown': 'a0785a',
  Auburn: 'a55728',
  'Ash Blonde': 'c2a67e',
  'Strawberry Blonde': 'e8b07d',
  'Golden Blonde': 'd6b370',
  'White Blonde': 'f4f0e6',
  'Orange Red': 'd95319',
  'Cherry Red': 'ca4444',
  'Silver / White': 'e8e1e1',
  'Pastel Pink': 'f59797',
  'Hot Pink': 'e84393',
  Indigo: '4b0082',
  'Bright Blue': '00a8ff',
  'Mint Green': '00b894',
};

const VALID_HAIR_LENGTHS = [
  'Bald',
  'Buzz / Crew Cut',
  'Short',
  'Medium',
  'Shoulder-Length',
  'Long',
  'Very Long',
  'Hijab',
  'Turban',
  'Beanie',
  'Baseball Cap',
] as const;

const VALID_HAIR_TEXTURES = [
  'Straight',
  'Small Waves',
  'Wavy',
  'Loose Curls',
  'Curly',
  'Very Curly',
  'Coily',
  'Dreads',
  'Afro',
] as const;

const VALID_HAIR_STYLES = [
  'Natural / Classic',
  'Textured Crop / Curly Fringe',
  'Taper Fade / Voluminous Top',
  'Middle Part / Curtain Fringe',
  'Side Part / Swept',
  'Quiff / Pompadour',
  'Slicked Back',
  'Modern Mullet / Shag',
  'Bangs / Full Fringe',
  'Layered Blowout',
  'High Ponytail / Bun',
  'Braids / Cornrows',
] as const;

const VALID_FACIAL_HAIR = [
  'none',
  'stubbleLight',
  'beardLight',
  'beardMedium',
  'beardMajestic',
  'moustacheFancy',
  'moustacheMagnum',
  'goatee',
] as const;

const VALID_EYE_COLORS = [
  'Brown',
  'Blue',
  'Green',
  'Hazel',
  'Grey',
  'Heterochromia',
] as const;

const VALID_FACE_SHAPES = [
  'Square / Angular Jaw',
  'Oval / Balanced',
  'Chiseled / High Cheekbones',
  'Round / Soft Jaw',
  'Heart-Shaped / Tapered Chin',
  'Long / Sculpted',
] as const;

const VALID_BUILDS = [
  'Slender',
  'Athletic',
  'Average',
  'Curvy',
  'Heavy-set',
  'Broad-shouldered',
] as const;

const VALID_DISTINCTIVE_FEATURES = [
  'Thick / Dark Eyebrows',
  'Cleft / Dimpled Chin',
  'Cheek Dimples',
  'Freckles',
  'Beauty Mark',
  'Glasses',
  'Sun-Kissed Tan',
  'Earrings / Piercings',
] as const;

export async function POST(req: NextRequest) {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Please log into your account to scan guest traits.' },
        { status: 401 }
      );
    }

    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    let imageBase64: string = body?.imageBase64 || '';
    let mimeType: string = body?.mimeType || 'image/jpeg';

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided for trait scanning.' },
        { status: 400 }
      );
    }

    // Strip data URI prefix if present
    const dataUriMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      imageBase64 = dataUriMatch[2];
    }

    const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
    if (!ALLOWED_MIMES.has(mimeType.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unsupported image format. Please upload a JPEG, PNG, or WebP photo.' },
        { status: 400 }
      );
    }

    if (imageBase64.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image is too large. Please upload a photo under 6 MB.' },
        { status: 413 }
      );
    }

    const prompt = `Analyze the person in this reference photo and map their visible physical appearance traits to the exact allowed option values below so our form checkboxes can be auto-selected and our AI portrait generator can create an accurate likeness.
If multiple people are visible, focus on the most prominent/centered face.
Note: Ignore camera flash red-eye artifacts when determining natural eye color.

Return ONLY a valid JSON object with these exact keys and allowed string values:
{
  "gender": one of ["Masculine", "Feminine", "Neutral"],
  "age": one of ["young", "middle_aged", "old"] ("young" = 18-30, "middle_aged" = 30-50, "old" = 50+),
  "ethnicity": one of ["Caucasian / White", "Black / African Descent", "East Asian", "South Asian", "Southeast Asian", "Hispanic / Latino", "Middle Eastern", "Native American / Indigenous", "Pacific Islander", "Mixed / Multiracial"],
  "skinToneLabel": one of ["Porcelain", "Fair", "Light", "Olive", "Light Brown", "Medium Brown", "Dark Brown", "Deep"],
  "hairColorLabel": one of ["Black", "Dark Brown", "Light Brown", "Auburn", "Ash Blonde", "Strawberry Blonde", "Golden Blonde", "White Blonde", "Orange Red", "Cherry Red", "Silver / White", "Pastel Pink", "Hot Pink", "Indigo", "Bright Blue", "Mint Green"],
  "hairLength": one of ["Bald", "Buzz / Crew Cut", "Short", "Medium", "Shoulder-Length", "Long", "Very Long", "Hijab", "Turban", "Beanie", "Baseball Cap"] (IMPORTANT: Only use "Buzz / Crew Cut" for very short military clipper buzzcuts under 0.5 inch. For men with short/tapered sides and a 1.5-3.5 inch curly/wavy/styled top, choose "Short"; if the top or curls are fuller/longer above the ears, choose "Medium"),
  "hairTexture": one of ["Straight", "Small Waves", "Wavy", "Loose Curls", "Curly", "Very Curly", "Coily", "Dreads", "Afro"],
  "hairStyle": one of ["Natural / Classic", "Textured Crop / Curly Fringe", "Taper Fade / Voluminous Top", "Middle Part / Curtain Fringe", "Side Part / Swept", "Quiff / Pompadour", "Slicked Back", "Modern Mullet / Shag", "Bangs / Full Fringe", "Layered Blowout", "High Ponytail / Bun", "Braids / Cornrows"] (For men with thick curls or textured hair on top falling slightly onto the upper forehead with shorter sides, choose "Textured Crop / Curly Fringe" or "Taper Fade / Voluminous Top"),
  "facialHair": one of ["none", "stubbleLight", "beardLight", "beardMedium", "beardMajestic", "moustacheFancy", "moustacheMagnum", "goatee"] (use "stubbleLight" for light 5 o'clock shadow, "beardLight" for short trimmed beard, "beardMedium" for full beard, "none" if clean-shaven),
  "eyeColor": one of ["Brown", "Blue", "Green", "Hazel", "Grey", "Heterochromia"],
  "faceShape": one of ["Square / Angular Jaw", "Oval / Balanced", "Chiseled / High Cheekbones", "Round / Soft Jaw", "Heart-Shaped / Tapered Chin", "Long / Sculpted"],
  "build": one of ["Slender", "Athletic", "Average", "Curvy", "Heavy-set", "Broad-shouldered"],
  "distinctiveFeatures": array containing any applicable values from ["Thick / Dark Eyebrows", "Cleft / Dimpled Chin", "Cheek Dimples", "Freckles", "Beauty Mark", "Glasses", "Sun-Kissed Tan", "Earrings / Piercings"],
  "likenessNotes": "A concise 1-to-2 sentence physical likeness description (max 220 characters) capturing their exact hairstyle shape & curl/fringe placement, eyebrow thickness, jawline/chin contour, and smile so an AI portrait artist can match their real likeness."
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      }
    );

    // Clear reference to base64 payload immediately after API call
    imageBase64 = '';

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini trait scan error:', errText);
      return NextResponse.json(
        { error: 'Failed to analyze photo. Please try a clearer image.' },
        { status: 502 }
      );
    }

    const result = await response.json();

    // Log minimal token usage asynchronously so we don't block the UI response
    void logAiUsage({
      model_name: 'gemini-2.5-flash',
      feature_name: 'guest_photo_trait_scan',
      usageMetadata: result?.usageMetadata || null,
    }).catch(() => {});

    const rawText =
      result?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === 'string')?.text ||
      '{}';

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleanJson = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    const gender = VALID_GENDERS.includes(parsed.gender) ? parsed.gender : 'Masculine';
    const age = VALID_AGES.includes(parsed.age) ? parsed.age : 'young';
    const ethnicity = VALID_ETHNICITIES.includes(parsed.ethnicity) ? parsed.ethnicity : '';

    const skinToneLabel =
      parsed.skinToneLabel && SKIN_COLOR_MAP[parsed.skinToneLabel]
        ? parsed.skinToneLabel
        : 'Light';
    const skinColor = SKIN_COLOR_MAP[skinToneLabel] || 'eac086';

    const hairColorLabel =
      parsed.hairColorLabel && HAIR_COLOR_MAP[parsed.hairColorLabel]
        ? parsed.hairColorLabel
        : 'Dark Brown';
    const hairColor = HAIR_COLOR_MAP[hairColorLabel] || '4a3123';

    const hairLength = VALID_HAIR_LENGTHS.includes(parsed.hairLength)
      ? parsed.hairLength
      : gender === 'Feminine'
      ? 'Long'
      : 'Short';

    const hairTexture = VALID_HAIR_TEXTURES.includes(parsed.hairTexture)
      ? parsed.hairTexture
      : 'Straight';

    const hairStyle = VALID_HAIR_STYLES.includes(parsed.hairStyle)
      ? parsed.hairStyle
      : 'Natural / Classic';

    const rawFacial = VALID_FACIAL_HAIR.includes(parsed.facialHair) ? parsed.facialHair : 'none';
    const facialHair =
      gender !== 'Feminine' && rawFacial !== 'none' ? rawFacial : undefined;

    const eyeColor = VALID_EYE_COLORS.includes(parsed.eyeColor) ? parsed.eyeColor : 'Brown';
    const faceShape = VALID_FACE_SHAPES.includes(parsed.faceShape)
      ? parsed.faceShape
      : 'Oval / Balanced';
    const build = VALID_BUILDS.includes(parsed.build) ? parsed.build : 'Average';

    const distinctiveFeatures: string[] = Array.isArray(parsed.distinctiveFeatures)
      ? parsed.distinctiveFeatures.filter((f: string) =>
          (VALID_DISTINCTIVE_FEATURES as readonly string[]).includes(f)
        )
      : [];

    const likenessNotes =
      typeof parsed.likenessNotes === 'string' && parsed.likenessNotes.trim()
        ? parsed.likenessNotes.trim().slice(0, 260)
        : '';

    const summaryParts = [
      gender,
      age === 'young' ? 'Young Adult' : age === 'middle_aged' ? 'Adult' : 'Mature',
      `${skinToneLabel} Skin`,
      hairLength === 'Bald'
        ? 'Bald'
        : `${hairLength} ${hairTexture} ${hairColorLabel} Hair (${hairStyle})`,
      `${eyeColor} Eyes`,
      faceShape,
      ...(facialHair ? [facialHair.replace('beard', 'Beard ').replace('moustache', 'Moustache ').replace('stubbleLight', 'Light Stubble')] : []),
      ...distinctiveFeatures,
    ];

    return NextResponse.json(
      {
        success: true,
        traits: {
          gender,
          age,
          ethnicity,
          skinColor,
          skinToneLabel,
          hairColor,
          hairColorLabel,
          hairLength,
          hairTexture,
          hairStyle,
          facialHair,
          eyeColor,
          faceShape,
          build,
          distinctiveFeatures,
          likenessNotes,
        },
        summary: summaryParts.join(' • '),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in /api/guests/scan-traits:', error);
    return NextResponse.json(
      { error: error?.message || 'Unexpected error scanning traits.' },
      { status: 500 }
    );
  }
}
