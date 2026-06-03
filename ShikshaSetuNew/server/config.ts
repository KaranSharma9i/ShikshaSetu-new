import dotenv from "dotenv";
import path from "path";
import ws from "ws";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Provide WebSocket globally for Supabase realtime client compatibility in Node.js < 22
(global as any).WebSocket = ws;

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
