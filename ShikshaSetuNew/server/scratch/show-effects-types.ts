import "../config";
import { supabase } from "../config";

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("generated_content")
    .eq("id", "be525aa8-da91-4620-9ab7-3381e7ecef36")
    .single();

  if (error || !data) {
    console.error("Error fetching Effects of Current:", error);
    return;
  }

  const content = data.generated_content as any;
  console.log(`=== EFFECTS OF CURRENT HOMEWORK QUESTIONS & TYPES ===\n`);

  content?.questions?.forEach((q: any) => {
    console.log(`Q${q.question_number} [${q.type}] - ${q.question.substring(0, 80)}...`);

    if (q.sub_questions) {
      q.sub_questions.forEach((sub: any) => {
        console.log(`  - SubQ${sub.question_number} [${sub.type}] - ${sub.question.substring(0, 80)}...`);
      });
    }
  });
}

run();
