global.WebSocket = class {};
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkSubjects() {
  const { data, error } = await supabase
    .from("subjects")
    .select("*");
  console.log("Subjects table data:", JSON.stringify(data, null, 2));
}

checkSubjects();
