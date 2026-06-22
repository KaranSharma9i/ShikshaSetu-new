import { GoogleGenAI } from "@google/genai";
import { GenerateHomeworkRequest, GeneratedContent, GeneratedQuestion, SubQuestion, AnswerKey } from "../types/generation";

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
8. For every question and sub-question, you must include a detailed, type-appropriate 'answer_key' object. Do not include answers or marking schemes anywhere else in the question body.
   The 'answer_key' must match one of these strict formats based on the question type:
   - For MCQ and ASSERTION_REASON (and any OPTION-based sub-question):
     { "type": "OPTION", "correct_option_index": <0, 1, 2, or 3, representing A, B, C, or D> }
   - For VERY_SHORT, SHORT, and LONG questions:
     Choose if the question is mathematical/numerical or conceptual/written explanation:
       - If mathematical/numerical:
         { "type": "NUMERIC", "numeric_value": <finite number>, "numeric_unit": "<string or null>", "numeric_tolerance_percent": 2 }
       - If conceptual/written explanation:
         { "type": "TEXT", "model_answer": "<concise correct answer>", "rubric_points": ["<key point 1>", "<key point 2>", ...] } (list 2 to 4 key points that must be covered)
   - For CASE_STUDY: The parent question has no 'answer_key' (set to null or omit). Each sub-question in the 'sub_questions' array MUST have its own 'answer_key' using the rules above based on that sub-question's type.

Respond with ONLY this JSON structure, no markdown, no explanation:
{
  "questions": [
    {
      "question_number": 1,
      "type": "MCQ",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer_key": {
        "type": "OPTION",
        "correct_option_index": 1
      }
    },
    {
      "question_number": 2,
      "type": "SHORT",
      "question": "...",
      "options": null,
      "answer_key": {
        "type": "TEXT",
        "model_answer": "...",
        "rubric_points": ["...", "..."]
      }
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
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "answer_key": {
            "type": "OPTION",
            "correct_option_index": 2
          }
        }
      ]
    },
    {
      "question_number": 4,
      "type": "ASSERTION_REASON",
      "question": "<Assertion statement>",
      "reason": "<Reason statement>",
      "options": [
        "A. Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).",
        "B. Both Assertion (A) and Reason (R) are true, but Reason (R) is not the correct explanation of Assertion (A).",
        "C. Assertion (A) is true, but Reason (R) is false.",
        "D. Assertion (A) is false, but Reason (R) is true."
      ],
      "answer_key": {
        "type": "OPTION",
        "correct_option_index": 0
      }
    }
  ]
}`;

    let contents: any = prompt;
    let parsed: any = null;
    let validationErrors: string[] = [];

    try {
      let response = await this.generateContentWithFallback(contents, {
        responseMimeType: "application/json",
      });

      let text = response.text;
      if (!text) {
        throw new Error("No response text returned from Gemini");
      }

      parsed = this.parseGeminiJson(text);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid output format: questions field must be an array");
      }

      // Assign deterministic IDs before validating
      parsed.questions.forEach((q: any, index: number) => {
        q.question_id = `q_${index + 1}`;
        if (q.sub_questions && Array.isArray(q.sub_questions)) {
          q.sub_questions.forEach((sub: any, subIndex: number) => {
            sub.question_id = `q_${index + 1}_${subIndex + 1}`;
          });
        }
      });

      validationErrors = validateGeneratedQuestions(parsed.questions);

      if (validationErrors.length > 0) {
        console.warn(`[GeminiService] Homework generation failed validation on attempt 1. Errors:`, validationErrors);
        // Corrective retry turn
        contents = [
          { role: "user", parts: [{ text: prompt }] },
          { role: "model", parts: [{ text: text }] },
          { role: "user", parts: [{ text: `Your previous JSON output failed validation with the following error(s):\n${validationErrors.map(e => `- ${e}`).join("\n")}\n\nPlease fix all of these errors, ensure the JSON strictly complies with the instructions, and output the corrected JSON.` }] }
        ];

        console.log(`[GeminiService] Retrying generation with corrective feedback...`);
        response = await this.generateContentWithFallback(contents, {
          responseMimeType: "application/json",
        });

        text = response.text;
        if (!text) {
          throw new Error("No response text returned from Gemini on retry");
        }

        parsed = this.parseGeminiJson(text);

        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          throw new Error("Invalid output format on retry: questions field must be an array");
        }

        // Re-assign deterministic IDs
        parsed.questions.forEach((q: any, index: number) => {
          q.question_id = `q_${index + 1}`;
          if (q.sub_questions && Array.isArray(q.sub_questions)) {
            q.sub_questions.forEach((sub: any, subIndex: number) => {
              sub.question_id = `q_${index + 1}_${subIndex + 1}`;
            });
          }
        });

        validationErrors = validateGeneratedQuestions(parsed.questions);

        if (validationErrors.length > 0) {
          throw new Error(`Homework validation failed after retry. Errors:\n${validationErrors.join("\n")}`);
        }
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
          const parsedError = JSON.parse(error.message);
          if (parsedError?.error?.message) {
            userFriendlyMessage = parsedError.error.message;
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
      const qNum = num++;
      questions.push({
        question_id: `q_${qNum}`,
        question_number: qNum,
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
        answer_key: {
          type: "OPTION",
          correct_option_index: 0,
        },
      });
    }

    for (let i = 0; i < very_short; i++) {
      const qNum = num++;
      questions.push({
        question_id: `q_${qNum}`,
        question_number: qNum,
        type: "VERY_SHORT",
        question: `Very Short Answer Question ${i + 1} on ${
          req.title || req.topic_description || "the topic"
        }: Briefly define the main term.`,
        options: null,
        answer_key: {
          type: "TEXT",
          model_answer: "This is a mock model answer for very short question.",
          rubric_points: ["Correct definition of main term", "Concise writing"],
        },
      });
    }

    for (let i = 0; i < short; i++) {
      const qNum = num++;
      questions.push({
        question_id: `q_${qNum}`,
        question_number: qNum,
        type: "SHORT",
        question: `Short Answer Question ${i + 1} on ${
          req.title || req.topic_description || "the topic"
        }: Explain the relationship or solve the given problem.`,
        options: null,
        answer_key: {
          type: "TEXT",
          model_answer: "This is a mock short answer.",
          rubric_points: ["Correct explanation of relationship", "Proper equation setup"],
        },
      });
    }

    for (let i = 0; i < long; i++) {
      const qNum = num++;
      questions.push({
        question_id: `q_${qNum}`,
        question_number: qNum,
        type: "LONG",
        question: `Long Answer Question ${i + 1} on ${
          req.title || req.topic_description || "the topic"
        }: Elaborate on the core mechanism. Discuss its applications and implications in detail.`,
        options: null,
        answer_key: {
          type: "TEXT",
          model_answer: "This is a mock long answer.",
          rubric_points: [
            "Detailed elaboration of mechanism",
            "At least two distinct applications explained",
            "At least one implication discussed"
          ],
        },
      });
    }

    for (let i = 0; i < case_study; i++) {
      const qNum = num++;
      questions.push({
        question_id: `q_${qNum}`,
        question_number: qNum,
        type: "CASE_STUDY",
        question: `Case Study ${i + 1}: Read the passage below and answer the sub-questions.\n\nPassage: In a classroom experiment regarding ${
          req.title || req.topic_description || "the topic"
        }, students observed the trends and recorded the data as shown.`,
        options: null,
        sub_questions: [
          {
            question_id: `q_${qNum}_1`,
            question_number: `${qNum}.1`,
            type: "MCQ",
            question: "What is the primary factor observed in this experiment?",
            options: [
              "A. Temperature",
              "B. Volume",
              "C. Pressure",
              "D. Concentration"
            ],
            answer_key: {
              type: "OPTION",
              correct_option_index: 0,
            },
          },
          {
            question_id: `q_${qNum}_2`,
            question_number: `${qNum}.2`,
            type: "MCQ",
            question: "Identify the independent variable.",
            options: [
              "A. Time",
              "B. Distance",
              "C. Velocity",
              "D. Force"
            ],
            answer_key: {
              type: "OPTION",
              correct_option_index: 0,
            },
          }
        ]
      });
    }

    for (let i = 0; i < assertion_reason; i++) {
      const qNum = num++;
      questions.push({
        question_id: `q_${qNum}`,
        question_number: qNum,
        type: "ASSERTION_REASON",
        question: "The topic is highly relevant for class study.",
        reason: "It forms the foundation for advanced concepts in the curriculum.",
        options: [
          "A. Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).",
          "B. Both Assertion (A) and Reason (R) are true, but Reason (R) is not the correct explanation of Assertion (A).",
          "C. Assertion (A) is true, but Reason (R) is false.",
          "D. Assertion (A) is false, but Reason (R) is true."
        ],
        answer_key: {
          type: "OPTION",
          correct_option_index: 0,
        },
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

  async reconstructAnswerKeys(
    originalQuestions: any[],
    subject: string,
    grade: string,
    title: string,
    topic: string
  ): Promise<any[]> {
    const questionsForPrompt = originalQuestions.map((q) => {
      const qCopy: any = {
        question_number: q.question_number,
        type: q.type,
        question: q.question,
      };
      if (q.options) qCopy.options = q.options;
      if (q.reason) qCopy.reason = q.reason;
      if (q.sub_questions && Array.isArray(q.sub_questions)) {
        qCopy.sub_questions = q.sub_questions.map((sub: any) => {
          const subCopy: any = {
            question_number: sub.question_number,
            type: sub.type,
            question: sub.question,
          };
          if (sub.options) subCopy.options = sub.options;
          if (sub.reason) subCopy.reason = sub.reason;
          return subCopy;
        });
      }
      return qCopy;
    });

    const prompt = `You are an expert CBSE curriculum evaluator.
Your task is to reconstruct the correct 'answer_key' object for each question and sub-question in the provided homework list. Do not modify the question text, options, or numbering.

Homework Context:
- Subject: ${subject}
- Grade/Class: ${grade}
- Title: ${title}
- Topic Description: ${topic}

Questions to evaluate:
${JSON.stringify(questionsForPrompt, null, 2)}

Rules for the 'answer_key' object:
1. For MCQ and ASSERTION_REASON (and any sub-questions of these types):
   - Output: { "type": "OPTION", "correct_option_index": <0, 1, 2, or 3, representing A, B, C, or D> }
   - The correct option index MUST represent the correct answer to the question.
2. For ASSERTION_REASON:
   - Carefully read the Assertion and Reason statement. Assess if Assertion is true/false, Reason is true/false, and if Reason is the correct explanation. Choose the index representing the standard CBSE options (0=A, 1=B, 2=C, 3=D).
3. For VERY_SHORT, SHORT, and LONG questions:
   - Choose if the question is mathematical/numerical or conceptual/written explanation:
     - If mathematical/numerical:
       { "type": "NUMERIC", "numeric_value": <finite number>, "numeric_unit": "<string or null>", "numeric_tolerance_percent": 2 }
     - If conceptual/written explanation:
       { "type": "TEXT", "model_answer": "<concise correct answer>", "rubric_points": ["<key point 1>", "<key point 2>", ...] } (list 2 to 4 key points that must be covered)
4. For CASE_STUDY: The parent question has no 'answer_key' (omit or set to null). Each sub-question in the 'sub_questions' array MUST have its own 'answer_key' based on its type.

Respond with ONLY a JSON object containing a "questions" array, which contains the exact questions provided but with the "answer_key" field added/populated for each question and sub-question. Do not change any other fields.

JSON Structure:
{
  "questions": [
    ...
  ]
}`;

    const mergeKeys = (reconQuestions: any[]) => {
      const merged = JSON.parse(JSON.stringify(originalQuestions));
      merged.forEach((origQ: any, idx: number) => {
        const reconQ = reconQuestions[idx];
        if (!reconQ) return;
        if (origQ.type !== 'CASE_STUDY' && origQ.type !== 'Case Study') {
          if (reconQ.answer_key) {
            origQ.answer_key = reconQ.answer_key;
          }
        } else {
          if (origQ.sub_questions && Array.isArray(origQ.sub_questions) && reconQ.sub_questions && Array.isArray(reconQ.sub_questions)) {
            origQ.sub_questions.forEach((origSub: any, subIdx: number) => {
              const reconSub = reconQ.sub_questions[subIdx];
              if (reconSub && reconSub.answer_key) {
                origSub.answer_key = reconSub.answer_key;
              }
            });
          }
        }
      });
      return merged;
    };

    let contents: any = prompt;
    let attempts = 0;
    const maxAttempts = 3; // 1 initial + 2 retries

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[GeminiService] Reconstructing answer keys: attempt ${attempts}/${maxAttempts}`);
        const response = await this.generateContentWithFallback(contents, {
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

        const merged = mergeKeys(parsed.questions);
        const validationErrors = validateGeneratedQuestions(merged);

        if (validationErrors.length === 0) {
          console.log(`[GeminiService] Answer key reconstruction succeeded validation on attempt ${attempts}`);
          return merged;
        }

        console.warn(`[GeminiService] Reconstructed answer keys failed validation on attempt ${attempts}. Errors:`, validationErrors);
        if (attempts < maxAttempts) {
          contents = [
            { role: "user", parts: [{ text: prompt }] },
            { role: "model", parts: [{ text: text }] },
            { role: "user", parts: [{ text: `Your previous JSON output failed validation with the following error(s):\n${validationErrors.map(e => `- ${e}`).join("\n")}\n\nPlease fix all of these errors, ensure the JSON strictly complies with the instructions, and output the corrected JSON.` }] }
          ];
        } else {
          throw new Error(`Answer key validation failed after ${maxAttempts} attempts. Errors:\n${validationErrors.join("\n")}`);
        }
      } catch (error: any) {
        console.error(`[GeminiService] Attempt ${attempts} failed:`, error.message || error);
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error("Reconstruction failed to complete");
  }
}

export const geminiService = new GeminiService();

export function validateGeneratedQuestions(questions: any[]): string[] {
  const problems: string[] = [];

  if (!Array.isArray(questions)) {
    return ["Questions is not an array"];
  }

  function validateSingle(q: any, index: number, parentIndex?: number): void {
    const pathStr = parentIndex !== undefined ? `Question ${parentIndex + 1}.${index + 1}` : `Question ${index + 1}`;

    if (!q || typeof q !== 'object') {
      problems.push(`${pathStr} is not a valid object`);
      return;
    }

    if (typeof q.question !== 'string' || q.question.trim() === '') {
      problems.push(`${pathStr} has an empty or missing question field`);
    }

    const type = q.type;
    if (!type) {
      problems.push(`${pathStr} is missing a type`);
      return;
    }

    const key = q.answer_key;

    if (type === 'MCQ' || type === 'ASSERTION_REASON') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        problems.push(`${pathStr} (${type}) must have exactly 4 options`);
      } else {
        q.options.forEach((opt: any, optIdx: number) => {
          if (typeof opt !== 'string' || opt.trim() === '') {
            problems.push(`${pathStr} (${type}) option ${optIdx + 1} is empty or not a string`);
          }
        });
      }

      if (!key) {
        problems.push(`${pathStr} (${type}) is missing an answer_key`);
      } else if (key.type !== 'OPTION') {
        problems.push(`${pathStr} (${type}) answer_key must have type "OPTION"`);
      } else if (typeof key.correct_option_index !== 'number' || key.correct_option_index < 0 || key.correct_option_index > 3) {
        problems.push(`${pathStr} (${type}) correct_option_index must be an integer between 0 and 3`);
      }
    }

    if (type === 'ASSERTION_REASON') {
      if (typeof q.reason !== 'string' || q.reason.trim() === '') {
        problems.push(`${pathStr} (ASSERTION_REASON) is missing a reason statement`);
      }
      if (Array.isArray(q.options) && q.options.length === 4) {
        const expectedPrefixes = ["A.", "B.", "C.", "D."];
        expectedPrefixes.forEach((prefix, optIdx) => {
          const opt = q.options[optIdx];
          if (typeof opt === 'string') {
            if (!opt.trim().startsWith(prefix)) {
              problems.push(`${pathStr} (ASSERTION_REASON) option ${optIdx + 1} must start with "${prefix}"`);
            }
            if (opt.trim().length <= 10) {
              problems.push(`${pathStr} (ASSERTION_REASON) option ${optIdx + 1} must be longer than 10 characters`);
            }
          }
        });
      }
    }

    if (type === 'CASE_STUDY') {
      if (!Array.isArray(q.sub_questions) || q.sub_questions.length === 0) {
        problems.push(`${pathStr} (CASE_STUDY) must have a non-empty sub_questions array`);
      } else {
        q.sub_questions.forEach((sub: any, subIdx: number) => {
          validateSingle(sub, subIdx, index);
        });
      }
    }

    if (type === 'VERY_SHORT' || type === 'SHORT' || type === 'LONG') {
      if (!key) {
        problems.push(`${pathStr} (${type}) is missing an answer_key`);
      } else if (key.type !== 'NUMERIC' && key.type !== 'TEXT') {
        problems.push(`${pathStr} (${type}) answer_key must have type "NUMERIC" or "TEXT"`);
      } else if (key.type === 'NUMERIC') {
        if (typeof key.numeric_value !== 'number' || !isFinite(key.numeric_value)) {
          problems.push(`${pathStr} (${type}) answer_key of type NUMERIC is missing a valid numeric_value`);
        }
      } else if (key.type === 'TEXT') {
        if (typeof key.model_answer !== 'string' || key.model_answer.trim() === '') {
          problems.push(`${pathStr} (${type}) answer_key of type TEXT has empty or missing model_answer`);
        }
        if (!Array.isArray(key.rubric_points) || key.rubric_points.length === 0) {
          problems.push(`${pathStr} (${type}) answer_key of type TEXT must have at least 1 rubric_point`);
        } else {
          key.rubric_points.forEach((rp: any, rpIdx: number) => {
            if (typeof rp !== 'string' || rp.trim() === '') {
              problems.push(`${pathStr} (${type}) rubric_point ${rpIdx + 1} is empty or not a string`);
            }
          });
        }
      }
    }
  }

  questions.forEach((q, idx) => {
    validateSingle(q, idx);
  });

  return problems;
}

// NOTE: This utility exists to strip AI-generated answer keys from questions as insurance for the pre-pilot RLS gap (where students could directly select homework.generated_content). Wire this into any future student-facing endpoint that touches generated_content.
export function stripAnswerKey(questions: any[]): any[] {
  if (!Array.isArray(questions)) return [];

  const clone = JSON.parse(JSON.stringify(questions));

  function clean(item: any): void {
    if (!item || typeof item !== 'object') return;
    delete item.answer_key;
    if (Array.isArray(item.sub_questions)) {
      item.sub_questions.forEach((sub: any) => clean(sub));
    }
  }

  clone.forEach((q: any) => clean(q));
  return clone;
}
