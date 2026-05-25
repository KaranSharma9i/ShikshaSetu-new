const { Client } = require('pg');
require('dotenv').config();

async function inspectNursery() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Get all enrollments for Nursery / LKG / UKG
    const enrollRes = await client.query(`
      SELECT e.student_id, u.full_name, c.name as class_name, s.name as section_name, e.academic_year_id, ay.label as ay_label
      FROM enrollments e
      JOIN students std ON e.student_id = std.id
      JOIN users u ON std.user_id = u.id
      JOIN sections s ON e.section_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE c.name IN ('Nursery', 'LKG', 'UKG')
    `);
    console.log(`Found ${enrollRes.rows.length} enrollments in Nursery/LKG/UKG.`);

    const studentIds = enrollRes.rows.map(r => r.student_id);

    if (studentIds.length > 0) {
      // 2. Get attendance records for these student IDs
      const attRes = await client.query(`
        SELECT COUNT(id) as count, MIN(date) as min_date, MAX(date) as max_date
        FROM student_attendance
        WHERE student_id = ANY($1)
      `, [studentIds]);
      console.log("Attendance records count for these students:", attRes.rows[0]);
    }

  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}

inspectNursery();
