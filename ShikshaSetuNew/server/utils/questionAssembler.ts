import { GeneratedQuestion, SECTION_ORDER } from "../types/generation";

/**
 * Sorts questions by their canonical SECTION_ORDER and assigns sequential display numbers.
 * Case Study sub-questions are assigned decimal sub-numbers (e.g. N.1, N.2...).
 * Preserves the original relative order within the same question type.
 */
export function assignDisplayNumbers(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  if (!Array.isArray(questions)) return [];

  // Stable sort by SECTION_ORDER
  const sortedQuestions = [...questions].sort((a, b) => {
    const aIndex = SECTION_ORDER.indexOf(a.type as any);
    const bIndex = SECTION_ORDER.indexOf(b.type as any);

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
    return questions.indexOf(a) - questions.indexOf(b);
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
