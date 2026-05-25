const { Client } = require('pg');
require('dotenv').config();

async function inspectAttendanceAll() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT 
        sa.academic_year_id,
        ay.label as ay_label,
        COUNT(sa.id) as count,
        MIN(sa.date) as min_date,
        MAX(sa.date) as max_date
      FROM student_attendance sa
      LEFT JOIN academic_years ay ON sa.academic_year_id = ay.id
      GROUP BY sa.academic_year_id, ay.label
    `);
    console.log("=== Attendance Count by Academic Year ===");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (error) {
    console.error("Failed to inspect:", error);
  } finally {
    await client.end();
  }
}

inspectAttendanceAll();
