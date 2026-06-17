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

  private isRetryableGeminiError(error: any): boolean {
    if (!error) return false;

    // Check HTTP status code (numeric)
    if (error.status === 429 || error.status === 503) {
      return true;
    }

    // Parse error message if it's JSON to find standard Google API error status strings
    if (typeof error.message === 'string') {
      if (error.message.includes('"UNAVAILABLE"') || error.message.includes('"RESOURCE_EXHAUSTED"')) {
        return true;
      }
      try {
        const parsed = JSON.parse(error.message);
        const apiStatus = parsed?.error?.status;
        if (apiStatus === 'UNAVAILABLE' || apiStatus === 'RESOURCE_EXHAUSTED') {
          return true;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return false;
  }

  async generateContentWithFallback(
    contents: any,
    config?: any
  ): Promise<any> {
    const aiClient = this.getClient();

    const defaultChain = [
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
    ];

    const envModel = process.env.GEMINI_MODEL;
    const modelChain: string[] = [];
    if (envModel) {
      modelChain.push(envModel);
    }
    for (const m of defaultChain) {
      if (!modelChain.includes(m)) {
        modelChain.push(m);
      }
    }

    let lastError: any = null;

    for (const model of modelChain) {
      try {
        console.log(`[GeminiService] Attempting generation using model: ${model}`);
        const response = await aiClient.models.generateContent({
          model,
          contents,
          config,
        });
        console.log(`[GeminiService] Generation succeeded using model: ${model}`);
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`[GeminiService] Model ${model} failed:`, error.message || error);

        if (this.isRetryableGeminiError(error)) {
          console.warn(`[GeminiService] Error is retryable. Falling back to the next model...`);
          continue;
        } else {
          console.error(`[GeminiService] Non-retryable error encountered. Aborting chain.`);
          throw error;
        }
      }
    }

    console.error(`[GeminiService] All models in the fallback chain failed.`);
    throw lastError || new Error("All models in the fallback chain failed");
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
4. Assertion-Reason questions must follow the standard CBSE format. In the JSON, the Assertion statement must be in the "question" field, the Reason statement must be in the "reason" field, and the "options" field must be an array containing exactly these 4 strings:
   "A. Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A)."
   "B. Both Assertion (A) and Reason (R) are true, but Reason (R) is not the correct explanation of Assertion (A)."
   "C. Assertion (A) is true, but Reason (R) is false."
   "D. Assertion (A) is false, but Reason (R) is true."
5. Case Study questions must include a short paragraph passage in the "question" field, and a "sub_questions" array containing sub-questions (e.g. MCQ questions with options).
6. For non-MCQ types (except ASSERTION_REASON options and CASE_STUDY sub_questions options), options must be null.
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
      "type": "ASSERTION_REASON",
      "question": "<Assertion statement>",
      "reason": "<Reason statement>",
      "options": [
        "A. Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).",
        "B. Both Assertion (A) and Reason (R) are true, but Reason (R) is not the correct explanation of Assertion (A).",
        "C. Assertion (A) is true, but Reason (R) is false.",
        "D. Assertion (A) is false, but Reason (R) is true."
      ]
    },
    {
      "question_number": 3,
      "type": "CASE_STUDY",
      "question": "<Passage text>",
      "options": null,
      "sub_questions": [
        {
          "question_number": "3.1",
          "type": "MCQ",
          "question": "...",
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."]
        }
      ]
    },
    {
      "question_number": 4,
      "type": "SHORT",
      "question": "...",
      "options": null
    }
  ]
}`;

    try {
      const response = await this.generateContentWithFallback(prompt, {
        responseMimeType: "application/json",
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text returned from Gemini");
      }

      const parsed = this.parseGeminiJson(text);

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

      let userFriendlyMessage = error.message;
      if (typeof error.message === "string") {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed?.error?.message) {
            userFriendlyMessage = parsed.error.message;
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
      throw new Error(`Gemini Service Error: ${userFriendlyMessage}`);
    }
  }

  /**
   * Robustly parse JSON text from Gemini, handling common issues:
   * - Markdown code fences
   * - Invalid escape sequences (e.g. \', \a, bare backslashes)
   * - Control characters inside strings
   */
  private parseGeminiJson(rawText: string): any {
    let text = rawText.trim();

    // Strip markdown code fences
    if (text.startsWith("```json")) {
      text = text.substring(7);
    } else if (text.startsWith("```")) {
      text = text.substring(3);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    // First attempt: try parsing as-is
    try {
      return JSON.parse(text);
    } catch (_firstError) {
      // Continue to sanitization
    }

    // Sanitize invalid escape sequences.
    // Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
    // Replace any backslash NOT followed by a valid escape char with \\
    let sanitized = text.replace(
      /\\(?!["\\/bfnrtu])/g,
      "\\\\"
    );

    // Remove control characters (U+0000–U+001F) except those inside valid \n, \r, \t escapes
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

    // Second attempt: parse sanitized text
    try {
      return JSON.parse(sanitized);
    } catch (_secondError) {
      // Continue to more aggressive cleanup
    }

    // Third attempt: try to extract the JSON object with a regex
    const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_thirdError) {
        // Fall through
      }
    }

    // All attempts failed – throw with useful context
    const preview = text.substring(0, 200);
    throw new Error(
      `Failed to parse Gemini response as JSON after sanitization. Preview: ${preview}...`
    );
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
      const qNum = num++;
      questions.push({
        question_number: qNum,
        type: "CASE_STUDY",
        question: `Case Study ${i + 1}: Read the passage below and answer the sub-questions.\n\nPassage: In a classroom experiment regarding ${
          req.title || req.topic_description || "the topic"
        }, students observed the trends and recorded the data as shown.`,
        options: null,
        sub_questions: [
          {
            question_number: `${qNum}.1`,
            type: "MCQ",
            question: "What is the primary factor observed in this experiment?",
            options: [
              "A. Temperature",
              "B. Volume",
              "C. Pressure",
              "D. Concentration"
            ]
          },
          {
            question_number: `${qNum}.2`,
            type: "MCQ",
            question: "Identify the independent variable.",
            options: [
              "A. Time",
              "B. Distance",
              "C. Velocity",
              "D. Force"
            ]
          }
        ]
      });
    }

    for (let i = 0; i < assertion_reason; i++) {
      questions.push({
        question_number: num++,
        type: "ASSERTION_REASON",
        question: "The topic is highly relevant for class study.",
        reason: "It forms the foundation for advanced concepts in the curriculum.",
        options: [
          "A. Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).",
          "B. Both Assertion (A) and Reason (R) are true, but Reason (R) is not the correct explanation of Assertion (A).",
          "C. Assertion (A) is true, but Reason (R) is false.",
          "D. Assertion (A) is false, but Reason (R) is true."
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
