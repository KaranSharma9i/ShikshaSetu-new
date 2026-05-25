const { Client } = require('pg');
require('dotenv').config();

async function inspectAttendanceRows() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT *
      FROM student_attendance
      WHERE student_id = 'a7eb56dc-4b8a-462d-a34d-7c89e73b4a04'
      LIMIT 10
    `);
    console.log("First 10 Attendance Rows for Komal:");
    console.log(res.rows);

  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}

inspectAttendanceRows();
