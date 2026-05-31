const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const rlsSql = `
-- ============================================
-- RLS for exams table
-- ============================================
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their class exams" ON exams;

CREATE POLICY "Students can view their class exams"
ON exams FOR SELECT
USING (
  class_id IN (
    SELECT sec.class_id
    FROM students s
    JOIN users u ON u.id = s.user_id
    JOIN enrollments e ON e.student_id = s.id AND e.is_active = true
    JOIN sections sec ON sec.id = e.section_id
    WHERE u.id = auth.uid()
    AND u.role = 'student'
  )
  AND deleted_at IS NULL
);

-- ============================================
-- RLS for holidays table
-- ============================================
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view institution holidays" ON holidays;

CREATE POLICY "Students can view institution holidays"
ON holidays FOR SELECT
USING (
  institution_id IN (
    SELECT s.institution_id
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE u.id = auth.uid()
    AND u.role = 'student'
  )
  AND deleted_at IS NULL
);

-- ============================================
-- RLS for leaves table
-- ============================================
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own leaves" ON leaves;
DROP POLICY IF EXISTS "Students can insert own leaves" ON leaves;

CREATE POLICY "Students can view own leaves"
ON leaves FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE u.id = auth.uid()
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Students can insert own leaves"
ON leaves FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT s.id FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE u.id = auth.uid()
  )
);

-- ============================================
-- RLS for student_attendance table
-- ============================================
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own attendance" ON student_attendance;

CREATE POLICY "Students can view own attendance"
ON student_attendance FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE u.id = auth.uid()
  )
);

-- ============================================
-- RLS for academic_years table
-- ============================================
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their institution academic years" ON academic_years;

CREATE POLICY "Students can view their institution academic years"
ON academic_years FOR SELECT
USING (
  institution_id IN (
    SELECT s.institution_id FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE u.id = auth.uid()
    AND u.role = 'student'
  )
);
`;

  try {
    console.log("Applying RLS policies...");
    await client.query(rlsSql);
    console.log("All RLS policies applied successfully!");
  } catch (error) {
    console.error("Error applying RLS policies:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
