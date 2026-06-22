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

  console.log(JSON.stringify(data.generated_content, null, 2));
}

run();
