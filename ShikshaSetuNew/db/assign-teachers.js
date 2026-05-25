const { Client } = require('pg');
require('dotenv').config();

async function assignTeachers() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("Fetching teachers...");
    const tRes = await client.query(`
      SELECT t.id, t.user_id, t.employee_code, t.specialization
      FROM teachers t
    `);
    const teachers = tRes.rows;
    console.log(`Found ${teachers.length} teachers.`);

    console.log("Fetching sections...");
    const sRes = await client.query(`
      SELECT s.id as section_id, s.class_id, s.class_teacher_id, c.name as class_name
      FROM sections s
      JOIN classes c ON s.class_id = c.id
    `);
    const sections = sRes.rows;

    console.log("Fetching subjects...");
    const subRes = await client.query("SELECT id, name, code FROM subjects");
    const subjects = subRes.rows;

    // Helper to find best subject match for a specialization
    function findSubjectId(spec) {
      const lowerSpec = spec.toLowerCase();
      let match = null;
      
      if (lowerSpec.includes("math")) {
        match = subjects.find(s => s.code === 'MAT-SR' || s.code === 'MAT' || s.code === 'PP-MAT');
      } else if (lowerSpec.includes("hindi")) {
        match = subjects.find(s => s.code === 'HIN' || s.code === 'PP-HIN');
      } else if (lowerSpec.includes("physics")) {
        match = subjects.find(s => s.code === 'PHY-SR' || s.code === 'PHY');
      } else if (lowerSpec.includes("chemistry")) {
        match = subjects.find(s => s.code === 'CHE-SR' || s.code === 'CHE');
      } else if (lowerSpec.includes("biology")) {
        match = subjects.find(s => s.code === 'BIO-SR' || s.code === 'BIO');
      } else if (lowerSpec.includes("science")) {
        match = subjects.find(s => s.code === 'SCI' || s.code === 'EVS');
      } else if (lowerSpec.includes("english")) {
        match = subjects.find(s => s.code === 'ENG-CORE' || s.code === 'ENG' || s.code === 'PP-ENG');
      } else if (lowerSpec.includes("social") || lowerSpec.includes("history") || lowerSpec.includes("geography")) {
        match = subjects.find(s => s.code === 'SST' || s.code === 'HIS' || s.code === 'GEO');
      } else if (lowerSpec.includes("computer") || lowerSpec.includes("informatics")) {
        match = subjects.find(s => s.code === 'CS' || s.code === 'IP');
      } else if (lowerSpec.includes("physical") || lowerSpec.includes("sports")) {
        match = subjects.find(s => s.code === 'PE');
      } else if (lowerSpec.includes("sanskrit")) {
        match = subjects.find(s => s.code === 'SAN');
      } else if (lowerSpec.includes("art")) {
        match = subjects.find(s => s.code === 'ART');
      }
      
      return match ? match.id : null;
    }

    let updateCount = 0;

    await client.query("BEGIN");

    for (const teacher of teachers) {
      const subjectId = findSubjectId(teacher.specialization);
      if (!subjectId) {
        console.log(`No subject match for specialization: ${teacher.specialization} (${teacher.employee_code})`);
        continue;
      }

      // Find section where they are class teacher
      const section = sections.find(s => s.class_teacher_id === teacher.user_id);
      if (section) {
        // Assign this teacher to teach this subject in this section
        const upd1 = await client.query(`
          UPDATE class_subjects
          SET teacher_id = $1
          WHERE section_id = $2 AND subject_id = $3
          RETURNING id
        `, [teacher.user_id, section.section_id, subjectId]);
        
        if (upd1.rowCount > 0) updateCount += upd1.rowCount;

        // Also assign them to teach this subject in other sections of the same class
        const otherSections = sections.filter(s => s.class_id === section.class_id && s.section_id !== section.section_id);
        for (const otherSec of otherSections) {
          const upd2 = await client.query(`
            UPDATE class_subjects
            SET teacher_id = $1
            WHERE section_id = $2 AND subject_id = $3
            RETURNING id
          `, [teacher.user_id, otherSec.section_id, subjectId]);
          if (upd2.rowCount > 0) updateCount += upd2.rowCount;
        }
      }
    }

    await client.query("COMMIT");
    console.log(`Successfully assigned teachers to ${updateCount} class subjects.`);

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Assignment failed:", error.message);
  } finally {
    await client.end();
  }
}

assignTeachers();
