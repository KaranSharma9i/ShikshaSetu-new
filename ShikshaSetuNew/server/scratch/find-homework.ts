import "../config";
import { supabase } from "../config";

async function run() {
  // Find all homework records to locate "Sound" and "Effects of Current"
  const { data, error } = await supabase
    .from("homework")
    .select("id, title, description, status, generation_status")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(`Found ${data.length} homework records:\n`);
  data.forEach((hw: any) => {
    console.log(`ID: ${hw.id}`);
    console.log(`  Title: ${hw.title}`);
    console.log(`  Description: ${hw.description}`);
    console.log(`  Status: ${hw.status} / ${hw.generation_status}`);
    console.log("");
  });
}
run();
