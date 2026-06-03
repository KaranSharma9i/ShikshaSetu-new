const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const csRes = await client.query('SELECT COUNT(*) as cnt FROM class_subjects WHERE teacher_id IS NOT NULL');
    console.log('class_subjects with non-null teacher_id count =', csRes.rows[0].cnt);

    if (csRes.rows[0].cnt > 0) {
      const sample = await client.query('SELECT cs.id, cs.teacher_id, t.user_id FROM class_subjects cs LEFT JOIN teachers t ON t.id = cs.teacher_id WHERE cs.teacher_id IS NOT NULL LIMIT 5');
      console.log('Sample rows:', sample.rows);
    } else {
      console.log('ALL class_subjects have teacher_id as NULL! Let us see if there is any other table relating class_subjects to teachers.');
      const columnsRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'class_subjects'
      `);
      console.log('class_subjects columns:', columnsRes.rows);
    }
  } finally {
    await client.end();
  }
}

main().catch(console.error);
