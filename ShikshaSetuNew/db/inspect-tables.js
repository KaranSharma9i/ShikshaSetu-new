const { Client } = require('pg');
require('dotenv').config();

async function inspectTables() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("=== DB Tables ===");
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name
    `);
    console.log(res.rows.map(r => r.table_name));
  } catch (error) {
    console.error("Failed to fetch tables:", error);
  } finally {
    await client.end();
  }
}

inspectTables();
