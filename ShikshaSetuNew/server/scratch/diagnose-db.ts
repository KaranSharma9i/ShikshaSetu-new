import "../config";
import { supabase } from "../config";

const CANONICAL_TYPES = new Set([
  'MCQ',
  'VERY_SHORT',
  'SHORT',
  'LONG',
  'CASE_STUDY',
  'SECTION_ORDER',
  'ASSERTION_REASON'
]);

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("id, title, generated_content");

  if (error) {
    console.error("Failed to query homework records:", error);
    return;
  }

  const distinctTypes = new Set<string>();
  let rowsMissingAnswerKeyCount = 0;
  let rowsNonCanonicalTypeCount = 0;

  console.log(`Diagnosing ${data.length} homework records...\n`);

  data.forEach((hw: any) => {
    if (!hw.generated_content) return;

    let content: any;
    try {
      content = typeof hw.generated_content === 'string'
        ? JSON.parse(hw.generated_content)
        : hw.generated_content;
    } catch (e) {
      console.error(`Failed to parse JSON for homework ID: ${hw.id}`);
      return;
    }

    if (!content || !Array.isArray(content.questions)) return;

    let hasMissingAnswerKey = false;
    let hasNonCanonicalType = false;

    // Check questions
    const expectedCanonical = ['MCQ', 'VERY_SHORT', 'SHORT', 'LONG', 'CASE_STUDY', 'ASSERTION_REASON'];
    content.questions.forEach((q: any) => {
      if (q.type) {
        distinctTypes.add(q.type);
        if (!expectedCanonical.includes(q.type)) {
          hasNonCanonicalType = true;
        }
      }

      // Check answer key for main question (excluding case studies themselves, which don't have answer keys)
      if (q.type !== 'CASE_STUDY' && q.type !== 'Case Study') {
        if (!q.answer_key) {
          hasMissingAnswerKey = true;
        }
      }

      // Check sub questions
      if (q.sub_questions && Array.isArray(q.sub_questions)) {
        q.sub_questions.forEach((sub: any) => {
          if (sub.type) {
            distinctTypes.add(sub.type);
            if (!expectedCanonical.includes(sub.type)) {
              hasNonCanonicalType = true;
            }
          }
          if (!sub.answer_key) {
            hasMissingAnswerKey = true;
          }
        });
      }
    });

    if (hasMissingAnswerKey) {
      rowsMissingAnswerKeyCount++;
    }
    if (hasNonCanonicalType) {
      rowsNonCanonicalTypeCount++;
    }
  });

  console.log("=== RESULTS ===");
  console.log("All distinct 'type' values in the database:");
  console.log(Array.from(distinctTypes).map(t => `  - "${t}"`).join("\n"));
  console.log("");
  console.log(`Number of homework rows with at least one question/sub-question missing an answer_key: ${rowsMissingAnswerKeyCount}`);
  console.log(`Number of homework rows with at least one question/sub-question with non-canonical type: ${rowsNonCanonicalTypeCount}`);
}

run();
