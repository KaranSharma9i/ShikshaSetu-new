import "../config";
import { supabase } from "../config";

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("id, title, generated_content");

  if (error) {
    console.error(error);
    return;
  }

  for (const hw of data) {
    if (!hw.generated_content) continue;
    const content = typeof hw.generated_content === "string"
      ? JSON.parse(hw.generated_content)
      : hw.generated_content;
    
    if (!content.questions) continue;

    let missing = false;
    for (const q of content.questions) {
      if (q.type !== "CASE_STUDY" && !q.answer_key) {
        missing = true;
      }
      if (q.sub_questions) {
        for (const sub of q.sub_questions) {
          if (!sub.answer_key) missing = true;
        }
      }
    }

    if (missing) {
      console.log(`Homework missing keys: ID = ${hw.id}, Title = ${hw.title}`);
    }
  }
}

run();
