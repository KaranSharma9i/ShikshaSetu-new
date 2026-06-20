const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function inspectFoldernameDdl() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT pg_get_functiondef(p.oid) AS def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'storage' AND p.proname = 'foldername'
    `);
    console.log("=== storage.foldername() definition ===");
    console.log(res.rows[0]?.def || "Function not found");
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await client.end();
  }
}

inspectFoldernameDdl();
