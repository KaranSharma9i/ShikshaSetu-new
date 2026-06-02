import dotenv from "dotenv";
import path from "path";
import ws from "ws";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Provide WebSocket globally for Supabase realtime client compatibility in Node.js < 22
(global as any).WebSocket = ws;
