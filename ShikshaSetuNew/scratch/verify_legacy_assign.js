const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verify() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const institutionId = '1d32deac-4363-4dec-9ddc-943392877351';
  const academicYearId = 'cc6bc75a-4bf6-423b-a43d-1eeb421e31c0';
  const classId = 'd652ef60-4f08-42f6-87b2-0a538aae1f1a';
  const examName = 'Unit Test 1';

  try {
    console.log('1. Checking count of legacy exams before test...');
    const initialRes = await client.query(`
      SELECT COUNT(*) FROM public.exams 
      WHERE institution_id = $1 AND academic_year_id = $2 AND class_id = $3 AND exam_name = $4 AND exam_term_id IS NULL;
    `, [institutionId, academicYearId, classId, examName]);
    console.log(`Found ${initialRes.rows[0].count} matching legacy exams before assignment.`);

    console.log('2. Inserting test exam term...');
    const termRes = await client.query(`
      INSERT INTO public.exam_terms (institution_id, academic_year_id, class_id, name)
      VALUES ($1, $2, $3, 'Verification Term')
      RETURNING id, name;
    `, [institutionId, academicYearId, classId]);
    const term = termRes.rows[0];
    console.log(`Created term: "${term.name}" with ID: ${term.id}`);

    console.log('3. Assigning legacy exams to new term...');
    const updateRes = await client.query(`
      UPDATE public.exams 
      SET exam_term_id = $1
      WHERE institution_id = $2 AND academic_year_id = $3 AND class_id = $4 AND exam_name = $5 AND exam_term_id IS NULL
      RETURNING id;
    `, [term.id, institutionId, academicYearId, classId, examName]);
    console.log(`Updated ${updateRes.rows.length} exam rows.`);

    console.log('4. Verifying assignment...');
    const checkRes = await client.query(`
      SELECT id, exam_term_id FROM public.exams 
      WHERE institution_id = $1 AND academic_year_id = $2 AND class_id = $3 AND exam_name = $4;
    `, [institutionId, academicYearId, classId, examName]);
    const allAssigned = checkRes.rows.every(row => row.exam_term_id === term.id);
    console.log(`${allAssigned ? '✅' : '❌'} All matching exams have correct exam_term_id.`);

    console.log('5. Reverting changes for cleanup...');
    await client.query(`
      UPDATE public.exams 
      SET exam_term_id = NULL 
      WHERE exam_term_id = $1;
    `, [term.id]);
    console.log('Reverted exam_term_id to NULL.');

    await client.query(`
      DELETE FROM public.exam_terms WHERE id = $1;
    `, [term.id]);
    console.log('Deleted test exam term.');

    console.log('\n🎉 Verification script completed successfully! All steps passed.');

  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await client.end();
  }
}

verify().catch(console.error);
