const { Client } = require('pg');
require('dotenv').config();

async function inspectAttendanceStudents() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT DISTINCT
        e.academic_year_id as enrollment_ay_id,
        ay_e.label as enrollment_ay_label,
        sa.academic_year_id as attendance_ay_id,
        ay_sa.label as attendance_ay_label,
        c.name as class_name,
        sec.name as section_name,
        COUNT(sa.id) as count
      FROM student_attendance sa
      JOIN students s ON sa.student_id = s.id
      JOIN enrollments e ON s.id = e.student_id
      JOIN sections sec ON e.section_id = sec.id
      JOIN classes c ON sec.class_id = c.id
      JOIN academic_years ay_e ON e.academic_year_id = ay_e.id
      JOIN academic_years ay_sa ON sa.academic_year_id = ay_sa.id
      GROUP BY e.academic_year_id, ay_e.label, sa.academic_year_id, ay_sa.label, c.name, sec.name
      ORDER BY enrollment_ay_label, class_name, section_name
    `);
    console.log("=== Distinct Student Attendance in DB ===");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (error) {
    console.error("Failed to inspect:", error);
  } finally {
    await client.end();
  }
}

inspectAttendanceStudents();
