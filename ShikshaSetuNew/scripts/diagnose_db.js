const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Find a student who has an active enrollment and fee payments
    console.log('--- Finding student with active enrollment and fee payments ---');
    const studentQuery = `
      SELECT e.student_id, e.section_id, s.institution_id, count(p.id) as payment_count
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      LEFT JOIN fee_payments p ON p.student_id = s.id
      WHERE e.is_active = true
      GROUP BY e.student_id, e.section_id, s.institution_id
      ORDER BY payment_count DESC
      LIMIT 5
    `;
    const studentRes = await client.query(studentQuery);
    console.log(studentRes.rows);

    // 2. Find a teacher who is linked to a user and has class_subjects
    console.log('\n--- Finding teacher with user and class_subjects ---');
    const teacherQuery = `
      SELECT t.id as teacher_id, t.user_id, u.full_name, count(cs.id) as subject_count
      FROM teachers t
      JOIN users u ON u.id = t.user_id
      JOIN class_subjects cs ON cs.teacher_id = t.id
      GROUP BY t.id, t.user_id, u.full_name
      ORDER BY subject_count DESC
      LIMIT 5
    `;
    const teacherRes = await client.query(teacherQuery);
    console.log(teacherRes.rows);

  } finally {
    await client.end();
  }
}

main().catch(console.error);
