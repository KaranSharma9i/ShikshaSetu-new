const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const instId = '65ac109d-2e8e-4bd8-8b59-8b557a1bca16';
  try {
    console.log("=== 1. Fetching sections and classes ===");
    const secRes = await client.query(`
      SELECT s.id AS section_id, s.name AS section_name, c.id AS class_id, c.name AS class_name
      FROM sections s
      INNER JOIN classes c ON s.class_id = c.id
      WHERE c.institution_id = $1 AND s.deleted_at IS NULL
    `, [instId]);
    console.log("Sections count:", secRes.rows.length);
    console.log(secRes.rows);

    const sectionIds = secRes.rows.map(r => r.section_id);
    if (sectionIds.length === 0) {
      console.log("No sections found.");
      return;
    }

    console.log("=== 2. Fetching active enrollments ===");
    const enrollRes = await client.query(`
      SELECT student_id, section_id
      FROM enrollments
      WHERE section_id = ANY($1) AND is_active = true AND deleted_at IS NULL
    `, [sectionIds]);
    console.log("Enrollments count:", enrollRes.rows.length);
    console.log(enrollRes.rows);

    console.log("=== 3. Fetching student attendance for 2026-05-25 ===");
    const attRes = await client.query(`
      SELECT student_id, status
      FROM student_attendance
      WHERE date = '2026-05-25' AND deleted_at IS NULL
    `);
    console.log("Attendance records count:", attRes.rows.length);
    console.log(attRes.rows);

    console.log("=== 4. Checking if any student or user lacks full name ===");
    const nullNamesRes = await client.query(`
      SELECT u.id, u.full_name, u.email, u.role
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      WHERE u.institution_id = $1 AND u.full_name IS NULL
    `, [instId]);
    console.log("Users with null full_name:", nullNamesRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
