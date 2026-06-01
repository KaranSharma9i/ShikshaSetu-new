const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: ws }
  }
);

async function run() {
  const email = 'amir@mumbai.com';
  
  // Log in
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123'
  });
  if (loginError) {
    console.error('Login error:', loginError);
    return;
  }
  console.log('Login successful');

  const sectionId = 'fd0ebee2-33d7-4cd8-a531-3a0f08ffd8c2';
  const classId = 'dcdb3a5a-bf67-4140-bce7-184a0a759758';

  // 1. Exams
  const { data: examsData, error: examsErr } = await supabase
    .from("exams")
    .select("id, total_marks, exam_date")
    .eq("class_id", classId);
  console.log('Exams count =', examsData?.length, 'error =', examsErr);

  const examIds = examsData?.map((e) => e.id) || [];
  if (examIds.length > 0) {
    const { data: erData, error: erErr } = await supabase
      .from("exam_results")
      .select("marks_obtained, exam_id, student_id")
      .in("exam_id", examIds);
    console.log('Exam results count =', erData?.length, 'error =', erErr);
  }

  // 2. Enrollments
  const { data: enrollmentsData } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("section_id", sectionId)
    .eq("is_active", true);
  
  const sIds = enrollmentsData?.map((e) => e.student_id) || [];
  console.log('Students count =', sIds.length);

  if (sIds.length > 0) {
    // 3. AI Scores
    const { data: aiScoresData, error: aiScoresErr } = await supabase
      .from("ai_scores")
      .select("student_id, score, date")
      .in("student_id", sIds);
    console.log('AI scores count =', aiScoresData?.length, 'error =', aiScoresErr);

    // 4. Student Attendance
    const { data: attendanceData, error: attErr } = await supabase
      .from("student_attendance")
      .select("status")
      .in("student_id", sIds);
    console.log('Attendance count =', attendanceData?.length, 'error =', attErr);
  }
}

run().catch(console.error);
