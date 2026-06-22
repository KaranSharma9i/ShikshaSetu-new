import "../config";
import { supabase } from "../config";

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("generated_content")
    .eq("id", "bd35d952-05a2-4e11-92f7-db6e9802c009")
    .single();

  if (error || !data) {
    console.error(error);
    return;
  }

  const content = data.generated_content as any;
  console.log("Total questions:", content.questions.length);
  content.questions.forEach((q: any) => {
    console.log(`Q${q.question_number} [${q.type}] - sub_questions = ${!!q.sub_questions}, reason = ${!!q.reason}`);
  });
}

run();
