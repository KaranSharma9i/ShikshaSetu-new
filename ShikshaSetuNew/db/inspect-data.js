const { Client } = require('pg');
require('dotenv').config();

async function inspectData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("=== Academic Years ===");
    const ayRes = await client.query(`
      SELECT id, label, starts_on, ends_on, is_current, deleted_at
      FROM academic_years
    `);
    console.table(ayRes.rows);

    console.log("\n=== Classes ===");
    const clRes = await client.query(`
      SELECT id, name, grade_number, deleted_at
      FROM classes
    `);
    console.table(clRes.rows);

    console.log("\n=== Sections ===");
    const secRes = await client.query(`
      SELECT id, name, class_id, class_teacher_id, deleted_at
      FROM sections
    `);
    console.table(secRes.rows);

    console.log("\n=== Enrollments Count by Section ===");
    const enrollRes = await client.query(`
      SELECT 
        s.id as section_id,
        c.name as class_name,
        s.name as section_name,
        e.academic_year_id,
        ay.label as ay_label,
        COUNT(e.id) as enrollment_count,
        SUM(CASE WHEN e.is_active = true THEN 1 ELSE 0 END) as active_enrollment_count
      FROM sections s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN enrollments e ON s.id = e.section_id
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      GROUP BY s.id, c.name, s.name, e.academic_year_id, ay.label
      ORDER BY class_name, section_name
    `);
    console.table(enrollRes.rows);

    console.log("\n=== Sample Students & Enrollments for Nursery/UKG ===");
    const sampleRes = await client.query(`
      SELECT 
        s.id as student_id,
        u.full_name,
        e.is_active,
        e.academic_year_id,
        ay.label as ay_label,
        c.name as class_name,
        sec.name as section_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN sections sec ON e.section_id = sec.id
      JOIN classes c ON sec.class_id = c.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE c.name IN ('Nursery', 'UKG', 'LKG')
      LIMIT 15
    `);
    console.table(sampleRes.rows);

  } catch (error) {
    console.error("Failed to inspect:", error);
  } finally {
    await client.end();
  }
}

inspectData();
