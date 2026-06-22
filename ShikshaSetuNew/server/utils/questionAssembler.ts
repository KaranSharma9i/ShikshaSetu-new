import { GeneratedQuestion, SECTION_ORDER, QuestionType } from "../types/generation";

export function normalizeType(typeStr: string): QuestionType {
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

/**
 * Sorts questions by their canonical SECTION_ORDER and assigns sequential display numbers.
 * Case Study sub-questions are assigned decimal sub-numbers (e.g. N.1, N.2...).
 * Preserves the original relative order within the same question type.
 */
export function assignDisplayNumbers(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  if (!Array.isArray(questions)) return [];

  // Normalize all questions first to ensure consistent types
  const normalized = questions.map((q) => {
    const qCopy = { ...q, type: normalizeType(q.type) };
    if (q.sub_questions && Array.isArray(q.sub_questions)) {
      qCopy.sub_questions = q.sub_questions.map((sub) => ({
        ...sub,
        type: normalizeType(sub.type),
      }));
    }
    return qCopy;
  });

  // Stable sort by SECTION_ORDER
  const sortedQuestions = [...normalized].sort((a, b) => {
    const aIndex = SECTION_ORDER.indexOf(a.type);
    const bIndex = SECTION_ORDER.indexOf(b.type);

    if (aIndex === -1) {
      console.warn(`[WARNING] Question ID ${a.question_id || 'unknown'} has an unknown type '${a.type}', sorting to the end.`);
    }
    if (bIndex === -1) {
      console.warn(`[WARNING] Question ID ${b.question_id || 'unknown'} has an unknown type '${b.type}', sorting to the end.`);
    }

    const aVal = aIndex === -1 ? SECTION_ORDER.length : aIndex;
    const bVal = bIndex === -1 ? SECTION_ORDER.length : bIndex;

    if (aVal !== bVal) {
      return aVal - bVal;
    }
    // Preserve original relative order
    return normalized.indexOf(a) - normalized.indexOf(b);
  });

  // Assign display numbers
  return sortedQuestions.map((q, idx) => {
    const qNum = idx + 1;
    const updatedQ = {
      ...q,
      question_number: qNum
    };

    if (updatedQ.sub_questions && Array.isArray(updatedQ.sub_questions)) {
      updatedQ.sub_questions = updatedQ.sub_questions.map((sub, subIdx) => ({
        ...sub,
        question_number: `${qNum}.${subIdx + 1}`
      }));
    }

    return updatedQ;
  });
}

