import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => {
    console.log("PostgreSQL Connected");
  })
  .catch((err: Error) => {
    console.error("Connection error:", err);
  });