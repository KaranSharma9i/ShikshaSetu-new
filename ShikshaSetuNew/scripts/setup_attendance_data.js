const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

// Date range: 2026-03-01 to 2026-05-25
// Holidays:
// - 2026-03-14 (Holi)
// - 2026-04-14 (Dr. Ambedkar Jayanti)
// - 2026-05-01 (Labour Day)
const HOLIDAYS = ['2026-03-14', '2026-04-14', '2026-05-01'];

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Get institution
    console.log('Querying institution...');
    const instRes = await client.query('SELECT id, name FROM institutions LIMIT 1');
    if (instRes.rows.length === 0) {
      throw new Error('No institutions found in database');
    }
    const institution = instRes.rows[0];
    const institutionId = institution.id;
    console.log(`Found institution: ${institution.name} (${institutionId})`);

    // 2. Query academic years for 2025-26 and 2026-27
    console.log('Querying academic years...');
    const ay2025Res = await client.query(
      'SELECT id FROM academic_years WHERE institution_id = $1 AND label = $2',
      [institutionId, '2025-26']
    );
    if (ay2025Res.rows.length === 0) {
      throw new Error('Academic year "2025-26" not found');
    }
    const academicYearId2025 = ay2025Res.rows[0].id;

    let ay2026Res = await client.query(
      'SELECT id FROM academic_years WHERE institution_id = $1 AND label = $2',
      [institutionId, '2026-27']
    );
    let academicYearId2026;
    if (ay2026Res.rows.length === 0) {
      console.log('Academic year "2026-27" not found. Inserting it...');
      const insertAy = await client.query(
        `INSERT INTO academic_years (id, institution_id, label, starts_on, ends_on, is_current, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, '2026-27', '2026-03-30 00:00:00+00', '2027-03-29 23:59:59+00', false, now(), now()) RETURNING id`,
        [institutionId]
      );
      academicYearId2026 = insertAy.rows[0].id;
    } else {
      academicYearId2026 = ay2026Res.rows[0].id;
    }
    console.log(`Academic Year IDs: 2025-26 (${academicYearId2025}), 2026-27 (${academicYearId2026})`);

    // 3. Query admin or teacher to use as marked_by
    const userRes = await client.query(
      "SELECT id FROM users WHERE role IN ('institution_admin', 'teacher') LIMIT 1"
    );
    const adminUserId = userRes.rows.length > 0 ? userRes.rows[0].id : null;
    console.log(`Using marked_by user ID: ${adminUserId}`);

    // 4. Query 5 sections with active students in 2025-26
    console.log('Querying sections with active enrollments...');
    const sectionsRes = await client.query(`
      SELECT DISTINCT e.section_id, s.name AS section_name, c.name AS class_name
      FROM enrollments e
      JOIN sections s ON s.id = e.section_id
      JOIN classes c ON c.id = s.class_id
      JOIN academic_years ay ON ay.id = e.academic_year_id
      WHERE ay.label = '2025-26' AND e.is_active = true
      LIMIT 5
    `);
    const sections = sectionsRes.rows;
    console.log(`Selected ${sections.length} sections:`, sections.map(s => `${s.class_name}-${s.section_name}`).join(', '));
    if (sections.length < 5) {
      throw new Error('Not enough sections with active enrollments in 2025-26');
    }

    // 5. Select 10 students per section (total 50 students)
    console.log('Selecting 10 students per section...');
    const selectedStudents = [];
    for (const sec of sections) {
      const studRes = await client.query(`
        SELECT e.student_id, u.full_name, e.section_id, c.name AS class_name, sec.name AS section_name
        FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN users u ON u.id = s.user_id
        JOIN sections sec ON sec.id = e.section_id
        JOIN classes c ON c.id = sec.class_id
        JOIN academic_years ay ON ay.id = e.academic_year_id
        WHERE ay.label = '2025-26' AND e.section_id = $1 AND e.is_active = true
        LIMIT 10
      `, [sec.section_id]);
      
      console.log(`Section ${sec.class_name}-${sec.section_name}: found ${studRes.rows.length} students`);
      selectedStudents.push(...studRes.rows);
    }
    console.log(`Total students selected: ${selectedStudents.length}`);
    if (selectedStudents.length < 50) {
      throw new Error(`Could not find 50 students (only found ${selectedStudents.length})`);
    }

    // 6. Enroll these 50 students into academic year 2026-27
    console.log('Enrolling selected 50 students into academic year 2026-27...');
    for (const stud of selectedStudents) {
      const rollNumber = `2026-${Math.floor(1000 + Math.random() * 9000)}`;
      await client.query(`
        INSERT INTO enrollments (id, student_id, section_id, academic_year_id, roll_number, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, true, now(), now())
        ON CONFLICT (student_id, academic_year_id) DO NOTHING
      `, [stud.student_id, stud.section_id, academicYearId2026, rollNumber]);
    }

    // 7. Copy class_subjects for 2026-27 for these 5 sections
    console.log('Copying class subjects for 2026-27...');
    const sectionIds = sections.map(s => s.section_id);
    await client.query(`
      INSERT INTO class_subjects (section_id, subject_id, academic_year_id, max_marks, teacher_id)
      SELECT section_id, subject_id, $1, max_marks, teacher_id
      FROM class_subjects
      WHERE academic_year_id = $2 AND section_id = ANY($3)
      ON CONFLICT (section_id, subject_id, academic_year_id) DO NOTHING
    `, [academicYearId2026, academicYearId2025, sectionIds]);

    // Query class subjects for 2026-27
    const csRes = await client.query(`
      SELECT id, section_id
      FROM class_subjects
      WHERE academic_year_id = $1 AND section_id = ANY($2)
    `, [academicYearId2026, sectionIds]);

    const classSubjectsBySection = {};
    csRes.rows.forEach(row => {
      if (!classSubjectsBySection[row.section_id]) {
        classSubjectsBySection[row.section_id] = [];
      }
      classSubjectsBySection[row.section_id].push(row.id);
    });

    // 8. Query 20 active teachers
    console.log('Querying 20 active teachers...');
    const teachersRes = await client.query(`
      SELECT t.id, u.full_name
      FROM teachers t
      JOIN users u ON u.id = t.user_id
      WHERE t.institution_id = $1 AND t.deleted_at IS NULL
      LIMIT 20
    `, [institutionId]);
    const teachers = teachersRes.rows;
    console.log(`Found ${teachers.length} teachers`);
    if (teachers.length < 20) {
      throw new Error(`Could not find 20 active teachers (found ${teachers.length})`);
    }

    // 9. SAFETY FIRST: Delete existing attendance records for these 50 students and 20 teachers ONLY
    const studentIds = selectedStudents.map(s => s.student_id);
    const teacherIds = teachers.map(t => t.id);

    const studAttCountBefore = await client.query(
      'SELECT COUNT(*) FROM student_attendance WHERE student_id = ANY($1)',
      [studentIds]
    );
    const teachAttCountBefore = await client.query(
      'SELECT COUNT(*) FROM teacher_attendance WHERE teacher_id = ANY($1)',
      [teacherIds]
    );

    console.log(`\nSelective deleting old records...`);
    await client.query('DELETE FROM student_attendance WHERE student_id = ANY($1)', [studentIds]);
    await client.query('DELETE FROM teacher_attendance WHERE teacher_id = ANY($1)', [teacherIds]);

    const studAttCountAfter = await client.query(
      'SELECT COUNT(*) FROM student_attendance WHERE student_id = ANY($1)',
      [studentIds]
    );
    const teachAttCountAfter = await client.query(
      'SELECT COUNT(*) FROM teacher_attendance WHERE teacher_id = ANY($1)',
      [teacherIds]
    );

    console.log(`Student attendance count: ${studAttCountBefore.rows[0].count} deleted (current: ${studAttCountAfter.rows[0].count})`);
    console.log(`Teacher attendance count: ${teachAttCountBefore.rows[0].count} deleted (current: ${teachAttCountAfter.rows[0].count})`);

    // 10. Generate date range
    const start = new Date('2026-03-01');
    const end = new Date('2026-05-25');
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      const dayOfWeek = d.getDay(); // 0: Sun, 6: Sat
      
      if (HOLIDAYS.includes(dateStr)) {
        dates.push({ date: dateStr, isHoliday: true, isWeekend: false });
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekends (skipped, except March 14)
        continue;
      } else {
        dates.push({ date: dateStr, isHoliday: false, isWeekend: false, dayOfWeek });
      }
    }
    console.log(`Total days to seed: ${dates.length} days (including 3 holidays)`);

    // 11. Assign student categories and absent days
    // 30 Excellent, 10 Good, 7 Warning, 3 Critical
    const studentCategories = [];
    for (let i = 0; i < selectedStudents.length; i++) {
      let cat = 'excellent';
      if (i >= 30 && i < 40) cat = 'good';
      else if (i >= 40 && i < 47) cat = 'warning';
      else if (i >= 47) cat = 'critical';
      
      studentCategories.push({
        studentId: selectedStudents[i].student_id,
        fullName: selectedStudents[i].full_name,
        sectionId: selectedStudents[i].section_id,
        category: cat
      });
    }

    const studentAbsenceDates = {};
    const schoolDays = dates.filter(d => !d.isHoliday);

    studentCategories.forEach(sc => {
      studentAbsenceDates[sc.studentId] = new Set();
      
      if (sc.category === 'excellent') {
        const count = 1 + Math.floor(Math.random() * 2); // 1-2 days
        while (studentAbsenceDates[sc.studentId].size < count) {
          const idx = Math.floor(Math.random() * schoolDays.length);
          studentAbsenceDates[sc.studentId].add(schoolDays[idx].date);
        }
      } else if (sc.category === 'good') {
        const count = 4 + Math.floor(Math.random() * 3); // 4-6 days
        while (studentAbsenceDates[sc.studentId].size < count) {
          const idx = Math.floor(Math.random() * schoolDays.length);
          studentAbsenceDates[sc.studentId].add(schoolDays[idx].date);
        }
      } else if (sc.category === 'warning') {
        const count = 8 + Math.floor(Math.random() * 3); // 8-10 days
        while (studentAbsenceDates[sc.studentId].size < count) {
          const idx = Math.floor(Math.random() * schoolDays.length);
          studentAbsenceDates[sc.studentId].add(schoolDays[idx].date);
        }
      } else if (sc.category === 'critical') {
        const count = 15 + Math.floor(Math.random() * 6); // 15-20 days
        const thursFris = schoolDays.filter(d => d.dayOfWeek === 4 || d.dayOfWeek === 5);
        const otherDays = schoolDays.filter(d => d.dayOfWeek !== 4 && d.dayOfWeek !== 5);
        
        // absent on Thursdays/Fridays first
        const thursFriAbsCount = Math.min(count - 3, thursFris.length);
        const shuffledThursFris = [...thursFris].sort(() => 0.5 - Math.random());
        for (let k = 0; k < thursFriAbsCount; k++) {
          studentAbsenceDates[sc.studentId].add(shuffledThursFris[k].date);
        }
        // remainder from other days
        while (studentAbsenceDates[sc.studentId].size < count) {
          const idx = Math.floor(Math.random() * otherDays.length);
          studentAbsenceDates[sc.studentId].add(otherDays[idx].date);
        }
      }
    });

    // 12. Create student attendance records
    const studentRecords = [];
    for (const sc of studentCategories) {
      const subjects = classSubjectsBySection[sc.sectionId] || [];
      if (subjects.length === 0) continue;
      
      for (const dateObj of dates) {
        let status = 'present';
        if (dateObj.isHoliday) {
          status = 'holiday';
        } else if (studentAbsenceDates[sc.studentId].has(dateObj.date)) {
          status = 'absent';
        } else {
          const r = Math.random();
          if (r < 0.02) status = 'late';
          else if (r < 0.04) status = 'excused';
        }
        
        for (const subId of subjects) {
          studentRecords.push({
            student_id: sc.studentId,
            class_subject_id: subId,
            academic_year_id: academicYearId2026,
            date: dateObj.date,
            status: status,
            marked_by: adminUserId
          });
        }
      }
    }

    // 13. Assign teacher categories and absent/leave days
    const teacherCategories = [];
    for (let i = 0; i < teachers.length; i++) {
      let cat = 'excellent';
      if (i >= 14 && i < 18) cat = 'good';
      else if (i >= 18) cat = 'on_leave';
      
      teacherCategories.push({
        teacherId: teachers[i].id,
        fullName: teachers[i].full_name,
        category: cat
      });
    }

    const teacherAbsenceDates = {};
    const teacherLeaveDates = {};

    teacherCategories.forEach(tc => {
      teacherAbsenceDates[tc.teacherId] = new Set();
      teacherLeaveDates[tc.teacherId] = new Set();
      
      if (tc.category === 'excellent') {
        const count = Math.floor(Math.random() * 2); // 0-1 days
        while (teacherAbsenceDates[tc.teacherId].size < count) {
          const idx = Math.floor(Math.random() * schoolDays.length);
          teacherAbsenceDates[tc.teacherId].add(schoolDays[idx].date);
        }
      } else if (tc.category === 'good') {
        const count = 3 + Math.floor(Math.random() * 3); // 3-5 days
        while (teacherAbsenceDates[tc.teacherId].size < count) {
          const idx = Math.floor(Math.random() * schoolDays.length);
          teacherAbsenceDates[tc.teacherId].add(schoolDays[idx].date);
        }
      } else if (tc.category === 'on_leave') {
        // Mark 5-8 consecutive days as 'on_leave' in April 2026
        const aprilDays = schoolDays.filter(d => d.date.startsWith('2026-04-'));
        const leaveCount = 5 + Math.floor(Math.random() * 4); // 5-8 days
        const startIdx = Math.floor(Math.random() * (aprilDays.length - leaveCount));
        for (let k = 0; k < leaveCount; k++) {
          teacherLeaveDates[tc.teacherId].add(aprilDays[startIdx + k].date);
        }
        
        // Add 1 random absent day
        const otherDays = schoolDays.filter(d => !teacherLeaveDates[tc.teacherId].has(d.date));
        const absIdx = Math.floor(Math.random() * otherDays.length);
        teacherAbsenceDates[tc.teacherId].add(otherDays[absIdx].date);
      }
    });

    const teacherRecords = [];
    for (const tc of teacherCategories) {
      for (const dateObj of dates) {
        let status = 'present';
        if (dateObj.isHoliday) {
          status = 'holiday';
        } else if (teacherLeaveDates[tc.teacherId]?.has(dateObj.date)) {
          status = 'on_leave';
        } else if (teacherAbsenceDates[tc.teacherId]?.has(dateObj.date)) {
          status = 'absent';
        } else {
          if (Math.random() < 0.04) {
            status = 'late';
          }
        }

        teacherRecords.push({
          teacher_id: tc.teacherId,
          academic_year_id: academicYearId2026,
          date: dateObj.date,
          status: status,
          marked_by: adminUserId
        });
      }
    }

    // 14. Batch Insert Helper
    async function batchInsert(tableName, records) {
      if (records.length === 0) return;
      const batchSize = 500;
      console.log(`Inserting ${records.length} records into ${tableName} in batches of ${batchSize}...`);
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const keys = Object.keys(batch[0]);
        const values = [];
        const valPlaceholders = [];
        
        batch.forEach((record) => {
          const rowPlaceholders = [];
          keys.forEach((key) => {
            values.push(record[key]);
            rowPlaceholders.push(`$${values.length}`);
          });
          valPlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        });
        
        const conflictClause = tableName === 'student_attendance'
          ? 'ON CONFLICT (student_id, class_subject_id, date) DO NOTHING'
          : 'ON CONFLICT (teacher_id, date) DO NOTHING';

        const sql = `
          INSERT INTO ${tableName} (${keys.join(', ')})
          VALUES ${valPlaceholders.join(', ')}
          ${conflictClause}
        `;
        
        await client.query(sql, values);
      }
    }

    // 15. Perform batch inserts
    console.log('Inserting student attendance records...');
    await batchInsert('student_attendance', studentRecords);
    
    console.log('Inserting teacher attendance records...');
    await batchInsert('teacher_attendance', teacherRecords);

    // 16. Verify counts after seeding
    const studCountFinal = await client.query(
      'SELECT COUNT(*) FROM student_attendance WHERE student_id = ANY($1)',
      [studentIds]
    );
    const teachCountFinal = await client.query(
      'SELECT COUNT(*) FROM teacher_attendance WHERE teacher_id = ANY($1)',
      [teacherIds]
    );

    console.log('\n--- SEED SUMMARY ---');
    console.log(`Seeded ${studCountFinal.rows[0].count} student records across 50 students`);
    console.log(`Seeded ${teachCountFinal.rows[0].count} teacher records across 20 teachers`);
    console.log('✅ Seeding completed successfully!');

  } catch (err) {
    console.error('Error seeding attendance data:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
