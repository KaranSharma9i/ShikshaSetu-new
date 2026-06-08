const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const tables = [
      'student_wallets',
      'ai_daily_quotas',
      'ai_scores',
      'homework',
      'homework_submissions'
    ];
    console.log('Extra Tables Verification:');
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      console.log(`${table.padEnd(25)} | ${res.rows[0].cnt}`);
    }
    
    // Check wallet distribution
    const walletRes = await client.query(`
      SELECT plan_tier, count(*), sum(balance_paisa) as total_paisa
      FROM students s
      JOIN student_wallets w ON s.id = w.student_id
      GROUP BY plan_tier
    `);
    console.log('\nWallet Distribution by Tier:');
    console.log(walletRes.rows);
    
    // Check homework and submissions details
    const hwRes = await client.query(`
      SELECT h.title, count(s.id) as submissions, count(case when s.status = 'scored' then 1 end) as scored
      FROM homework h
      LEFT JOIN homework_submissions s ON h.id = s.homework_id
      GROUP BY h.id, h.title
    `);
    console.log('\nHomework Submissions Details:');
    console.log(hwRes.rows);

  } finally {
    await client.end();
  }
}

main().catch(console.error);
