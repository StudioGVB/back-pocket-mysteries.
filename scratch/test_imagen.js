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
const theme = "1920s Speakeasy / Great Gatsby";
const description = "A dramatic murder mystery.";
const characterNames = "Gabby, Sienna, Dane, Colt, Milo";
const prompt = `A highly cinematic, gritty noir photograph. 5 characters standing together at the scene of the crime. Wide angle shot, full body or medium-full framing, leave plenty of headroom above the characters so no heads are cropped out. Theme: ${theme}. Context: ${description}. Characters: ${characterNames}. The characters are young adults (ages 20 to 40) and feature a highly diverse mix of ethnicities (e.g., Black, Asian, Hispanic, White). Dramatic low-key lighting, deep shadows, sepia or desaturated tones, mystery, suspense. Professional photography, sharp focus, 8k resolution.`;

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  const payload = {
    instances: [{ prompt }],
    parameters: { sampleCount: 1, aspectRatio: "16:9", outputOptions: { mimeType: "image/jpeg" } }
  };
  
  console.log('Sending request to Imagen API...');
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  console.log('Response Status:', res.status);
  const text = await res.text();
  console.log('Response Body:', text);
}

test();
