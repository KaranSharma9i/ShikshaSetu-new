import "../config";
import { supabase } from "../config";

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("generated_content")
    .eq("id", "bf9f5535-345c-4461-b91a-8d75bc8b0cbd")
    .single();

  if (error || !data) {
    console.error("Error fetching Sound:", error);
    return;
  }

  const content = data.generated_content as any;
  console.log(`=== SOUND HOMEWORK QUESTIONS & ANSWER KEYS ===\n`);

  content?.questions?.forEach((q: any) => {
    console.log(`Q${q.question_number} [${q.type}] - ${q.question.substring(0, 80)}...`);
    console.log(`  Answer Key:`, JSON.stringify(q.answer_key, null, 2));

    if (q.sub_questions) {
      q.sub_questions.forEach((sub: any) => {
        console.log(`  - SubQ${sub.question_number} [${sub.type}] - ${sub.question.substring(0, 80)}...`);
        console.log(`    Answer Key:`, JSON.stringify(sub.answer_key, null, 2));
      });
    }
    console.log("");
  });
}

run();
