async function test() {
  const prompt = "A photorealistic portrait of a young man.";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1", personGeneration: "allow_adult" }
    })
  });
  console.log('Status:', response.status);
  const data = await response.json();
  console.log(Object.keys(data));
  if (data.predictions) {
    console.log('Got predictions!');
    console.log(Object.keys(data.predictions[0]));
    const base64 = data.predictions[0].bytesBase64Encoded;
    if (base64) {
      console.log('Got base64 length:', base64.length);
    }
  } else if (data.error) {
    console.log('Error:', data.error);
  } else {
    console.log(JSON.stringify(data).substring(0, 200));
  }
}
test();
