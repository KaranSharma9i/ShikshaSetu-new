const { Client } = require('pg');
require('dotenv').config();

async function inspectAttendanceDates() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT date, COUNT(*)
      FROM student_attendance
      WHERE student_id = 'a7eb56dc-4b8a-462d-a34d-7c89e73b4a04'
      GROUP BY date
      HAVING COUNT(*) > 1
    `);
    console.log("Duplicate dates for Komal Yadav:", res.rows);

    const countRes = await client.query(`
      SELECT COUNT(DISTINCT date) as distinct_dates, COUNT(*) as total_rows
      FROM student_attendance
      WHERE student_id = 'a7eb56dc-4b8a-462d-a34d-7c89e73b4a04'
    `);
    console.log("Distinct dates vs total rows:", countRes.rows);

  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}

inspectAttendanceDates();
