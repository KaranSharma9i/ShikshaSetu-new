const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function setup() {
  console.log('Connecting to database...');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Create table
    console.log('Creating ai_scores table...');
    const ddlPath = path.join(__dirname, '../db/migrations/0027_create_ai_scores.sql');
    const ddlSql = fs.readFileSync(ddlPath, 'utf8');
    await client.query(ddlSql);
    console.log('Table and index verified/created.');

    // 2. Fetch all students joined with classes
    console.log('Fetching students to group by class...');
    const query = `
      SELECT s.id AS student_id, c.id AS class_id, c.name AS class_name
      FROM students s
      JOIN enrollments e ON e.student_id = s.id
      JOIN sections sec ON sec.id = e.section_id
      JOIN classes c ON c.id = sec.class_id
      WHERE e.is_active = TRUE
      ORDER BY c.grade_number, s.student_code;
    `;
    const res = await client.query(query);
    const students = res.rows;
    console.log(`Found ${students.length} active enrollments.`);

    // Group students by class
    const classGroups = {};
    for (const student of students) {
      if (!classGroups[student.class_id]) {
        classGroups[student.class_id] = [];
      }
      classGroups[student.class_id].push(student.student_id);
    }

    // Pick 2 students per class
    const selectedStudentIds = [];
    for (const classId in classGroups) {
      const studentIds = classGroups[classId];
      // Pick first two
      selectedStudentIds.push(...studentIds.slice(0, 2));
    }
    console.log(`Selected ${selectedStudentIds.length} sample students (2 per class).`);

    // 3. Clear existing scores for selected students to avoid unique constraints conflicts
    console.log('Clearing old scores for selected sample students...');
    await client.query('DELETE FROM ai_scores WHERE student_id = ANY($1)', [selectedStudentIds]);

    // 4. Seed monthly scores for selected students
    // Dates: 2025-09-01, 2025-10-01, 2025-11-01, 2025-12-01, 2026-01-01, 2026-02-01, 2026-03-01, 2026-04-01, 2026-05-01
    const months = [
      '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01',
      '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01'
    ];

    console.log('Inserting AI score history (9 data points per student)...');
    let insertCount = 0;
    
    // Seed with transactional batching
    await client.query('BEGIN');
    
    for (const studentId of selectedStudentIds) {
      // Generate a base score between 72 and 88
      let score = 72 + Math.floor(Math.random() * 16); 
      
      for (let i = 0; i < months.length; i++) {
        const date = months[i];
        // Apply a monthly drift (tendency to improve by 1.2 to 2.4 points on average)
        // With some slight monthly fluctuations
        const drift = 0.5 + Math.random() * 2.0; 
        const fluctuation = (Math.random() - 0.4) * 3; // skewed positive
        score = Math.min(100, Math.max(0, score + drift + fluctuation));
        
        // Final score formatted to 1 decimal place
        const finalScore = parseFloat(score.toFixed(1));

        await client.query(
          `INSERT INTO ai_scores (student_id, score, date) VALUES ($1, $2, $3)
           ON CONFLICT (student_id, date) DO UPDATE SET score = EXCLUDED.score;`,
          [studentId, finalScore, date]
        );
        insertCount++;
      }
    }
    
    await client.query('COMMIT');
    console.log(`Successfully seeded ${insertCount} AI score records.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database setup failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setup().catch(console.error);
