import { scoreHomework } from "../services/scoringService";
import { geminiService } from "../services/gemini";
import { GeneratedQuestion } from "../types/generation";

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

console.log("Starting homework scoring unit tests...");

// Save original generateContentWithFallback
const originalGenerateContentWithFallback = geminiService.generateContentWithFallback;

// Test questions with answer keys
const testQuestions: GeneratedQuestion[] = [
  {
    question_id: "q_1",
    question_number: 1,
    type: "MCQ",
    question: "What is the capital of France?",
    options: ["A. Paris", "B. London", "C. Berlin", "D. Madrid"],
    answer_key: {
      type: "OPTION",
      correct_option_index: 0 // Option A (Paris)
    }
  },
  {
    question_id: "q_2",
    question_number: 2,
    type: "VERY_SHORT",
    question: "What is 2 + 2?",
    options: null,
    answer_key: {
      type: "NUMERIC",
      numeric_value: 4,
      numeric_unit: null,
      numeric_tolerance_percent: 2
    }
  },
  {
    question_id: "q_3",
    question_number: 3,
    type: "SHORT",
    question: "Explain gravity.",
    options: null,
    answer_key: {
      type: "TEXT",
      model_answer: "Gravity is a pulling force...",
      rubric_points: ["Mentions force of attraction", "Mentions mass/planet attraction"]
    }
  },
  {
    question_id: "q_4",
    question_number: 4,
    type: "CASE_STUDY",
    question: "Read the passage about cells...",
    options: null,
    sub_questions: [
      {
        question_id: "q_4_1",
        question_number: "4.1",
        type: "MCQ",
        question: "What is the powerhouse of the cell?",
        options: ["A. Nucleus", "B. Mitochondria", "C. Ribosome", "D. Cell Wall"],
        answer_key: {
          type: "OPTION",
          correct_option_index: 1 // Option B (Mitochondria)
        }
      }
    ]
  }
];

// ─── Scenario 1 ───
// Student gets:
// Q1: Option A (Paris) - Correct
// Q2: 4 - Correct
// Q3: Partially correct (mentions force of attraction only)
// Q4.1: Option C - Incorrect
// Presentation score: 9.0
// Completeness: 9.5
// Concept Clarity: 8.0
// Overall Score: 8.5

const mockResponseText = JSON.stringify({
  overall_score: 8.5,
  completeness: 9.5,
  concept_clarity: 8.0,
  presentation: 9.0,
  insights: ["Good grasp of MCQ.", "Need to explain more on conceptual parts."],
  evaluations: [
    {
      question_number: "1",
      student_answer_status: "answered",
      extracted_option: "A",
      extracted_numeric_value: null,
      extracted_numeric_unit: null,
      rubric_points_met: null,
      grading: null,
      description: null
    },
    {
      question_number: "2",
      student_answer_status: "answered",
      extracted_option: null,
      extracted_numeric_value: 4,
      extracted_numeric_unit: null,
      grading: "correct",
      description: "Correct answer of 4 extracted."
    },
    {
      question_number: "3",
      student_answer_status: "answered",
      extracted_option: null,
      extracted_numeric_value: null,
      extracted_numeric_unit: null,
      rubric_points_met: ["Mentions force of attraction"],
      grading: "partial",
      description: "Partially correct. The student mentioned force but did not mention mass or planet."
    },
    {
      question_number: "4.1",
      student_answer_status: "answered",
      extracted_option: "C",
      extracted_numeric_value: null,
      extracted_numeric_unit: null,
      rubric_points_met: null,
      grading: null,
      description: null
    }
  ]
});

// Mock generateContentWithFallback
let capturedPrompt = "";
geminiService.generateContentWithFallback = async (contents: any, config?: any) => {
  // Capture prompt to verify prompt building
  capturedPrompt = contents[0].parts[0].text;
  return { text: mockResponseText } as any;
};

async function runTests() {
  try {
    const result = await scoreHomework({
      base64Image: "dummy-image-base64",
      subject: "Science",
      grade: "Class 8",
      title: "Cell Structure & Physical Forces",
      topicDescription: "Answer all questions in detail.",
      planTier: "PRO",
      questions: testQuestions
    });

    // 1. Verify Prompt Construction
    console.log("Verifying prompt construction...");
    assert(capturedPrompt.includes("Question 1 (MCQ): What is the capital of France?"), "Should include Q1 text");
    assert(capturedPrompt.includes("Sub-question 4.1 (MCQ): What is the powerhouse of the cell?"), "Should include Case study sub-question 4.1");
    assert(capturedPrompt.includes("Expected Answer Key [TEXT]"), "Should include expected text answer key criteria");
    assert(capturedPrompt.includes("Expected Answer Key [NUMERIC]"), "Should include expected numeric answer key criteria");

    // 2. Verify Overall Score and Insights
    console.log("Verifying aggregate scores...");
    assertEquals(result.overall_score, 7.35, "overall_score must be 7.35");
    assertEquals(result.completeness, 10.0, "completeness must be 10.0");
    assertEquals(result.concept_clarity, 6.36, "concept_clarity must be 6.36");
    assertEquals(result.presentation, 9.0, "presentation must be 9.0");
    assertEquals(result.insights, ["Good grasp of MCQ.", "Need to explain more on conceptual parts."], "insights check");

    // 3. Verify Deterministic Grading for MCQ
    console.log("Verifying deterministic option grading...");
    
    // Q1 was correct (extracted A vs correct 0 -> A), so it should NOT be in wrong_answers or partial_answers
    const wrongQ1 = result.wrong_answers?.find(w => w.question_number === "1");
    assert(!wrongQ1, "Question 1 should be graded correct and not be in wrong_answers");

    // Q4.1 was incorrect (extracted C vs correct 1 -> B), so it MUST be in wrong_answers
    const wrongQ41 = result.wrong_answers?.find(w => w.question_number === "4.1");
    assert(!!wrongQ41, "Question 4.1 must be in wrong_answers");
    assert(wrongQ41!.description.includes("Student selected C but the correct option was B"), "Wrong answer description format check");

    // 4. Verify Text Grading
    console.log("Verifying Text conceptual grading...");
    const partialQ3 = result.partial_answers?.find(p => p.question_number === "3");
    assert(!!partialQ3, "Question 3 must be in partial_answers");
    assertEquals(partialQ3!.description, "Partially correct. The student mentioned force but did not mention mass or planet.", "Partial answer description check");

    console.log("✅ All homework scoring tests passed successfully!");
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    // Restore
    geminiService.generateContentWithFallback = originalGenerateContentWithFallback;
  }
}

runTests();
