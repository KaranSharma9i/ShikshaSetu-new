const { Client } = require('pg');
require('dotenv').config();

async function inspectAY() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const ayRes = await client.query(`
      SELECT id, label, starts_on, ends_on, is_current
      FROM academic_years
    `);
    console.log("=== Academic Years ===");
    console.log(JSON.stringify(ayRes.rows, null, 2));
  } catch (error) {
    console.error("Failed to inspect AY:", error);
  } finally {
    await client.end();
  }
}

inspectAY();
