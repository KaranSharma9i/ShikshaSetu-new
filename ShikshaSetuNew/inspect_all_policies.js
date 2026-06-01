const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, qual 
      FROM pg_policies 
      WHERE qual LIKE '%teachers.id%' OR qual LIKE '%class_subjects.teacher_id%'
    `);
    console.log("Policies with potential teacher ID mismatches:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
