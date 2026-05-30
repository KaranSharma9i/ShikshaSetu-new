require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const query = `
    SELECT hs.feedback, hs.ai_score, hs.status
    FROM homework_submissions hs
    JOIN students s ON s.id = hs.student_id
    JOIN users u ON u.id = s.user_id
    WHERE LOWER(u.email) = 'yashbhushan@shubla.com'
    AND hs.status = 'scored'
    LIMIT 1
  `;
  
  const res = await client.query(query);
  
  if (res.rows.length === 0) {
    console.log("No scored homework submission found for user yashbhushan@shubla.com.");
  } else {
    const row = res.rows[0];
    console.log("STATUS:", row.status);
    console.log("AI SCORE:", row.ai_score);
    console.log("FEEDBACK JSON:");
    console.log(JSON.stringify(row.feedback, null, 2));
  }

  await client.end();
}
main().catch(console.error);
