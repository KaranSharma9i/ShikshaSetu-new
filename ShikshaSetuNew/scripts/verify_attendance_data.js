const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log('--- Database Attendance Seeding Verification ---');

    // Check holiday records for March 14, April 14, May 1 as text
    const holidayRecs = await client.query(`
      SELECT date::text AS date_str, COUNT(*) AS student_holiday_records
      FROM student_attendance
      WHERE date IN ('2026-03-14', '2026-04-14', '2026-05-01') AND status = 'holiday'
      GROUP BY date_str
      ORDER BY date_str
    `);
    console.log(`\nHoliday records (Student) cast to text:`);
    holidayRecs.rows.forEach(r => {
      console.log(`  ${r.date_str}: ${r.student_holiday_records} records`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
