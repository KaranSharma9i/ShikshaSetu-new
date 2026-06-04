import { GoogleGenAI } from "@google/genai";

export interface ScoringResult {
  overall_score: number;
  completeness: number;
  concept_clarity: number;
  presentation: number;
  insights?: string[];           // Pro only — exactly 2 items
  wrong_answers?: Array<{ question_number: number; description: string }>;
  partial_answers?: Array<{ question_number: number; description: string }>;
}

export interface ScoringParams {
  base64Image: string;           // raw base64, no data:image prefix
  subject: string;
  grade: string;
  title: string;
  topicDescription: string;
  planTier: 'STANDARD' | 'PRO';
  questions?: any[];
}

export async function scoreHomework(params: ScoringParams): Promise<ScoringResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const ai = new GoogleGenAI({ apiKey });

  let prompt = `You are the AI homework evaluator for Margam ERP. Evaluate the student's homework submission from the image provided.
  
Homework Details:
- Subject: ${params.subject}
- Grade/Class: ${params.grade}
- Assignment Title: ${params.title}
- Topic Description: ${params.topicDescription}
`;

  if (params.questions && params.questions.length > 0) {
    prompt += `\nHere are the exact questions that the student had to answer:\n`;
    params.questions.forEach((q: any) => {
      prompt += `Question ${q.question_number} (${q.type}): ${q.question}\n`;
      if (q.options && q.options.length > 0) {
        prompt += `Options:\n` + q.options.map((opt: string) => `  - ${opt}`).join('\n') + `\n`;
      }
    });
  }

  prompt += `
Analyze the handwritten or typed text inside the image. Check for accuracy, completeness, understanding of concepts, and presentation.

Be strict and conservative in scoring. Do NOT give benefit of the doubt.
If a question appears blank or unanswered, deduct 1 point from overall_score 
and 1.5 points from completeness per skipped question.
Partial answers should score no more than 50% of their question's weight.
A score of 8+ should only be given for genuinely excellent work.

Provide your evaluation as a JSON object with the following fields:
- overall_score: A numeric score from 0.00 to 10.00.
- completeness: A numeric score from 0.00 to 10.00.
- concept_clarity: A numeric score from 0.00 to 10.00.
- presentation: A numeric score from 0.00 to 10.00.`;

  if (params.planTier === 'PRO') {
    prompt += `
Additionally, because the student is on the Pro tier, you must also provide:
- insights: An array of EXACTLY 2 strings highlighting specific learning patterns, conceptual strengths, or actionable tips for improvement.
- wrong_answers: An array of objects representing specific incorrect answers. Each object must have:
    * question_number (number): The question number as identified in the homework.
    * description (string): A short explanation of the error.
- partial_answers: An array of objects representing partially correct or incomplete answers. Each object must have:
    * question_number (number): The question number.
    * description (string): A short explanation of what was correct and what was missing or needs improvement.`;
  }

  prompt += `

Respond with ONLY this JSON structure. Do not wrap the JSON output in markdown blocks (like \`\`\`json).`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: params.base64Image } }
        ]
      }
    ],
    config: {
      maxOutputTokens: 2048,
      temperature: 0.1,
      responseMimeType: "application/json",
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response text returned from Gemini");
  }

  // Parse the JSON output
  let parsedJson: any;
  try {
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();
    parsedJson = JSON.parse(cleanText);
  } catch (parseError: any) {
    console.error("Failed to parse Gemini response as JSON. Raw text was:", text);
    throw parseError; // do not swallow it
  }

  const clamp = (val: any): number => {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(10, num));
  };

  const result: ScoringResult = {
    overall_score: clamp(parsedJson.overall_score),
    completeness: clamp(parsedJson.completeness),
    concept_clarity: clamp(parsedJson.concept_clarity),
    presentation: clamp(parsedJson.presentation),
  };

  if (params.planTier === 'PRO') {
    // Process insights: exactly 2 items
    let insights: string[] = [];
    if (Array.isArray(parsedJson.insights)) {
      insights = parsedJson.insights.slice(0, 2).map((item: any) => String(item));
    }
    while (insights.length < 2) {
      insights.push("Excellent work on the assignment.");
    }
    result.insights = insights;

    // Process wrong_answers
    if (Array.isArray(parsedJson.wrong_answers)) {
      result.wrong_answers = parsedJson.wrong_answers.map((item: any) => ({
        question_number: Number(item.question_number) || 0,
        description: String(item.description || "")
      }));
    } else {
      result.wrong_answers = [];
    }

    // Process partial_answers
    if (Array.isArray(parsedJson.partial_answers)) {
      result.partial_answers = parsedJson.partial_answers.map((item: any) => ({
        question_number: Number(item.question_number) || 0,
        description: String(item.description || "")
      }));
    } else {
      result.partial_answers = [];
    }
  }

  return result;
}
