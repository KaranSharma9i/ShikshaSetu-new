import { validateGeneratedQuestions, stripAnswerKey } from "../services/gemini";

// Helper assertions
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error("❌ Assertion failed:", msg);
    process.exit(1);
  }
}

function assertEquals(a: any, b: any, msg: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    console.error(`❌ Assertion failed: ${msg}\nExpected: ${JSON.stringify(b)}\nActual: ${JSON.stringify(a)}`);
    process.exit(1);
  }
}

console.log("Starting unit tests...");

// Test Case 1: Valid MCQ
const validMCQ = {
  question_id: "q_1",
  question_number: 1,
  type: "MCQ",
  question: "What is the capital of France?",
  options: ["A. Paris", "B. London", "C. Berlin", "D. Madrid"],
  answer_key: {
    type: "OPTION",
    correct_option_index: 0
  }
};
assertEquals(validateGeneratedQuestions([validMCQ]), [], "Valid MCQ should have 0 problems");

// Test Case 2: Invalid MCQ (missing answer key)
const invalidMCQ = {
  question_id: "q_1",
  question_number: 1,
  type: "MCQ",
  question: "What is the capital of France?",
  options: ["A. Paris", "B. London", "C. Berlin", "D. Madrid"]
};
const errsMCQ = validateGeneratedQuestions([invalidMCQ]);
assert(errsMCQ.length > 0, "Invalid MCQ (missing key) should fail validation");
assert(errsMCQ[0].includes("is missing an answer_key"), "MCQ missing key error message check");

// Test Case 3: Valid ASSERTION_REASON
const validAR = {
  question_id: "q_2",
  question_number: 2,
  type: "ASSERTION_REASON",
  question: "Assertion statement here",
  reason: "Reason statement here",
  options: [
    "A. Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).",
    "B. Both Assertion (A) and Reason (R) are true, but Reason (R) is not the correct explanation of Assertion (A).",
    "C. Assertion (A) is true, but Reason (R) is false.",
    "D. Assertion (A) is false, but Reason (R) is true."
  ],
  answer_key: {
    type: "OPTION",
    correct_option_index: 1
  }
};
assertEquals(validateGeneratedQuestions([validAR]), [], "Valid Assertion-Reason should have 0 problems");

// Test Case 4: Invalid ASSERTION_REASON (short options)
const invalidAR = {
  question_id: "q_2",
  question_number: 2,
  type: "ASSERTION_REASON",
  question: "Assertion statement here",
  reason: "Reason statement here",
  options: ["A. Paris", "B. London", "C. Berlin", "D. Madrid"],
  answer_key: {
    type: "OPTION",
    correct_option_index: 1
  }
};
const errsAR = validateGeneratedQuestions([invalidAR]);
assert(errsAR.length > 0, "Invalid AR options should fail validation");
assert(errsAR[0].includes("must start with") || errsAR[0].includes("must be longer than 10 characters"), "AR invalid option length/format check");

// Test Case 5: Valid TEXT Short Answer
const validTextShort = {
  question_id: "q_3",
  question_number: 3,
  type: "SHORT",
  question: "Explain gravity.",
  options: null,
  answer_key: {
    type: "TEXT",
    model_answer: "Gravity is a force...",
    rubric_points: ["Mentions force", "Mentions mass attraction"]
  }
};
assertEquals(validateGeneratedQuestions([validTextShort]), [], "Valid TEXT Short should have 0 problems");

// Test Case 6: Valid NUMERIC VERY_SHORT
const validNumericShort = {
  question_id: "q_4",
  question_number: 4,
  type: "VERY_SHORT",
  question: "What is 2 + 2?",
  options: null,
  answer_key: {
    type: "NUMERIC",
    numeric_value: 4,
    numeric_unit: null,
    numeric_tolerance_percent: 2
  }
};
assertEquals(validateGeneratedQuestions([validNumericShort]), [], "Valid NUMERIC Short should have 0 problems");

// Test Case 7: Valid CASE_STUDY with sub-questions
const validCaseStudy = {
  question_id: "q_5",
  question_number: 5,
  type: "CASE_STUDY",
  question: "Passage text here",
  options: null,
  sub_questions: [
    {
      question_id: "q_5_1",
      question_number: "5.1",
      type: "MCQ",
      question: "Sub question 1",
      options: ["A. Yes", "B. No", "C. Maybe", "D. Never"],
      answer_key: {
        type: "OPTION",
        correct_option_index: 0
      }
    }
  ]
};
assertEquals(validateGeneratedQuestions([validCaseStudy]), [], "Valid Case Study should have 0 problems");

// Test Case 8: stripAnswerKey test
const questionsToStrip = [
  validMCQ,
  validAR,
  validTextShort,
  validCaseStudy
];
const stripped = stripAnswerKey(questionsToStrip);

// Check that answer_keys are deleted
assert(!stripped[0].answer_key, "First question should have no answer_key");
assert(!stripped[1].answer_key, "Second question should have no answer_key");
assert(!stripped[2].answer_key, "Third question should have no answer_key");
assert(!stripped[3].answer_key, "Fourth question should have no answer_key");
assert(!stripped[3].sub_questions[0].answer_key, "Case study sub question should have no answer_key");

// Check that other fields are intact
assertEquals(stripped[0].question, validMCQ.question, "MCQ question field should remain intact");
assertEquals(stripped[3].sub_questions[0].question, validCaseStudy.sub_questions[0].question, "Sub-question text should remain intact");

console.log("✅ All tests passed successfully!");
