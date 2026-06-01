global.WebSocket = class {}; // Mock WebSocket to prevent crash in Node.js environment

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Override anon key with service role key to bypass RLS for the database seed script
if (process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
}

async function run() {
  // Dynamic import of supabase to ensure dotenv and the key override are fully loaded first
  const { supabase } = await import('../db/supabase.js');

  console.log('--- STEP 1 — Find Amir\'s IDs ---');
  const { data: amirUser, error: amirUserErr } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'amir@mumbai.com')
    .single();

  if (amirUserErr || !amirUser) {
    console.error('❌ amir@mumbai.com not found in users table', amirUserErr?.message || '');
    process.exit(1);
  }

  const { data: amirTeacher, error: amirTeacherErr } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', amirUser.id)
    .single();

  if (amirTeacherErr || !amirTeacher) {
    console.error('❌ No teacher record found for amir@mumbai.com', amirTeacherErr?.message || '');
    process.exit(1);
  }

  console.log('✅ Found Amir — user_id:', amirUser.id);
  console.log('✅ Found Amir — teacher_id:', amirTeacher.id);

  console.log('\n--- STEP 2 — Discover Existing Data ---');
  // Get first institution
  const { data: institution, error: instErr } = await supabase
    .from('institutions')
    .select('id')
    .limit(1)
    .single();

  if (instErr || !institution) {
    console.error('❌ Institution not found in institutions table', instErr?.message || '');
    process.exit(1);
  }

  // Get current academic year
  const { data: academicYear, error: ayErr } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_current', true)
    .limit(1)
    .single();

  if (ayErr || !academicYear) {
    console.error('❌ No current academic year found in academic_years table', ayErr?.message || '');
    process.exit(1);
  }

  // Get 2 existing sections (with their class info)
  const { data: sections, error: secErr } = await supabase
    .from('sections')
    .select('id, name, class_id, classes(id, name)')
    .limit(2);

  if (secErr || !sections || sections.length < 2) {
    console.error('❌ Missing sections: expected at least 2 sections', secErr?.message || '');
    process.exit(1);
  }

  // Get 2 existing subjects
  const { data: subjects, error: subErr } = await supabase
    .from('subjects')
    .select('id, name')
    .limit(2);

  if (subErr || !subjects || subjects.length < 2) {
    console.error('❌ Missing subjects: expected at least 2 subjects', subErr?.message || '');
    process.exit(1);
  }

  console.log('✅ Institution ID:', institution.id);
  console.log('✅ Academic Year ID:', academicYear.id);
  console.log('✅ Sections:', sections.map(s => `${s.classes?.name || 'Class'} ${s.name} (${s.id})`).join(', '));
  console.log('✅ Subjects:', subjects.map(s => `${s.name} (${s.id})`).join(', '));

  console.log('\n--- STEP 3 — Seed Timetable ---');
  // Upsert class_subjects for section 0 and subject 0 to link them to Amir
  const { data: classSubject1, error: cs1Err } = await supabase
    .from('class_subjects')
    .upsert({
      section_id: sections[0].id,
      subject_id: subjects[0].id,
      academic_year_id: academicYear.id,
      teacher_id: amirUser.id
    }, {
      onConflict: 'section_id,subject_id,academic_year_id'
    })
    .select('id')
    .single();

  if (cs1Err || !classSubject1) {
    console.error('❌ Failed to upsert class_subject 1:', cs1Err?.message || '');
    process.exit(1);
  }

  // Upsert class_subjects for section 1 and subject 1 to link them to Amir
  const { data: classSubject2, error: cs2Err } = await supabase
    .from('class_subjects')
    .upsert({
      section_id: sections[1].id,
      subject_id: subjects[1].id,
      academic_year_id: academicYear.id,
      teacher_id: amirUser.id
    }, {
      onConflict: 'section_id,subject_id,academic_year_id'
    })
    .select('id')
    .single();

  if (cs2Err || !classSubject2) {
    console.error('❌ Failed to upsert class_subject 2:', cs2Err?.message || '');
    process.exit(1);
  }

  // Upsert timetable entry 1 (section[0])
  const { error: tt1Err } = await supabase
    .from('timetable')
    .upsert({
      section_id: sections[0].id,
      class_subject_id: classSubject1.id,
      day: 'monday',
      period_number: 1,
      starts_at: '08:00:00',
      ends_at: '08:45:00',
      academic_year_id: academicYear.id
    }, {
      onConflict: 'section_id,day,period_number,academic_year_id'
    });

  if (tt1Err) {
    console.error('❌ Failed to upsert timetable entry 1:', tt1Err.message);
    process.exit(1);
  }

  // Upsert timetable entry 2 (section[1])
  const { error: tt2Err } = await supabase
    .from('timetable')
    .upsert({
      section_id: sections[1].id,
      class_subject_id: classSubject2.id,
      day: 'tuesday',
      period_number: 2,
      starts_at: '08:45:00',
      ends_at: '09:30:00',
      academic_year_id: academicYear.id
    }, {
      onConflict: 'section_id,day,period_number,academic_year_id'
    });

  if (tt2Err) {
    console.error('❌ Failed to upsert timetable entry 2:', tt2Err.message);
    process.exit(1);
  }

  console.log('✅ Timetable seeded');

  console.log('\n--- STEP 4 — Seed AI Scores (if table is empty) ---');
  const { count: aiCount, error: aiCountErr } = await supabase
    .from('ai_scores')
    .select('*', { count: 'exact', head: true });

  if (aiCountErr) {
    console.error('❌ Failed to query ai_scores count:', aiCountErr.message);
    process.exit(1);
  }

  if (aiCount === 0) {
    // Get all enrolled students in Amir's sections
    const { data: enrollments, error: enrollErr } = await supabase
      .from('enrollments')
      .select('student_id')
      .in('section_id', [sections[0].id, sections[1].id])
      .eq('is_active', true);

    if (enrollErr) {
      console.error('❌ Failed to fetch enrollments:', enrollErr.message);
      process.exit(1);
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('⚠ No active enrollments found for Amir\'s sections. Skipping AI scores.');
    } else {
      const aiScores = [];
      const dayOffsets = [10, 30, 50];

      for (const enrollment of enrollments) {
        const studentId = enrollment.student_id;
        for (const offset of dayOffsets) {
          const d = new Date();
          d.setDate(d.getDate() - offset);
          const dateStr = d.toISOString().split('T')[0];
          // Score between 5.5 and 9.5
          const score = parseFloat((Math.random() * (9.5 - 5.5) + 5.5).toFixed(1));

          aiScores.push({
            student_id: studentId,
            score,
            date: dateStr,
            created_at: d.toISOString(),
            updated_at: d.toISOString()
          });
        }
      }

      // Upsert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < aiScores.length; i += batchSize) {
        const batch = aiScores.slice(i, i + batchSize);
        const { error: aiErr } = await supabase
          .from('ai_scores')
          .upsert(batch, { onConflict: 'student_id,date' });

        if (aiErr) {
          console.error('❌ Failed to upsert AI scores chunk:', aiErr.message);
          process.exit(1);
        }
      }

      console.log(`✅ AI scores seeded for ${enrollments.length} students`);
    }
  } else {
    console.log('⏭️  AI scores already exist, skipping');
  }

  console.log('\n--- STEP 5 — Seed Homework Assignments ---');
  const { count: hwCount, error: hwCountErr } = await supabase
    .from('homework')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', amirTeacher.id);

  if (hwCountErr) {
    console.error('❌ Failed to query homework count:', hwCountErr.message);
    process.exit(1);
  }

  if (hwCount === 0) {
    const assignDateStr = new Date().toISOString().split('T')[0];

    const hw1 = {
      institution_id: institution.id,
      academic_year_id: academicYear.id,
      class_id: sections[0].class_id,
      subject_id: subjects[0].id,
      teacher_id: amirTeacher.id,
      title: 'Chapter Review — Assignment 1',
      description: 'Please review Chapter 1 and answer all questions.',
      assign_date: assignDateStr,
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_marks: 100, // question_count = 10 (since UI estimates total_marks / 10)
      status: 'active',
      difficulty: 'Medium'
    };

    const hw2 = {
      institution_id: institution.id,
      academic_year_id: academicYear.id,
      class_id: sections[1].class_id,
      subject_id: subjects[1].id,
      teacher_id: amirTeacher.id,
      title: 'Problem Set — Assignment 1',
      description: 'Solve the practice problems from Chapter 2.',
      assign_date: assignDateStr,
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_marks: 150, // question_count = 15
      status: 'active',
      difficulty: 'Medium'
    };

    const { error: hwErr } = await supabase
      .from('homework')
      .upsert([hw1, hw2], {
        onConflict: 'institution_id,academic_year_id,class_id,subject_id,title,assign_date'
      });

    if (hwErr) {
      console.error('❌ Failed to seed homework:', hwErr.message);
      process.exit(1);
    }

    console.log('✅ Homework seeded');
  } else {
    console.log('⏭️  Homework already exists, skipping');
  }

  console.log(`
✅ Seed complete for amir@mumbai.com

  teacher_id : ${amirTeacher.id}
  Sections   : ${sections.map(s => s.name).join(', ')}
  Subjects   : ${subjects.map(s => s.name).join(', ')}

  Login as amir@mumbai.com and check:
  → Dashboard shows subject pills
  → Students tab shows class pills with students
  → Homework tab shows 2 assignments
`);

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Uncaught execution error:', err);
  process.exit(1);
});
