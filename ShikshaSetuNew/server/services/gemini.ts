import { GoogleGenAI } from "@google/genai";
import { GenerateHomeworkRequest, GeneratedContent } from "../types/generation";

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (this.ai) return this.ai;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    this.ai = new GoogleGenAI({ apiKey });
    return this.ai;
  }

  async generateHomework(req: GenerateHomeworkRequest): Promise<GeneratedContent> {
    const { mcq, very_short, short, long, case_study, assertion_reason } = req.question_config;
    const totalQuestions =
      (mcq || 0) +
      (very_short || 0) +
      (short || 0) +
      (long || 0) +
      (case_study || 0) +
      (assertion_reason || 0);

    if (totalQuestions === 0) {
      throw new Error("At least one question type must have count > 0");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isDummy = !apiKey || apiKey === "AIzaSyBgrd0fWl7Ia-sTpY49mz3TA5xyE0qwjvUs";

    if (isDummy) {
      console.warn("Using mock homework generation because GEMINI_API_KEY is missing or the default placeholder.");
      return this.generateMockHomework(req, totalQuestions);
    }

    const aiClient = this.getClient();

    const prompt = `You are an expert CBSE curriculum question paper setter for Indian schools.
Generate a homework assignment for the following:

Grade: ${req.grade}
Subject: ${req.subject}
Title: ${req.title}
Topic/Instructions: ${req.topic_description}

Difficulty Level: ${req.difficulty}
Question complexity guidelines for this difficulty:

Easy: Direct recall and basic comprehension. Simple language. Questions
test factual knowledge from the chapter. Suitable for students who are
encountering the topic for the first time.
Medium: Application and understanding. Questions require students to apply
concepts, explain reasoning, or solve straightforward problems. Moderate
cognitive demand.
Hard: Analysis, evaluation and higher-order thinking (Bloom's Taxonomy
levels 4–6). Questions require synthesis of multiple concepts, critical
reasoning, or multi-step problem solving. Challenging for average students.

Generate ALL questions at the ${req.difficulty} difficulty level described above.

Generate exactly the following number of questions by type:
- Multiple Choice (MCQ): ${mcq || 0} questions
- Very Short Answer: ${very_short || 0} questions
- Short Answer: ${short || 0} questions
- Long Answer: ${long || 0} questions
- Case Study Based: ${case_study || 0} questions
- Assertion-Reason: ${assertion_reason || 0} questions

Rules:
1. Follow CBSE curriculum guidelines and standard question patterns strictly.
2. Questions must be appropriate for ${req.grade} students.
3. MCQ options must be labeled A, B, C, D as plain strings in an array.
4. Assertion-Reason questions must follow the standard CBSE format with
   Assertion and Reason statements and 4 options:
   A) Both Assertion and Reason are true and Reason is the correct explanation
   B) Both Assertion and Reason are true but Reason is not the correct explanation
   C) Assertion is true but Reason is false
   D) Assertion is false but Reason is true
5. Case Study questions must include a short paragraph passage followed by
   sub-questions.
6. For non-MCQ types, options must be null.
7. Number questions sequentially from 1 across all types.
8. Do not include answers or marking scheme.

Respond with ONLY this JSON structure, no markdown, no explanation:
{
  "questions": [
    {
      "question_number": 1,
      "type": "MCQ",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."]
    },
    {
      "question_number": 2,
      "type": "SHORT",
      "question": "...",
      "options": null
    }
  ]
}`;

    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text returned from Gemini");
      }

      // Cleanup markdown if it gets through anyway
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

      const parsed = JSON.parse(cleanText);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid output format: questions field must be an array");
      }

      const generatedContent: GeneratedContent = {
        questions: parsed.questions,
        metadata: {
          subject: req.subject,
          grade: req.grade,
          title: req.title,
          topic: req.topic_description,
          total_questions: totalQuestions,
          generated_at: new Date().toISOString(),
          difficulty: req.difficulty,
        },
      };

      return generatedContent;
    } catch (error: any) {
      if (
        error.message &&
        (error.message.includes("API key not valid") ||
          error.message.includes("API_KEY_INVALID"))
      ) {
        console.warn("Gemini API key is invalid. Falling back to mock homework generation.");
        return this.generateMockHomework(req, totalQuestions);
      }
      throw new Error(`Gemini Service Error: ${error.message}`);
    }
  }

  private generateMockHomework(
    req: GenerateHomeworkRequest,
    totalQuestions: number
  ): GeneratedContent {
    const {
      mcq = 0,
      very_short = 0,
      short = 0,
      long = 0,
      case_study = 0,
      assertion_reason = 0,
    } = req.question_config;
    const questions: any[] = [];
    let num = 1;

    for (let i = 0; i < mcq; i++) {
      questions.push({
        question_number: num++,
        type: "MCQ",
        question: `Multiple Choice Question ${i + 1} regarding ${
          req.title || req.topic_description || "the topic"
        }: What is the primary concept?`,
        options: [
          "A. Option A description",
          "B. Option B description",
          "C. Option C description",
          "D. Option D description",
        ],
      });
    }

    for (let i = 0; i < very_short; i++) {
      questions.push({
        question_number: num++,
        type: "VERY_SHORT",
        question: `Very Short Answer Question ${i + 1} on ${
          req.title || req.topic_description || "the topic"
        }: Briefly define the main term.`,
        options: null,
      });
    }

    for (let i = 0; i < short; i++) {
      questions.push({
        question_number: num++,
        type: "SHORT",
        question: `Short Answer Question ${i + 1} on ${
          req.title || req.topic_description || "the topic"
        }: Explain the relationship or solve the given problem.`,
        options: null,
      });
    }

    for (let i = 0; i < long; i++) {
      questions.push({
        question_number: num++,
        type: "LONG",
        question: `Long Answer Question ${i + 1} on ${
          req.title || req.topic_description || "the topic"
        }: Elaborate on the core mechanism. Discuss its applications and implications in detail.`,
        options: null,
      });
    }

    for (let i = 0; i < case_study; i++) {
      questions.push({
        question_number: num++,
        type: "CASE_STUDY",
        question: `Case Study ${i + 1}: Read the passage below and answer the sub-questions.\n\nPassage: In a classroom experiment regarding ${
          req.title || req.topic_description || "the topic"
        }, students observed the following trends...\n\nSub-questions:\n1. What is the dependent variable?\n2. Justify the observed relationship.`,
        options: null,
      });
    }

    for (let i = 0; i < assertion_reason; i++) {
      questions.push({
        question_number: num++,
        type: "ASSERTION_REASON",
        question: `Assertion-Reason Question ${i + 1}:\nAssertion: The topic is highly relevant for class study.\nReason: It forms the foundation for advanced concepts in the curriculum.`,
        options: [
          "A) Both Assertion and Reason are true and Reason is the correct explanation",
          "B) Both Assertion and Reason are true but Reason is not the correct explanation",
          "C) Assertion is true but Reason is false",
          "D) Assertion is false but Reason is true",
        ],
      });
    }

    return {
      questions,
      metadata: {
        subject: req.subject,
        grade: req.grade,
        title: req.title,
        topic: req.topic_description,
        total_questions: totalQuestions,
        generated_at: new Date().toISOString(),
        difficulty: req.difficulty,
      },
    };
  }
}

export const geminiService = new GeminiService();
