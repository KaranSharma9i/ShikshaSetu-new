// ShikshaSetuNew/src/gemini_flash.ts
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

// Explicitly pass your unique AI Studio API developer key string
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function main() {
  try {
    // 1. Point the system to your local test asset file (adjust name/path if needed)
    // Since this script is inside src/, we look up one folder level to find the assets directory
    const imagePath = path.join(__dirname, "..", "assets", "gurukul.png");
    
    // 2. Read the image file synchronously and turn it into a Base64 string
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    console.log("Reading file asset and sending data to Gemini 3.5 Flash...");

    // 3. Fire the multimodal data payload array
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType: "image/png", // Make sure this matches your image type (image/png or image/jpeg)
            data: base64Image
          }
        },
        { 
          text: "You are the AI homework evaluator for Margam ERP. Read the handwriting/text inside this uploaded image asset, calculate the quality score out of 10, and provide clear technical reasoning." 
        }
      ]
    });

    console.log("\n--- AI Evaluation Output ---");
    console.log(response.text);
    
  } catch (error) {
    console.error("Gemini Multi-Modal Pipeline Error:", error);
  }
}

main();