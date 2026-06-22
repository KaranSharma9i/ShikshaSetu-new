import "../config";
import { supabase } from "../config";
import { assignDisplayNumbers } from "../utils/questionAssembler";
import { SECTION_ORDER } from "../types/generation";

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("id, title, generated_content")
    .ilike("title", "%Hereditary%")
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const content = typeof data.generated_content === "string"
    ? JSON.parse(data.generated_content)
    : data.generated_content;

  console.log("SECTION_ORDER defined as:", SECTION_ORDER);

  console.log("\nBefore sorting & numbering:");
  content.questions.forEach((q: any) => {
    console.log(`- Q#${q.question_number} | Type: ${q.type} | Index in SECTION_ORDER: ${SECTION_ORDER.indexOf(q.type)}`);
  });

  const renumbered = assignDisplayNumbers(content.questions);

  console.log("\nAfter sorting & numbering:");
  renumbered.forEach((q: any) => {
    console.log(`- Q#${q.question_number} | Type: ${q.type}`);
  });
}

run();
