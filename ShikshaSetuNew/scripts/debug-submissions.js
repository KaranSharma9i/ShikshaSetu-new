require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log("--- SUBMISSIONS BY EMAIL ---");
  const emailRes = await client.query(`
    SELECT u.email, hs.status, COUNT(*) 
    FROM homework_submissions hs
    JOIN students s ON s.id = hs.student_id
    JOIN users u ON u.id = s.user_id
    GROUP BY u.email, hs.status
  `);
  console.table(emailRes.rows);

  console.log("--- ALL SUBMISSIONS ---");
  const allRes = await client.query(`
    SELECT hs.id, hs.status, hs.ai_score, hs.submitted_at
    FROM homework_submissions hs
    LIMIT 10
  `);
  console.table(allRes.rows);

  await client.end();
}
main().catch(console.error);
