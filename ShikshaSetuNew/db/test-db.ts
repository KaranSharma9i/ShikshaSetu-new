import { supabase } from "./index";

async function test() {
  const { data, error } = await supabase.from("institutions").select("*").limit(1);
  if (error) {
    console.error("Connection failed:", error.message);
  } else {
    console.log("Supabase connected. Data:", data);
  }
}

test();