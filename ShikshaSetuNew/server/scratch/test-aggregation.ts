import { scoreHomework } from "../services/scoringService";
import { geminiService } from "../services/gemini";
import { GeneratedQuestion } from "../types/generation";

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

const originalGenerateContentWithFallback = geminiService.generateContentWithFallback;

console.log("Starting score aggregation unit tests...");

async function runTests() {
  try {
    // ─── TEST CASE 1: Pure MCQ ───
    // Q1: Correct (A vs index 0 -> A)
    // Q2: Incorrect (C vs index 1 -> B)
    // Q3: Blank/unanswered
    console.log("Running Test Case 1: Pure MCQ...");
    
    const mcqQuestions: GeneratedQuestion[] = [
      {
        question_id: "q_1",
        question_number: 1,
        type: "MCQ",
        question: "Q1",
        options: ["A. Opt 1", "B. Opt 2"],
        answer_key: { type: "OPTION", correct_option_index: 0 }
      },
      {
        question_id: "q_2",
        question_number: 2,
        type: "MCQ",
        question: "Q2",
        options: ["A. Opt 1", "B. Opt 2"],
        answer_key: { type: "OPTION", correct_option_index: 1 }
      },
      {
        question_id: "q_3",
        question_number: 3,
        type: "MCQ",
        question: "Q3",
        options: ["A. Opt 1", "B. Opt 2"],
        answer_key: { type: "OPTION", correct_option_index: 0 }
      }
    ];

    const mockResponse1 = JSON.stringify({
      overall_score: 5.0, // Should be recalculated
      completeness: 5.0,
      concept_clarity: 5.0,
      presentation: 8.0,
      insights: ["Good start.", "Needs focus."],
      evaluations: [
        {
          question_number: "1",
          student_answer_status: "answered",
          extracted_option: "A"
        },
        {
          question_number: "2",
          student_answer_status: "answered",
          extracted_option: "C"
        },
        {
          question_number: "3",
          student_answer_status: "blank",
          extracted_option: null
        }
      ]
    });

    geminiService.generateContentWithFallback = async () => ({ text: mockResponse1 } as any);

    const res1 = await scoreHomework({
      base64Image: "dummy",
      subject: "Math",
      grade: "Grade 1",
      title: "Test MCQ",
      topicDescription: "MCQ evaluation",
      planTier: "PRO",
      questions: mcqQuestions
    });

    // Calculations:
    // Completeness = 10.0 * (2 / 3) = 6.67
    // Concept Clarity:
    // Weights: MCQ = 1.0 each. Total weight = 3.0.
    // Correctness score: Q1 = 1.0, Q2 = 0.0, Q3 = 0.0.
    // Weighted correctness sum = 1.0.
    // Concept Clarity = 10.0 * (1.0 / 3.0) = 3.33
    // Presentation = 8.0
    // Overall Score = 0.7 * 3.33 + 0.2 * 6.67 + 0.1 * 8.0 = 2.331 + 1.334 + 0.8 = 4.47 (approx with rounding to 2 decimals)
    assertEquals(res1.completeness, 6.67, "Completeness TC1");
    assertEquals(res1.concept_clarity, 3.33, "Concept Clarity TC1");
    assertEquals(res1.overall_score, 4.47, "Overall Score TC1");
    assertEquals(res1.presentation, 8.0, "Presentation TC1");

    // Check evaluations array
    assert(!!res1.question_evaluations, "question_evaluations should exist");
    assertEquals(res1.question_evaluations!.length, 3, "TC1 Evaluations length");
    assertEquals(res1.question_evaluations![0].grading, "correct", "Q1 grading");
    assertEquals(res1.question_evaluations![1].grading, "incorrect", "Q2 grading");
    assertEquals(res1.question_evaluations![2].grading, "incorrect", "Q3 grading");
    assertEquals(res1.question_evaluations![2].status, "blank", "Q3 status");


    // ─── TEST CASE 2: Mixed Types ───
    // Q1: MCQ (Correct, weight 1.0, correctness 1.0)
    // Q2: Numeric (Partial, weight 1.5, correctness 0.5)
    // Q3: Text (Correct, weight 2.0, correctness 1.0)
    // Q4: MCQ (Incorrect, weight 1.0, correctness 0.0)
    console.log("Running Test Case 2: Mixed types...");

    const mixedQuestions: GeneratedQuestion[] = [
      {
        question_id: "mq_1",
        question_number: 1,
        type: "MCQ",
        question: "Q1",
        options: ["A", "B"],
        answer_key: { type: "OPTION", correct_option_index: 0 }
      },
      {
        question_id: "mq_2",
        question_number: 2,
        type: "VERY_SHORT",
        question: "Q2",
        options: null,
        answer_key: { type: "NUMERIC", numeric_value: 10, numeric_unit: null, numeric_tolerance_percent: 2 }
      },
      {
        question_id: "mq_3",
        question_number: 3,
        type: "LONG",
        question: "Q3",
        options: null,
        answer_key: { type: "TEXT", model_answer: "ans", rubric_points: ["pt1"] }
      },
      {
        question_id: "mq_4",
        question_number: 4,
        type: "MCQ",
        options: ["A", "B"],
        question: "Q4",
        answer_key: { type: "OPTION", correct_option_index: 0 }
      }
    ];

    const mockResponse2 = JSON.stringify({
      overall_score: 5.0,
      completeness: 5.0,
      concept_clarity: 5.0,
      presentation: 7.5,
      insights: ["Good", "Work harder"],
      evaluations: [
        {
          question_number: "1",
          student_answer_status: "answered",
          extracted_option: "A"
        },
        {
          question_number: "2",
          student_answer_status: "answered",
          grading: "partial",
          description: "Calculation error"
        },
        {
          question_number: "3",
          student_answer_status: "answered",
          grading: "correct",
          description: "Fully correct response"
        },
        {
          question_number: "4",
          student_answer_status: "answered",
          extracted_option: "B"
        }
      ]
    });

    geminiService.generateContentWithFallback = async () => ({ text: mockResponse2 } as any);

    const res2 = await scoreHomework({
      base64Image: "dummy",
      subject: "Science",
      grade: "Grade 5",
      title: "Mixed Test",
      topicDescription: "Mixed evaluation",
      planTier: "PRO",
      questions: mixedQuestions
    });

    // Calculations:
    // Completeness: 4 / 4 attempted -> 10.0
    // Weights: MCQ = 1.0, Numeric = 1.5, Text = 2.0, MCQ = 1.0. Total weight = 5.5
    // Correctness score:
    // Q1 = 1.0 * 1.0 = 1.0
    // Q2 = 0.5 * 1.5 = 0.75
    // Q3 = 1.0 * 2.0 = 2.0
    // Q4 = 0.0 * 1.0 = 0.0
    // Sum weighted correctness = 1.0 + 0.75 + 2.0 + 0.0 = 3.75
    // Concept Clarity = 10.0 * (3.75 / 5.5) = 6.81818... -> 6.82
    // Presentation = 7.5
    // Overall = 0.7 * 6.81818... + 0.2 * 10.0 + 0.1 * 7.5 = 4.7727... + 2.0 + 0.75 = 7.5227... -> 7.52
    assertEquals(res2.completeness, 10.0, "Completeness TC2");
    assertEquals(res2.concept_clarity, 6.82, "Concept Clarity TC2");
    assertEquals(res2.overall_score, 7.52, "Overall Score TC2");
    assertEquals(res2.presentation, 7.5, "Presentation TC2");

    // ─── TEST CASE 3: Weighting regression & Parent CASE_STUDY exclusion ───
    console.log("Running Test Case 3: Weighting and Parent CASE_STUDY exclusion...");
    
    const regressionQuestions: GeneratedQuestion[] = [
      {
        question_id: "reg_1",
        question_number: 1,
        type: "ASSERTION_REASON",
        question: "Assertion 1",
        options: null,
        answer_key: { type: "OPTION", correct_option_index: 0 }
      },
      {
        question_id: "reg_2",
        question_number: 2,
        type: "CASE_STUDY",
        question: "Case Passage 2",
        options: null,
        sub_questions: [
          {
            question_id: "reg_2_1",
            question_number: "2.1",
            type: "MCQ",
            question: "Sub 2.1",
            options: ["A", "B"],
            answer_key: { type: "OPTION", correct_option_index: 1 }
          },
          {
            question_id: "reg_2_2",
            question_number: "2.2",
            type: "MCQ",
            question: "Sub 2.2",
            options: ["A", "B"],
            answer_key: { type: "OPTION", correct_option_index: 0 }
          }
        ]
      },
      {
        question_id: "reg_3",
        question_number: 3,
        type: "CASE_STUDY",
        question: "Case Passage 3 with no sub-questions",
        options: null,
        sub_questions: undefined // Empty/null sub-questions! Should be unconditionally excluded.
      }
    ];

    const mockResponse3 = JSON.stringify({
      overall_score: 10.0,
      completeness: 10.0,
      concept_clarity: 10.0,
      presentation: 10.0,
      insights: ["Excellent", "Perfect"],
      evaluations: [
        {
          question_number: "1",
          student_answer_status: "answered",
          extracted_option: "A"
        },
        {
          question_number: "2.1",
          student_answer_status: "answered",
          extracted_option: "B"
        },
        {
          question_number: "2.2",
          student_answer_status: "answered",
          extracted_option: "A"
        }
      ]
    });

    geminiService.generateContentWithFallback = async () => ({ text: mockResponse3 } as any);

    const res3 = await scoreHomework({
      base64Image: "dummy",
      subject: "Science",
      grade: "Grade 10",
      title: "Regression Test",
      topicDescription: "Regression weighting and case study parent checks",
      planTier: "PRO",
      questions: regressionQuestions
    });

    // Calculations:
    // Total evaluatable questions should be exactly 3 (excluding the parent Case Studies "reg_2" and "reg_3")
    // If all are correct, completeness should be 10.0, concept_clarity should be 10.0 (all weights are 1.0).
    // Let's assert:
    assertEquals(res3.completeness, 10.0, "Completeness TC3 (expected 10.0, got " + res3.completeness + ")");
    assertEquals(res3.concept_clarity, 10.0, "Concept Clarity TC3");
    assertEquals(res3.overall_score, 10.0, "Overall Score TC3");
    assertEquals(res3.question_evaluations?.length, 3, "TC3 question evaluations count should be 3");

    console.log("✅ All score aggregation unit tests passed successfully!");
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  } finally {
    geminiService.generateContentWithFallback = originalGenerateContentWithFallback;
  }
}

runTests();
