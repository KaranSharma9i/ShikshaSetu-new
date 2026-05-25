const { Client } = require('pg');
require('dotenv').config();

async function inspectAttendance() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT 
        e.academic_year_id,
        ay.label as ay_label,
        c.name as class_name,
        s.name as section_name,
        MIN(sa.date) as min_date,
        MAX(sa.date) as max_date,
        COUNT(sa.id) as attendance_count
      FROM student_attendance sa
      JOIN enrollments e ON sa.student_id = e.student_id AND sa.academic_year_id = e.academic_year_id
      JOIN sections s ON e.section_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      GROUP BY e.academic_year_id, ay.label, c.name, s.name
      ORDER BY ay_label, class_name, section_name
    `);
    console.log("=== Attendance Records in DB ===");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (error) {
    console.error("Failed to inspect attendance:", error);
  } finally {
    await client.end();
  }
}

inspectAttendance();
