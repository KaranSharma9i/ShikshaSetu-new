const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function findUnmatched() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    console.log("=== Checking Unmatched Users ===");

    // Find public.users without auth.users
    const res1 = await client.query(`
      SELECT id, email, full_name, role 
      FROM public.users 
      WHERE id NOT IN (SELECT id FROM auth.users)
    `);
    console.log(`Public users without matching auth.users (${res1.rows.length}):`);
    if (res1.rows.length > 0) {
      console.log(res1.rows.slice(0, 10));
    }

    // Find auth.users without public.users
    const res2 = await client.query(`
      SELECT id, email 
      FROM auth.users 
      WHERE id NOT IN (SELECT id FROM public.users)
    `);
    console.log(`\nAuth users without matching public.users (${res2.rows.length}):`);
    if (res2.rows.length > 0) {
      console.log(res2.rows.slice(0, 10));
    }
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await client.end();
  }
}

findUnmatched();
