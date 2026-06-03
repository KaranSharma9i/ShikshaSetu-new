const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT tablename, policyname, cmd, roles 
      FROM pg_policies 
      WHERE tablename IN ('fee_structures', 'fee_payments', 'exams', 'ai_scores', 'homework', 'homework_submissions')
      ORDER BY tablename, policyname
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
