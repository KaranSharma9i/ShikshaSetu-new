const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const userId = '87e8c2a2-a88b-4d0b-bf8c-0a5f8f6de5e2';

    // Set the user context in the transaction
    await client.query('BEGIN');
    
    // Simulate Supabase JWT context settings
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated', email: 'teacher@school.com' })
    ]);

    // Check helper functions
    const isTeacherRes = await client.query(`SELECT is_teacher()`);
    console.log("is_teacher():", isTeacherRes.rows[0].is_teacher);

    const authInstIdRes = await client.query(`SELECT auth_institution_id()`);
    console.log("auth_institution_id():", authInstIdRes.rows[0].auth_institution_id);

    // Let's see what is returned by sections join classes for this institution
    const instId = authInstIdRes.rows[0].auth_institution_id;
    console.log("Institution ID:", instId);

    // Run the actual sub-exists check from the RLS policy
    const testRLS = await client.query(`
      SELECT s.id, c.institution_id 
      FROM sections s
      JOIN classes c ON c.id = s.class_id
      WHERE c.institution_id = auth_institution_id()
    `);
    console.log("Sections visible to institution:", testRLS.rows.length);

    // Let's check the timetable query directly using this user's context
    const timetableRows = await client.query(`
      SELECT * FROM timetable t
      WHERE 
        (
          EXISTS (
            SELECT 1 FROM sections s
            JOIN classes c ON c.id = s.class_id
            WHERE s.id = t.section_id AND c.institution_id = auth_institution_id()
          )
        ) 
        AND (
          EXISTS (
            SELECT 1 FROM class_subjects cs
            WHERE cs.id = t.class_subject_id AND cs.teacher_id = auth.uid()
          )
        )
    `);
    console.log("Timetable rows returned under RLS simulation:", timetableRows.rows);

    await client.query('ROLLBACK');
  } catch (err) {
    console.error(err);
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
}
run();
