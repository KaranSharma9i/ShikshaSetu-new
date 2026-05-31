import { Client } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in environment variables.");
}

// Yash's actual IDs from Step 1
const YASH_STUDENT_ID = '4fecb7d0-0d04-405e-9b1e-a5e8e1a238df';
const YASH_SECTION_ID = '4ca1a74f-b821-456d-bb86-6c6c94bcb853';
const YASH_CLASS_ID = 'a8ff9f05-d7c7-4cf3-aa52-c20090f2fff5';
const YASH_INSTITUTION_ID = 'c3a96bf6-35f1-4037-9eb0-5200d5869746';
const YASH_ACADEMIC_YEAR_ID = '24653c8d-4fba-4a08-aa6b-b11ab3450a55';

// Subjects
const MATHEMATICS_SUBJECT_ID = '5a96ea8d-ed19-469f-9187-bda80957ec29';
const SCIENCE_SUBJECT_ID = '9aa3765f-490a-49f3-92b3-7eef1c452833';
const ENGLISH_SUBJECT_ID = '827abf11-407a-4fe9-88a9-368074a72741';

// Class subject ID for Mathematics
const MATHEMATICS_CLASS_SUBJECT_ID = '2973d95d-74f0-4164-9bc9-0738fbaa14fb';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function seedExams(client: Client, today: Date) {
  console.log("Checking exams...");
  const dateStr = formatDate(today);
  const countRes = await client.query(
    "SELECT COUNT(*) FROM exams WHERE class_id = $1 AND exam_date >= $2 AND deleted_at IS NULL",
    [YASH_CLASS_ID, dateStr]
  );
  const count = parseInt(countRes.rows[0].count, 10);
  console.log(`Found ${count} upcoming exams.`);

  if (count >= 3) {
    console.log("Upcoming exams count >= 3, skipping exam seeding.");
    return;
  }

  // Calculate first Monday of next month
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const nextMonth = new Date(currentYear, currentMonth + 1, 1);
  while (nextMonth.getDay() !== 1) { // 1 is Monday
    nextMonth.setDate(nextMonth.getDate() + 1);
  }
  const firstMonday = new Date(nextMonth);

  // Exam 1
  const exam1Date = new Date(firstMonday);
  const exam1DateStr = formatDate(exam1Date);

  // Exam 2
  const exam2Date = new Date(firstMonday);
  exam2Date.setDate(exam2Date.getDate() + 3);
  const exam2DateStr = formatDate(exam2Date);

  // Exam 3
  const exam3Date = new Date(firstMonday);
  exam3Date.setDate(exam3Date.getDate() + 6);
  const exam3DateStr = formatDate(exam3Date);

  const examsToInsert = [
    {
      institution_id: YASH_INSTITUTION_ID,
      academic_year_id: YASH_ACADEMIC_YEAR_ID,
      class_id: YASH_CLASS_ID,
      subject_id: MATHEMATICS_SUBJECT_ID,
      exam_name: "Advanced Mathematics",
      exam_type: "term_exam",
      exam_date: exam1DateStr,
      start_time: "09:00:00",
      end_time: "11:00:00",
      total_marks: 100,
      passing_marks: 40,
      venue: "Hall A, Block 2",
      syllabus_file_url: null
    },
    {
      institution_id: YASH_INSTITUTION_ID,
      academic_year_id: YASH_ACADEMIC_YEAR_ID,
      class_id: YASH_CLASS_ID,
      subject_id: SCIENCE_SUBJECT_ID,
      exam_name: "Physics Practical",
      exam_type: "practical",
      exam_date: exam2DateStr,
      start_time: "11:30:00",
      end_time: "13:30:00",
      total_marks: 50,
      passing_marks: 20,
      venue: "Science Lab 1",
      syllabus_file_url: null
    },
    {
      institution_id: YASH_INSTITUTION_ID,
      academic_year_id: YASH_ACADEMIC_YEAR_ID,
      class_id: YASH_CLASS_ID,
      subject_id: ENGLISH_SUBJECT_ID,
      exam_name: "English Literature",
      exam_type: "term_exam",
      exam_date: exam3DateStr,
      start_time: "14:00:00",
      end_time: "16:00:00",
      total_marks: 100,
      passing_marks: 40,
      venue: "Room 304",
      syllabus_file_url: null
    }
  ];

  for (const exam of examsToInsert) {
    const existRes = await client.query(
      "SELECT id FROM exams WHERE class_id = $1 AND exam_name = $2 AND exam_date = $3 AND deleted_at IS NULL",
      [YASH_CLASS_ID, exam.exam_name, exam.exam_date]
    );

    if (existRes.rows.length === 0) {
      console.log(`Inserting exam: ${exam.exam_name} on ${exam.exam_date}`);
      await client.query(
        `INSERT INTO exams (
          institution_id, academic_year_id, class_id, subject_id, 
          exam_name, exam_type, exam_date, start_time, end_time, 
          total_marks, passing_marks, venue, syllabus_file_url, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now())`,
        [
          exam.institution_id, exam.academic_year_id, exam.class_id, exam.subject_id,
          exam.exam_name, exam.exam_type, exam.exam_date, exam.start_time, exam.end_time,
          exam.total_marks, exam.passing_marks, exam.venue, exam.syllabus_file_url
        ]
      );
    } else {
      console.log(`Exam already exists: ${exam.exam_name} on ${exam.exam_date}`);
    }
  }
}

async function seedHolidays(client: Client, today: Date) {
  console.log("Checking holidays...");
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const countRes = await client.query(
    "SELECT COUNT(*) FROM holidays WHERE institution_id = $1 AND date >= $2 AND date <= $3 AND deleted_at IS NULL",
    [YASH_INSTITUTION_ID, formatDate(startOfMonth), formatDate(endOfMonth)]
  );
  const count = parseInt(countRes.rows[0].count, 10);
  console.log(`Found ${count} holidays in current month.`);

  if (count >= 3) {
    console.log("Holidays count >= 3, skipping holiday seeding.");
    return;
  }

  const holidaysToInsert = [
    {
      date: formatDate(new Date(currentYear, currentMonth, 15)),
      name: "Diwali Holiday",
      description: "School closed for Diwali celebrations"
    },
    {
      date: formatDate(new Date(currentYear, currentMonth, 2)),
      name: "Gandhi Jayanti",
      description: "National holiday"
    }
  ];

  for (const holiday of holidaysToInsert) {
    const existRes = await client.query(
      "SELECT id FROM holidays WHERE institution_id = $1 AND date = $2 AND deleted_at IS NULL",
      [YASH_INSTITUTION_ID, holiday.date]
    );

    if (existRes.rows.length === 0) {
      console.log(`Inserting holiday: ${holiday.name} on ${holiday.date}`);
      await client.query(
        "INSERT INTO holidays (institution_id, academic_year_id, date, name, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, now(), now())",
        [YASH_INSTITUTION_ID, YASH_ACADEMIC_YEAR_ID, holiday.date, holiday.name, holiday.description]
      );
    } else {
      console.log(`Holiday already exists: ${holiday.name} on ${holiday.date}`);
    }
  }
}

async function seedLeaves(client: Client, today: Date) {
  console.log("Checking leaves...");
  const countRes = await client.query(
    "SELECT COUNT(*) FROM leaves WHERE student_id = $1 AND academic_year_id = $2 AND status = 'approved' AND deleted_at IS NULL",
    [YASH_STUDENT_ID, YASH_ACADEMIC_YEAR_ID]
  );
  const count = parseInt(countRes.rows[0].count, 10);
  console.log(`Found ${count} approved leaves.`);

  if (count > 0) {
    console.log("Approved leaves exist, skipping leave seeding.");
    return;
  }

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const leaveDateStr = formatDate(new Date(currentYear, currentMonth, 16));

  const leaf = {
    from_date: leaveDateStr,
    to_date: leaveDateStr,
    reason: "Family function",
    status: "approved"
  };

  const existRes = await client.query(
    "SELECT id FROM leaves WHERE student_id = $1 AND from_date = $2 AND deleted_at IS NULL",
    [YASH_STUDENT_ID, leaf.from_date]
  );

  if (existRes.rows.length === 0) {
    console.log(`Inserting leave on ${leaf.from_date}`);
    await client.query(
      "INSERT INTO leaves (student_id, academic_year_id, from_date, to_date, reason, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now())",
      [YASH_STUDENT_ID, YASH_ACADEMIC_YEAR_ID, leaf.from_date, leaf.to_date, leaf.reason, leaf.status]
    );
  } else {
    console.log(`Leave already exists on ${leaf.from_date}`);
  }
}

async function seedAttendance(client: Client, today: Date) {
  console.log("Checking attendance...");
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const countRes = await client.query(
    "SELECT COUNT(*) FROM student_attendance WHERE student_id = $1 AND academic_year_id = $2 AND date >= $3 AND date <= $4",
    [YASH_STUDENT_ID, YASH_ACADEMIC_YEAR_ID, formatDate(startOfMonth), formatDate(endOfMonth)]
  );
  const count = parseInt(countRes.rows[0].count, 10);
  console.log(`Found ${count} attendance records in current month.`);

  if (count >= 10) {
    console.log("Attendance count >= 10, skipping attendance seeding.");
    return;
  }

  // Generate weekdays up to today
  const weekdays: string[] = [];
  for (let d = 1; d <= today.getDate(); d++) {
    const date = new Date(currentYear, currentMonth, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Mon-Fri
      weekdays.push(formatDate(date));
    }
  }

  console.log(`Generating attendance for ${weekdays.length} weekdays.`);
  const absentIndices: number[] = [];
  if (weekdays.length > 3) absentIndices.push(3);
  if (weekdays.length > 10) absentIndices.push(10);

  for (let i = 0; i < weekdays.length; i++) {
    const dateStr = weekdays[i];
    const status = absentIndices.includes(i) ? 'absent' : 'present';

    const existRes = await client.query(
      "SELECT id FROM student_attendance WHERE student_id = $1 AND date = $2",
      [YASH_STUDENT_ID, dateStr]
    );

    if (existRes.rows.length === 0) {
      console.log(`Inserting attendance for ${dateStr} status ${status}`);
      await client.query(
        "INSERT INTO student_attendance (student_id, class_subject_id, academic_year_id, date, status, remarks, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now())",
        [
          YASH_STUDENT_ID,
          MATHEMATICS_CLASS_SUBJECT_ID,
          YASH_ACADEMIC_YEAR_ID,
          dateStr,
          status,
          status === 'absent' ? 'Unexcused absence' : 'Regular attendance'
        ]
      );
    }
  }
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    const today = new Date();
    console.log(`Starting seeding relative to today: ${formatDate(today)}`);

    await seedExams(client, today);
    await seedHolidays(client, today);
    await seedLeaves(client, today);
    await seedAttendance(client, today);

    console.log("Seeding process completed successfully.");
  } catch (err: any) {
    console.error("Error during seeding:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
