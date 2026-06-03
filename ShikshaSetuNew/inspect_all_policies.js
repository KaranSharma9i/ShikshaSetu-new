const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log("Checking Row Level Security (RLS) status on tables:");
    const rlsStatusRes = await client.query(`
      SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r' 
        AND c.relname IN ('fees', 'exams', 'ai_scores', 'homework', 'student_attendance', 'student_payments', 'student_profile', 'users', 'teachers')
      ORDER BY tablename;
    `);
    console.table(rlsStatusRes.rows);

    console.log("\nListing policies:");
    const res = await client.query(`
      SELECT tablename, policyname, roles, cmd, qual
      FROM pg_policies 
      WHERE tablename IN ('fees', 'exams', 'ai_scores', 'homework', 'student_attendance', 'student_payments', 'student_profile', 'users', 'teachers')
      ORDER BY tablename, policyname;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
