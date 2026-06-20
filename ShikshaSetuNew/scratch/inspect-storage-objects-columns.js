const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function inspectColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'objects'
      ORDER BY ordinal_position
    `);
    console.log("=== storage.objects columns ===");
    console.table(res.rows);

    const res2 = await client.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'storage.objects'::regclass
    `);
    console.log("=== storage.objects constraints ===");
    console.table(res2.rows);
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await client.end();
  }
}

inspectColumns();
