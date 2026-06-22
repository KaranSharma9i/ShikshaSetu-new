import "../config";
import { supabase } from "../config";

async function run() {
  // Dump Sound homework
  const { data: sound, error: e1 } = await supabase
    .from("homework")
    .select("generated_content")
    .eq("id", "bf9f5535-345c-4461-b91a-8d75bc8b0cbd")
    .single();

  if (e1 || !sound) {
    console.error("Error fetching Sound:", e1);
    return;
  }

  const content = sound.generated_content as any;
  console.log("=== SOUND HOMEWORK ===");
  console.log("Total questions:", content?.questions?.length);
  console.log("\nQuestions summary:");
  content?.questions?.forEach((q: any) => {
    const hasKey = !!q.answer_key;
    const keyType = q.answer_key?.type || "NONE";
    console.log(`  Q${q.question_number} | type=${q.type} | answer_key=${hasKey ? keyType : "MISSING"} | options=${q.options?.length || 0}`);
    if (q.sub_questions) {
      q.sub_questions.forEach((s: any) => {
        const sHasKey = !!s.answer_key;
        const sKeyType = s.answer_key?.type || "NONE";
        console.log(`    Q${s.question_number} | type=${s.type} | answer_key=${sHasKey ? sKeyType : "MISSING"} | options=${s.options?.length || 0}`);
      });
    }
  });

  console.log("\n\nFULL JSON:");
  console.log(JSON.stringify(content, null, 2));

  // Dump Effects of Current homework
  console.log("\n\n=== EFFECTS OF CURRENT HOMEWORK ===");
  const { data: eoc, error: e2 } = await supabase
    .from("homework")
    .select("generated_content")
    .eq("id", "be525aa8-da91-4620-9ab7-3381e7ecef36")
    .single();

  if (e2 || !eoc) {
    console.error("Error fetching Effects of Current:", e2);
    return;
  }

  const content2 = eoc.generated_content as any;
  console.log("Total questions:", content2?.questions?.length);
  console.log("\nQuestions summary:");
  content2?.questions?.forEach((q: any) => {
    const hasKey = !!q.answer_key;
    const keyType = q.answer_key?.type || "NONE";
    console.log(`  Q${q.question_number} | type=${q.type} | answer_key=${hasKey ? keyType : "MISSING"} | options=${q.options?.length || 0}`);
    if (q.sub_questions) {
      q.sub_questions.forEach((s: any) => {
        const sHasKey = !!s.answer_key;
        const sKeyType = s.answer_key?.type || "NONE";
        console.log(`    Q${s.question_number} | type=${s.type} | answer_key=${sHasKey ? sKeyType : "MISSING"} | options=${s.options?.length || 0}`);
      });
    }
  });

  console.log("\n\nFULL JSON:");
  console.log(JSON.stringify(content2, null, 2));
}
run();
