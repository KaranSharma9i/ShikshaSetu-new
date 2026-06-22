import "../config";
import { supabase } from "../config";

async function run() {
  const { data, error } = await supabase
    .from("homework")
    .select("id, title, status, generation_status, created_at, class_id, section_id")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing homework:", error);
    return;
  }

  console.log(`Found ${data?.length || 0} homework assignments:`);
  console.log(JSON.stringify(data, null, 2));
}

run();
