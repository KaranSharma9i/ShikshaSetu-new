const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function inspectBucketsPolicies() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    console.log("=== storage.buckets policies ===");
    const res = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'storage' AND tablename = 'buckets'
    `);
    console.table(res.rows);
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await client.end();
  }
}

inspectBucketsPolicies();
