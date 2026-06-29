require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function run() {
  const prompt = "A photorealistic portrait of a person.";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 }
    })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Keys in data:', Object.keys(data));
  console.log(JSON.stringify(data).substring(0, 500));
}
run();
