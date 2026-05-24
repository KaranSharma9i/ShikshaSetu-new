const { Client } = require('pg');
require('dotenv').config();

const tables = [
  'institutions', 'academic_years', 'classes', 'subjects', 'users',
  'teachers', 'sections', 'class_subjects', 'timetable', 'students',
  'enrollments', 'fee_structures', 'fee_payments',
  'transport_routes', 'transport_vehicles', 'transport_drivers',
  'student_transport_assignments', 'exams', 'exam_results',
  'holidays', 'circulars'
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║        POST-SEED ROW COUNT VERIFICATION      ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    console.log('Table Name                          | Row Count');
    console.log('------------------------------------|----------');

    for (const table of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) as cnt FROM ${table}`);
        const count = res.rows[0].cnt;
        const padded = table.padEnd(35);
        console.log(`${padded} | ${count}`);
      } catch (e) {
        console.log(`${table.padEnd(35)} | ERROR: ${e.message}`);
      }
    }
    console.log('\n✅ Verification complete.');
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
