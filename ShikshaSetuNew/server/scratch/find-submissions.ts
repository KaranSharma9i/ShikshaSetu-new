import "../config";
import { supabase } from "../config";

async function run() {
  const { data, error } = await supabase
    .from("homework_submissions")
    .select("*")
    .eq("homework_id", "bf9f5535-345c-4461-b91a-8d75bc8b0cbd");

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${data?.length || 0} submissions:`);
  console.log(JSON.stringify(data, null, 2));
}

run();
