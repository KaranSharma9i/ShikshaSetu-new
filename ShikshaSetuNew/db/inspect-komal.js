const { Client } = require('pg');
require('dotenv').config();

async function inspectKomal() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Find Komal Yadav
    const komalRes = await client.query(`
      SELECT s.id, u.full_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.full_name = 'Komal Yadav'
    `);
    const komal = komalRes.rows[0];
    console.log("Komal Yadav Student ID:", komal.id);

    // Find all enrollments for Komal Yadav
    const enrollRes = await client.query(`
      SELECT e.id as enrollment_id, e.academic_year_id, ay.label as ay_label, sec.name as section_name, c.name as class_name, e.is_active
      FROM enrollments e
      JOIN sections sec ON e.section_id = sec.id
      JOIN classes c ON sec.class_id = c.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE e.student_id = $1
    `, [komal.id]);
    console.log("\n=== Enrollments ===");
    console.table(enrollRes.rows);

    // Count attendance records by academic year
    const attCountRes = await client.query(`
      SELECT sa.academic_year_id, ay.label as ay_label, COUNT(sa.id) as count, MIN(sa.date) as min_date, MAX(sa.date) as max_date
      FROM student_attendance sa
      JOIN academic_years ay ON sa.academic_year_id = ay.id
      WHERE sa.student_id = $1
      GROUP BY sa.academic_year_id, ay.label
    `, [komal.id]);
    console.log("\n=== Attendance counts ===");
    console.table(attCountRes.rows);

  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}

inspectKomal();
