import { GoogleGenAI } from '@google/genai';

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Tell me a short story',
    });
    console.log("SUCCESS");
    console.log(response.text);
  } catch (e: any) {
    console.error("ERROR CAUGHT:");
    console.error(e.message);
  }
}

test();
