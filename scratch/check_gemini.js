const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function checkModels() {
  // Try to get key from env or you can paste it here temporarily
  const apiKey = process.env.GEMINI_API_KEY || "PASTE_YOUR_KEY_HERE";
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log("Available Gemini Models:");
    data.models?.forEach(m => console.log(`- ${m.name}`));
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

checkModels();
