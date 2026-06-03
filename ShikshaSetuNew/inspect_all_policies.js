const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, qual, cmd
      FROM pg_policies 
      WHERE tablename IN ('users', 'teachers', 'homework')
    `);
    console.log("Policies:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
