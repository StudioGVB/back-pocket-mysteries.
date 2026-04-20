const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
async function run() {
  // It doesn't actually expose listModels in the JS SDK directly easily sometimes, let's just make a fetch call
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`);
  const data = await response.json();
  console.log(data.models.map(m => m.name));
}
run();
