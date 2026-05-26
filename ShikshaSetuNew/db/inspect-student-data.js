const { Client } = require('pg');
require('dotenv').config();

async function inspectStudentData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("=== Total Row Counts ===");
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM students) as students,
        (SELECT COUNT(*) FROM homework) as homework,
        (SELECT COUNT(*) FROM homework_submissions) as submissions,
        (SELECT COUNT(*) FROM exams) as exams,
        (SELECT COUNT(*) FROM exam_results) as exam_results,
        (SELECT COUNT(*) FROM circulars) as circulars,
        (SELECT COUNT(*) FROM fee_structures) as fee_structures,
        (SELECT COUNT(*) FROM fee_payments) as fee_payments
    `);
    console.table(counts.rows);

    console.log("=== Active Student Example with Role 'student' ===");
    const stuRes = await client.query(`
      SELECT 
        s.id as student_id,
        u.id as user_id,
        u.full_name,
        u.email,
        u.role,
        c.name as class_name,
        sec.name as section_name,
        e.roll_number
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN enrollments e ON s.id = e.student_id
      JOIN sections sec ON e.section_id = sec.id
      JOIN classes c ON sec.class_id = c.id
      WHERE u.role = 'student' AND e.is_active = true
      LIMIT 5
    `);
    console.table(stuRes.rows);

    if (stuRes.rows.length > 0) {
      const studentId = stuRes.rows[0].student_id;
      const classId = await client.query(`
        SELECT sec.class_id
        FROM enrollments e
        JOIN sections sec ON e.section_id = sec.id
        WHERE e.student_id = $1 AND e.is_active = true
        LIMIT 1
      `, [studentId]).then(res => res.rows[0]?.class_id);

      console.log(`\n=== Sample Data for Student: ${stuRes.rows[0].full_name} (${studentId}) ===`);
      
      console.log("--- Fee structures for class ---");
      const fees = await client.query(`
        SELECT fs.id, fs.fee_name, fs.amount, fs.due_date, fp.amount_paid
        FROM fee_structures fs
        LEFT JOIN fee_payments fp ON fs.id = fp.fee_structure_id AND fp.student_id = $1
        WHERE fs.class_id = $2 AND fs.deleted_at IS NULL
      `, [studentId, classId]);
      console.table(fees.rows);

      console.log("--- Homework Submissions ---");
      const hw = await client.query(`
        SELECT hs.id, h.title, h.total_marks, hs.marks_obtained
        FROM homework_submissions hs
        JOIN homework h ON hs.homework_id = h.id
        WHERE hs.student_id = $1 AND hs.deleted_at IS NULL
      `, [studentId]);
      console.table(hw.rows);

      console.log("--- Exam Results ---");
      const ex = await client.query(`
        SELECT er.id, e.exam_name, e.total_marks, er.marks_obtained
        FROM exam_results er
        JOIN exams e ON er.exam_id = e.id
        WHERE er.student_id = $1 AND er.deleted_at IS NULL
      `, [studentId]);
      console.table(ex.rows);

      console.log("--- Upcoming Exams ---");
      const upEx = await client.query(`
        SELECT id, exam_name, exam_date, total_marks
        FROM exams
        WHERE class_id = $1 AND exam_date >= CURRENT_DATE AND deleted_at IS NULL
        ORDER BY exam_date ASC
        LIMIT 3
      `, [classId]);
      console.table(upEx.rows);

      console.log("--- Circulars ---");
      const circs = await client.query(`
        SELECT id, title, content, publish_date
        FROM circulars
        WHERE institution_id = $1 AND deleted_at IS NULL
        ORDER BY publish_date DESC
        LIMIT 3
      `, [stuRes.rows[0].institution_id || '24653c8d-4fba-4a08-aa6b-b11ab3450a55']); // fallback institution_id if null
      console.table(circs.rows);
    }

  } catch (error) {
    console.error("Failed to inspect student data:", error);
  } finally {
    await client.end();
  }
}

inspectStudentData();
