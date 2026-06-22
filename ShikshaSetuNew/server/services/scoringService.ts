import { geminiService } from "./gemini";
import { QuestionType } from "../types/generation";

export interface ScoringResult {
  overall_score: number;
  completeness: number;
  concept_clarity: number;
  presentation: number;
  insights?: string[];           // Pro only — exactly 2 items
  wrong_answers?: Array<{ question_number: string; description: string }>;
  partial_answers?: Array<{ question_number: string; description: string }>;
  question_evaluations?: Array<{
    question_number: string;
    status: 'answered' | 'blank';
    grading: 'correct' | 'partial' | 'incorrect';
    description: string;
  }>;
}

function normalizeType(typeStr: string): QuestionType {
  if (!typeStr) return "SHORT";
  const trimmed = typeStr.trim();
  const upper = trimmed.toUpperCase();
  const mapping: Record<string, QuestionType> = {
    'VERY SHORT ANSWER': 'VERY_SHORT',
    'SHORT ANSWER': 'SHORT',
    'LONG ANSWER': 'LONG',
    'VERY SHORT': 'VERY_SHORT',
    'ASSERTION REASON': 'ASSERTION_REASON',
    'CASE STUDY': 'CASE_STUDY',
  };
  const mapped = mapping[upper] || upper;
  const validTypes = new Set<QuestionType>([
    'MCQ',
    'VERY_SHORT',
    'SHORT',
    'LONG',
    'CASE_STUDY',
    'ASSERTION_REASON'
  ]);
  if (validTypes.has(mapped as QuestionType)) {
    return mapped as QuestionType;
  }
  console.warn(`[normalizeType] Unrecognized question type: "${typeStr}". Falling back to SHORT.`);
  return "SHORT";
}

export interface ScoringParams {
  base64Image: string;           // raw base64, no data:image prefix
  subject: string;
  grade: string;
  title: string;
  topicDescription: string;
  planTier: 'STANDARD' | 'PRO';
  questions?: any[];
  homeworkId?: string;
}

export async function scoreHomework(params: ScoringParams): Promise<ScoringResult> {
  const normalizedQuestions = params.questions ? JSON.parse(JSON.stringify(params.questions)) : [];
  normalizedQuestions.forEach((q: any) => {
    q.type = normalizeType(q.type);
    if (q.sub_questions && Array.isArray(q.sub_questions)) {
      q.sub_questions.forEach((sub: any) => {
        sub.type = normalizeType(sub.type);
      });
    }
  });

  let prompt = `You are the AI homework evaluator for Margam ERP. Evaluate the student's homework submission from the image provided.

Homework Details:
- Subject: ${params.subject}
- Grade/Class: ${params.grade}
- Assignment Title: ${params.title}
- Topic Description: ${params.topicDescription}

Here are the exact questions that the student had to answer:
`;

  // Helper to format each question and sub-question
  function formatQuestion(q: any, isSub = false): string {
    let text = `${isSub ? '  - Sub-question' : '- Question'} ${q.question_number} (${q.type}): ${q.question}\n`;
    if (q.type === 'ASSERTION_REASON' && q.reason) {
      text += `  Assertion (A): ${q.question}\n  Reason (R): ${q.reason}\n`;
    }
    if (q.options && Array.isArray(q.options) && q.options.length > 0) {
      text += `  Options:\n` + q.options.map((opt: string) => `    - ${opt}`).join('\n') + `\n`;
    }
    if (q.answer_key) {
      const key = q.answer_key;
      if (key.type === 'NUMERIC') {
        text += `  Expected Answer Key [NUMERIC]:\n    Expected Value: ${key.numeric_value}\n    Expected Unit: ${key.numeric_unit || 'none'}\n    Tolerance Percent: ${key.numeric_tolerance_percent || 2}%\n`;
      } else if (key.type === 'TEXT') {
        text += `  Expected Answer Key [TEXT]:\n    Expected Answer: ${key.model_answer}\n    Rubric Points:\n` + key.rubric_points.map((rp: string) => `      - ${rp}`).join('\n') + `\n`;
      }
    }
    return text;
  }

  if (normalizedQuestions && normalizedQuestions.length > 0) {
    normalizedQuestions.forEach((q: any) => {
      if (q.type === 'CASE_STUDY') {
        prompt += `- Question ${q.question_number} (CASE_STUDY): ${q.question}\n`;
        if (q.sub_questions && Array.isArray(q.sub_questions)) {
          q.sub_questions.forEach((sub: any) => {
            prompt += formatQuestion(sub, true);
          });
        }
      } else {
        prompt += formatQuestion(q, false);
      }
    });
  }

  prompt += `
Analyze the handwritten or typed text inside the image. Check for accuracy, completeness, understanding of concepts, and presentation.

Instructions:
1. For MCQ and ASSERTION_REASON (and any sub-questions of these types):
   - You MUST only extract which option letter (A, B, C, D) the student selected/wrote down. Do not judge correctness yourself.
   - If the student did not answer the question or it's blank/illegible, set student_answer_status to "blank" and extracted_option to null.
   - Otherwise, set student_answer_status to "answered" and extracted_option to the selected letter.
2. For NUMERIC questions:
   - Extract the student's final numeric answer and unit.
   - Compare the student's answer against the expected value within the specified tolerance percent.
   - Determine if the answer is "correct", "partial", or "incorrect". (Give partial credit if working is shown and is correct but the final answer is slightly off/wrong).
   - Provide a brief description explaining your grading.
3. For TEXT questions:
   - Compare the student's written response against the expected model_answer and count how many of the specified rubric_points are addressed/met by their answer.
   - Determine if the answer is "correct" (fully addresses rubric), "partial" (addresses some parts), or "incorrect" (blank or completely wrong).
   - List which rubric points were met in rubric_points_met.
   - Provide a brief description explaining your grading.
4. For Case Study sub-questions:
   - Match the student's answers to sub-questions by their position/order near the case study passage in the image, NOT by whatever numbering the student wrote on their own paper (e.g. 'Q.1, Q.2, Q.3'). Always report the absolute question_number from this list (e.g. '8.1', '8.2', '8.3') in your response, regardless of what the student wrote.

Be strict and conservative in scoring for TEXT and presentation. Do NOT give benefit of the doubt.
A score of 8.5+ should only be given for genuinely excellent work.

Provide your evaluation as a JSON object with the following fields:
- overall_score: A numeric score from 0.00 to 10.00.
- completeness: A numeric score from 0.00 to 10.00.
- concept_clarity: A numeric score from 0.00 to 10.00.
- presentation: A numeric score from 0.00 to 10.00.
- insights: An array of EXACTLY 2 strings highlighting specific learning patterns, conceptual strengths, or actionable tips for improvement.
- evaluations: An array of objects representing evaluations for each question/sub-question (e.g. MCQ, ASSERTION_REASON, VERY_SHORT, SHORT, LONG, and sub-questions of CASE_STUDY, but NOT the parent CASE_STUDY passage itself). Each object must have:
    * question_number (string): The question/sub-question number (e.g. "1", "3.1").
    * student_answer_status (string): "answered" or "blank".
    * extracted_option (string | null): The letter option selected (A, B, C, D) or null.
    * extracted_numeric_value (number | null): The extracted numeric value or null.
    * extracted_numeric_unit (string | null): The extracted unit or null.
    * rubric_points_met (string[] | null): Array of rubric points that were met by the student's answer, or null.
    * grading (string | null): "correct", "partial", or "incorrect" (only for NUMERIC and TEXT types, null for others).
    * description (string | null): A short explanation of the student's mistakes, correct points, or why they got the grade (only for NUMERIC and TEXT types, null for others).

Respond with ONLY this JSON structure. Do not wrap the JSON output in markdown blocks (like \`\`\`json).`;
  const response = await geminiService.generateContentWithFallback(
    [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: params.base64Image } }
        ]
      }
    ],
    {
      maxOutputTokens: 8192,
      temperature: 0.1,
      responseMimeType: "application/json",
    }
  );

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
    throw parseError;
  }

  const clamp = (val: any): number => {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(10, num));
  };

  // Build a flat list of expected questions
  const evaluatableQuestions: any[] = [];
  if (params.questions) {
    params.questions.forEach((q: any) => {
      if (q.type === 'CASE_STUDY') {
        if (q.sub_questions && Array.isArray(q.sub_questions)) {
          q.sub_questions.forEach((sub: any) => {
            evaluatableQuestions.push(sub);
          });
        }
      } else {
        evaluatableQuestions.push(q);
      }
    });
  }

  const evaluations = Array.isArray(parsedJson.evaluations) ? parsedJson.evaluations : [];

  if (evaluatableQuestions.length === 0) {
    // Fallback: if questions array is missing or empty, return Gemini's holistic estimates
    const result: ScoringResult = {
      overall_score: clamp(parsedJson.overall_score),
      completeness: clamp(parsedJson.completeness),
      concept_clarity: clamp(parsedJson.concept_clarity),
      presentation: clamp(parsedJson.presentation),
    };
    if (params.planTier === 'PRO') {
      result.insights = Array.isArray(parsedJson.insights) ? parsedJson.insights.slice(0, 2) : [];
      result.wrong_answers = [];
      result.partial_answers = [];
      result.question_evaluations = [];
    }
    return result;
  }

  let totalWeight = 0;
  let weightedCorrectnessSum = 0;
  let attemptedCount = 0;
  const N = evaluatableQuestions.length;

  const wrong_answers: Array<{ question_number: string; description: string }> = [];
  const partial_answers: Array<{ question_number: string; description: string }> = [];
  const question_evaluations: Array<{
    question_number: string;
    status: 'answered' | 'blank';
    grading: 'correct' | 'partial' | 'incorrect';
    description: string;
  }> = [];

  evaluatableQuestions.forEach((qObj) => {
    const qNum = String(qObj.question_number);
    const evalItem = evaluations.find((e: any) => String(e.question_number) === qNum);

    const isBlank = !evalItem || evalItem.student_answer_status === 'blank';
    const status = isBlank ? 'blank' : 'answered';

    // 1. Determine weight based on question type
    let weight = 1.0;
    const type = qObj.type;
    const key = qObj.answer_key;

    if (key) {
      if (key.type === 'OPTION') weight = 1.0;
      else if (key.type === 'NUMERIC') weight = 1.5;
      else if (key.type === 'TEXT') weight = 2.0;
    } else {
      if (type === 'MCQ' || type === 'ASSERTION_REASON') weight = 1.0;
      else if (type === 'VERY_SHORT' || type === 'SHORT') weight = 1.5;
      else if (type === 'LONG') weight = 2.0;
    }

    totalWeight += weight;

    // 2. Completeness calculation helper
    const c_i = isBlank ? 0 : 1;
    attemptedCount += c_i;

    // 3. Correctness grading helper
    let s_i = 0;
    let grading: 'correct' | 'partial' | 'incorrect' = 'incorrect';
    let feedbackDesc = '';

    if (!isBlank && evalItem) {
      if (key && key.type === 'OPTION') {
        const studentOpt = String(evalItem.extracted_option || "").trim().toUpperCase();
        const correctOptLetter = "ABCD"[key.correct_option_index] || "";
        if (studentOpt === correctOptLetter) {
          s_i = 1.0;
          grading = 'correct';
          feedbackDesc = `Correct. Option ${studentOpt} selected.`;
        } else {
          s_i = 0.0;
          grading = 'incorrect';
          feedbackDesc = `Incorrect option selected. Student selected ${studentOpt || "none"} but the correct option was ${correctOptLetter}.`;
          wrong_answers.push({
            question_number: qNum,
            description: feedbackDesc
          });
        }
      } else if (key && (key.type === 'NUMERIC' || key.type === 'TEXT')) {
        const gradingStr = String(evalItem.grading || "").toLowerCase();
        feedbackDesc = String(evalItem.description || "No feedback provided.");
        if (gradingStr === 'correct') {
          s_i = 1.0;
          grading = 'correct';
        } else if (gradingStr === 'partial') {
          s_i = 0.5;
          grading = 'partial';
          partial_answers.push({
            question_number: qNum,
            description: feedbackDesc
          });
        } else {
          s_i = 0.0;
          grading = 'incorrect';
          wrong_answers.push({
            question_number: qNum,
            description: feedbackDesc
          });
        }
      } else {
        console.warn(`[ScoringService] Missing answer_key fallback triggered for homeworkId=${params.homeworkId || "unknown"}, question_number=${qNum}`);
        const gradingStr = String(evalItem.grading || "").toLowerCase();
        feedbackDesc = String(evalItem.description || "No feedback provided.");
        if (gradingStr === 'correct') {
          s_i = 1.0;
          grading = 'correct';
        } else if (gradingStr === 'partial') {
          s_i = 0.5;
          grading = 'partial';
          partial_answers.push({
            question_number: qNum,
            description: feedbackDesc
          });
        } else {
          s_i = 0.0;
          grading = 'incorrect';
          wrong_answers.push({
            question_number: qNum,
            description: feedbackDesc
          });
        }
      }
    } else {
      s_i = 0.0;
      grading = 'incorrect';
      feedbackDesc = "Question was left blank / unanswered.";
      wrong_answers.push({
        question_number: qNum,
        description: feedbackDesc
      });
    }

    weightedCorrectnessSum += s_i * weight;

    question_evaluations.push({
      question_number: qNum,
      status,
      grading,
      description: feedbackDesc
    });
  });

  const completeness = 10.0 * (attemptedCount / N);
  const concept_clarity = totalWeight > 0 ? 10.0 * (weightedCorrectnessSum / totalWeight) : 0;
  const presentation = clamp(parsedJson.presentation);
  const overall_score = (0.7 * concept_clarity) + (0.2 * completeness) + (0.1 * presentation);

  const roundToTwo = (num: number) => Math.round(num * 100) / 100;

  const result: ScoringResult = {
    overall_score: roundToTwo(overall_score),
    completeness: roundToTwo(completeness),
    concept_clarity: roundToTwo(concept_clarity),
    presentation: roundToTwo(presentation),
  };

  if (params.planTier === 'PRO') {
    let insights: string[] = [];
    if (Array.isArray(parsedJson.insights)) {
      insights = parsedJson.insights.slice(0, 2).map((item: any) => String(item));
    }
    while (insights.length < 2) {
      insights.push("Excellent work on the assignment.");
    }
    result.insights = insights;
    result.wrong_answers = wrong_answers;
    result.partial_answers = partial_answers;
    result.question_evaluations = question_evaluations;
  }

  return result;
}
