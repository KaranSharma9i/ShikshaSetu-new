import { assignDisplayNumbers } from "../utils/questionAssembler";
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

console.log("Starting question renumbering unit tests...");

// Define out-of-order test questions covering all 6 types + 1 unknown type
const testQuestions: GeneratedQuestion[] = [
  {
    question_id: "id_ar1",
    question_number: 1,
    type: "ASSERTION_REASON",
    question: "AR 1",
    options: null
  },
  {
    question_id: "id_mcq1",
    question_number: 2,
    type: "MCQ",
    question: "MCQ 1",
    options: null
  },
  {
    question_id: "id_very_short1",
    question_number: 3,
    type: "VERY_SHORT",
    question: "Very Short 1",
    options: null
  },
  {
    question_id: "id_long1",
    question_number: 4,
    type: "LONG",
    question: "Long 1",
    options: null
  },
  {
    question_id: "id_case1",
    question_number: 5,
    type: "CASE_STUDY",
    question: "Case 1 Passage",
    options: null,
    sub_questions: [
      {
        question_id: "id_case1_sub1",
        question_number: "5.5",
        type: "MCQ",
        question: "Case 1 Sub 1"
      },
      {
        question_id: "id_case1_sub2",
        question_number: "5.9",
        type: "MCQ",
        question: "Case 1 Sub 2"
      }
    ]
  },
  {
    question_id: "id_short1",
    question_number: 6,
    type: "SHORT",
    question: "Short 1",
    options: null
  },
  {
    question_id: "id_unknown1",
    question_number: 7,
    type: "UNKNOWN_TYPE" as any,
    question: "Unknown 1",
    options: null
  }
];

const renumbered = assignDisplayNumbers(testQuestions);

// Assert size matches
assertEquals(renumbered.length, 7, "Number of questions must remain 7");

// Expected sequence (sorted by SECTION_ORDER: MCQ -> VERY_SHORT -> SHORT -> LONG -> CASE_STUDY -> ASSERTION_REASON -> UNKNOWN_TYPE):
// 1. MCQ 1 (id_mcq1)
// 2. Very Short 1 (id_very_short1)
// 3. Short 1 (id_short1)
// 4. Long 1 (id_long1)
// 5. Case 1 (id_case1)
// 6. AR 1 (id_ar1)
// 7. Unknown 1 (id_unknown1)

assertEquals(renumbered[0].question_id, "id_mcq1", "Index 0 must be MCQ 1");
assertEquals(renumbered[0].question_number, 1, "MCQ 1 number should be 1");

assertEquals(renumbered[1].question_id, "id_very_short1", "Index 1 must be Very Short 1");
assertEquals(renumbered[1].question_number, 2, "Very Short 1 number should be 2");

assertEquals(renumbered[2].question_id, "id_short1", "Index 2 must be Short 1");
assertEquals(renumbered[2].question_number, 3, "Short 1 number should be 3");

assertEquals(renumbered[3].question_id, "id_long1", "Index 3 must be Long 1");
assertEquals(renumbered[3].question_number, 4, "Long 1 number should be 4");

assertEquals(renumbered[4].question_id, "id_case1", "Index 4 must be Case 1");
assertEquals(renumbered[4].question_number, 5, "Case 1 number should be 5");

// Verify Case Study sub-questions numbering
assert(renumbered[4].sub_questions !== undefined, "Case study must have sub_questions");
assertEquals(renumbered[4].sub_questions![0].question_id, "id_case1_sub1", "Sub-question 1 ID check");
assertEquals(renumbered[4].sub_questions![0].question_number, "5.1", "Sub-question 1 display number must be 5.1");
assertEquals(renumbered[4].sub_questions![1].question_id, "id_case1_sub2", "Sub-question 2 ID check");
assertEquals(renumbered[4].sub_questions![1].question_number, "5.2", "Sub-question 2 display number must be 5.2");

assertEquals(renumbered[5].question_id, "id_ar1", "Index 5 must be AR 1");
assertEquals(renumbered[5].question_number, 6, "AR 1 number should be 6");

assertEquals(renumbered[6].question_id, "id_unknown1", "Index 6 must be Unknown 1");
assertEquals(renumbered[6].question_number, 7, "Unknown 1 number should be 7");

console.log("✅ All renumbering tests passed successfully!");
