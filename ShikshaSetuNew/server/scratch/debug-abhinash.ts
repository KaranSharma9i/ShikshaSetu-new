import "../config";
import { supabase } from "../config";

async function run() {
  // 1. Find user by name
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, full_name")
    .ilike("full_name", "%Abhinash%");

  if (userError) {
    console.error("Error finding user:", userError);
    return;
  }

  console.log("Users found:", users);
  if (!users || users.length === 0) {
    return;
  }

  // 2. Find students by user_id
  const userIds = users.map(u => u.id);
  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("id, user_id")
    .in("user_id", userIds);

  if (studentError) {
    console.error("Error finding student:", studentError);
    return;
  }

  console.log("Students found:", students);
  if (!students || students.length === 0) {
    return;
  }

  const student = students[0];
  const studentId = student.id;

  // 3. Find submissions for this student
  const { data: submissions, error: subError } = await supabase
    .from("homework_submissions")
    .select(`
      id,
      homework_id,
      marks_obtained,
      ai_score,
      status,
      deleted_at,
      homework:homework (
        id,
        title,
        total_marks
      )
    `)
    .eq("student_id", studentId);

  if (subError) {
    console.error("Error finding submissions:", subError);
    return;
  }

  console.log(`\nSubmissions for Student ID ${studentId}:`);
  submissions?.forEach((sub: any) => {
    console.log(`- Submission ID: ${sub.id}`);
    console.log(`  Homework ID: ${sub.homework_id}`);
    console.log(`  Title: ${sub.homework?.title}`);
    console.log(`  Marks Obtained: ${sub.marks_obtained}`);
    console.log(`  AI Score: ${sub.ai_score}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Deleted At: ${sub.deleted_at}`);
    console.log(`  Total Marks: ${sub.homework?.total_marks}`);
  });
}

run();
