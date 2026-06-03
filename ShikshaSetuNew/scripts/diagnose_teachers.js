const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log('--- Teachers table sample ---');
    const teachersRes = await client.query('SELECT id, user_id, employee_code, institution_id FROM teachers LIMIT 5');
    console.log(teachersRes.rows);

    console.log('\n--- Class Subjects table sample ---');
    const csRes = await client.query('SELECT id, teacher_id, subject_id, section_id FROM class_subjects LIMIT 5');
    console.log(csRes.rows);

    console.log('\n--- Users table sample ---');
    const usersRes = await client.query('SELECT id, role, email FROM users LIMIT 5');
    console.log(usersRes.rows);

    console.log('\n--- Check if teacher user_ids exist in users table ---');
    const matchRes = await client.query('SELECT t.id, t.user_id, u.id as user_match_id FROM teachers t LEFT JOIN users u ON u.id = t.user_id LIMIT 5');
    console.log(matchRes.rows);

  } finally {
    await client.end();
  }
}

main().catch(console.error);
