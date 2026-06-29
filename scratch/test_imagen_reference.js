const fs = require('fs');
const path = require('path');

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

const apiKey = env['GOOGLE_GENERATIVE_AI_API_KEY'];

async function run() {
  const imagePath = '/Users/gabriellablyth/.gemini/antigravity/brain/86e18f66-d560-4399-8bac-749005b85ec8/anonymous_facedown_phone_1782217160557.png';
  if (!fs.existsSync(imagePath)) {
    console.error('Test image does not exist:', imagePath);
    return;
  }

  const imageBytes = fs.readFileSync(imagePath).toString('base64');
  console.log('Sending request to Imagen 4.0 Fast with reference_images...');

  const payload = {
    instances: [
      {
        prompt: 'A close-up photograph of a smartphone lying on a table.',
        reference_images: [
          {
            referenceId: 1,
            referenceImage: {
              imageBytes: imageBytes
            },
            config: {
              referenceType: 'SUBJECT'
            }
          }
        ]
      }
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1"
    }
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log('Response status:', res.status);
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    console.log('Response JSON:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Raw response text:', text);
  }
}

run();
