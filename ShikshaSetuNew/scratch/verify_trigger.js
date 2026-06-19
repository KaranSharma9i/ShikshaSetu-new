const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verify() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase.com') ? { rejectUnauthorized: false } : false
  });
  await client.connect();

  try {
    console.log('Fetching a test exam...');
    const examRes = await client.query('SELECT id, is_locked FROM public.exams LIMIT 1;');
    if (examRes.rows.length === 0) {
      console.log('No exams found in public.exams to test trigger.');
      return;
    }
    const testExam = examRes.rows[0];
    const examId = testExam.id;
    console.log(`Found exam ${examId}, current lock state: ${testExam.is_locked}`);

    // Lock the exam
    console.log('Locking the exam...');
    await client.query('UPDATE public.exams SET is_locked = true WHERE id = $1;', [examId]);

    // Try to update/insert exam_results
    console.log('Attempting to upsert exam results (should fail)...');
    try {
      await client.query(`
        INSERT INTO public.exam_results (exam_id, student_id, marks_obtained, grade)
        VALUES ($1, '00000000-0000-0000-0000-000000000000', 50, 'B')
        ON CONFLICT (exam_id, student_id) DO UPDATE SET marks_obtained = 50;
      `, [examId]);
      console.error('❌ FAILURE: Was able to modify exam_results for a locked exam!');
    } catch (err) {
      console.log(`\n✅ SUCCESS: Trigger successfully rejected update. Error message: "${err.message}"\n`);
      if (err.message.includes('Cannot modify exam_results: exam')) {
        console.log('✅ Trigger error message is correct.');
      } else {
        console.warn('⚠️ Trigger error message did not match expected structure.');
      }
    }

    // Unlock the exam
    console.log('Unlocking the exam back to original state...');
    await client.query('UPDATE public.exams SET is_locked = false WHERE id = $1;', [examId]);
    console.log('Trigger verification completed.');

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await client.end();
  }
}

verify().catch(console.error);
