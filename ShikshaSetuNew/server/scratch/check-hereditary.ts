import "../config";
import { supabase } from "../config";

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("id, title, generated_content, status, generation_status")
    .ilike("title", "%Hereditary%");

  if (error) {
    console.error("Error fetching homework:", error);
    return;
  }

  console.log("Homework found:", data);
  if (!data || data.length === 0) return;

  const hw = data[0];
  const content = typeof hw.generated_content === "string"
    ? JSON.parse(hw.generated_content)
    : hw.generated_content;

  if (content && content.questions) {
    console.log("\nQuestions in generated_content:");
    content.questions.forEach((q: any) => {
      console.log(`- Q#${q.question_number} | Type: ${q.type} | Question: ${q.question.substring(0, 40)}...`);
    });
  }
}

run();
