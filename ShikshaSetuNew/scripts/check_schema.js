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
    for (const table of tables) {
      const res = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);
      console.log(`\n=== ${table} ===`);
      for (const row of res.rows) {
        const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = row.column_default ? ` DEFAULT ${row.column_default}` : '';
        console.log(`  ${row.column_name} [${row.data_type}] ${nullable}${def}`);
      }
    }

    // Also check foreign key constraints
    console.log('\n\n=== FOREIGN KEY CONSTRAINTS ===');
    const fkRes = await client.query(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_col,
        ccu.table_name AS to_table,
        ccu.column_name AS to_col,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);
    for (const row of fkRes.rows) {
      console.log(`  ${row.from_table}.${row.from_col} -> ${row.to_table}.${row.to_col}`);
    }
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
