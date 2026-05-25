const { Client } = require('pg');
require('dotenv').config();

async function inspectEnrollmentsAll() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT 
        c.name as class_name,
        s.name as section_name,
        ay.label as ay_label,
        COUNT(e.id) as enrollment_count
      FROM enrollments e
      JOIN sections s ON e.section_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      GROUP BY c.name, s.name, ay.label
      ORDER BY ay_label, class_name, section_name
    `);
    console.log("=== Enrollments by AY, Class, Section ===");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (error) {
    console.error("Failed to inspect enrollments:", error);
  } finally {
    await client.end();
  }
}

inspectEnrollmentsAll();
