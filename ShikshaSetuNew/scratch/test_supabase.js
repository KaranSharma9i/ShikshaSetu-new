const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function main() {
  const { data: inst, error } = await supabase
    .from('institutions')
    .select('id, name, theme');
  
  console.log("Gurukul Shikshalaya Theme:", JSON.stringify(inst[0].theme, null, 2));
}

main().catch(console.error);
