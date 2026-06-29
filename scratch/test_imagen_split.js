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
const prompt = `A high-quality, professional photograph: Split screen photograph with a clean vertical divide line in the middle. On the left: Polly looking down at a glowing blank smartphone screen in a dressing room. On the right: Matt looking down at a glowing blank smartphone screen on a dark penthouse balcony. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: This is a real, live-action photograph taken with a DSLR camera. The image MUST be highly photorealistic. CRITICAL: Any people in the image MUST look between 25 and 30 years old. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art, NO vector graphics. CRITICAL: The phone or laptop screen in the image MUST be completely blank, dark, or out of focus with absolutely NO text, NO writing, NO letters, and NO numbers.`;

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  const payload = {
    instances: [{ prompt }],
    parameters: { sampleCount: 1, aspectRatio: "1:1", outputOptions: { mimeType: "image/jpeg" }, personGeneration: "allow_adult" }
  };
  
  console.log('Sending request to Imagen API...');
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  console.log('Response Status:', res.status);
  const text = await res.text();
  console.log('Response Body:', text.substring(0, 1000));
}

test();
