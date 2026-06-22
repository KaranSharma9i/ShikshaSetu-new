import "../config";
import { supabase } from "../config";

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("id, title, status, generation_status, class_id, section_id, classes(name), sections(name)")
    .ilike("title", "%sound%");

  if (error) {
    console.error("Error searching Sound homework:", error);
    return;
  }

  console.log(`Found ${data?.length || 0} Sound homework assignments:`);
  console.log(JSON.stringify(data, null, 2));
}

run();
