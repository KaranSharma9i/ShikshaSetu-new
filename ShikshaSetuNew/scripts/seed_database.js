// WARNING: This script TRUNCATES all data. 
// Only run on empty databases.
// Never run in production or when real data exists.

const { Client } = require('pg');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const DATABASE_URL = process.env.DATABASE_URL;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

// --- CONSTANTS FROM SPEC ---
const SURNAMES = ['Sharma','Gupta','Singh','Yadav','Verma','Mishra','Tiwari','Pandey','Dubey','Shukla','Srivastava','Patel','Bajpai','Tripathi','Saxena','Dwivedi','Dixit','Kushwaha','Chauhan','Agarwal'];
const MALE_FIRST = ['Ram','Shiv','Hari','Suresh','Dinesh','Rakesh','Mahesh','Naresh','Mukesh','Umesh','Ganesh','Rajesh','Santosh','Arvind','Vinod','Anil','Sunil','Pawan','Rohit','Deepak'];
const FEMALE_FIRST = ['Sunita','Meena','Rekha','Savita','Anita','Kavita','Geeta','Pushpa','Lalita','Sudha','Renu','Saroj','Mamta','Pooja','Shanti','Kiran','Neha','Usha','Seema','Sita'];

const STU_SURNAMES = ['Sharma','Gupta','Singh','Yadav','Verma','Mishra','Tiwari','Pandey','Dubey','Shukla','Srivastava','Patel','Bajpai','Tripathi','Saxena','Dwivedi','Dixit','Kushwaha','Chauhan','Agarwal','Nishad','Maurya','Lodhi','Rajput','Jatav','Rawat'];
const STU_MALE_FIRST = ['Aarav','Arjun','Vivaan','Aditya','Vihaan','Sai','Ansh','Dhruv','Kabir','Rishi','Harsh','Nikhil','Yash','Ayaan','Pranav','Shubham','Akash','Sumit','Rishabh','Kartik','Tushar','Mohit','Rohan','Gaurav','Siddharth','Naman','Abhishek','Varun','Rahul','Dev'];
const STU_FEMALE_FIRST = ['Aanya','Diya','Isha','Kavya','Priya','Ananya','Riya','Siya','Shruti','Neha','Pooja','Sneha','Sakshi','Divya','Anjali','Swati','Muskan','Khushi','Palak','Nidhi','Komal','Simran','Mansi','Deepika','Prachi','Tanvi','Shreya','Aakanksha','Ritu','Garima'];
const GUARDIAN_FIRST = ['Ramesh','Suresh','Dinesh','Rakesh','Mahesh','Rajesh','Santosh','Vinod','Anil','Mukesh','Harish','Umesh','Ganesh','Ashok','Arvind','Pankaj','Sanjay','Ajay','Vijay','Manoj','Deepak','Naresh','Pramod','Shailesh','Rohit','Amit','Sunil','Akhilesh','Girish','Hemant'];
const VILLAGES = ['Auraiya', 'Achhalda', 'Bidhuna', 'Rasulabad', 'Ajitmal', 'Dibiyapur', 'Phaphund', 'Saurikh'];
const BLOOD_GROUPS = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];

// Roll number class code helper
// Nursery -> 'N', LKG -> 'LKG', UKG -> 'UKG', Class 1 -> '1', Class 12 -> '12'
function getClassCode(className) {
  if (className === 'Nursery') return 'N';
  if (className === 'LKG') return 'LKG';
  if (className === 'UKG') return 'UKG';
  // 'Class X' -> 'X'
  return className.replace('Class ', '');
}

async function seed() {
  console.log('Running safety checks...');
  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  const { data: authData } = await supabase.auth.admin.listUsers();
  const authCount = authData?.users?.length ?? 0;

  if (studentCount > 0 || authCount > 0) {
    console.error('SAFETY: Database has real data. Aborting seed to prevent data loss.');
    console.error(`Students: ${studentCount}, Auth users: ${authCount}`);
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Clean auth.users first
    console.log('Cleaning auth.users...');
    await client.query('DELETE FROM auth.users;');

    await client.query('BEGIN');
    console.log('Transaction started...');

    console.log('Truncating all tables for a fresh start...');
    const tablesToTruncate = [
      'circulars', 'holidays', 'exam_results', 'exams',
      'student_transport_assignments', 'transport_drivers', 'transport_vehicles', 'transport_routes',
      'fee_payments', 'fee_structures',
      'enrollments', 'students', 'timetable', 'class_subjects', 'sections',
      'teachers', 'users', 'subjects', 'classes', 'academic_years', 'institutions'
    ];
    for (const table of tablesToTruncate) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE;`);
    }

    // 1. Institutions
    const instRes = await client.query(`
      INSERT INTO institutions (name, code, address, city, state, pincode, phone, email, logo_url, status, subscription_ends_at)
      VALUES ('Gurukul Shikshalaya', 'GS-AUR-001', 'Civil Lines, Near Collectorate, Auraiya', 'Auraiya', 'Uttar Pradesh', '206122', '+91-5683-220101', 'info@gurukulsiksha.edu.in', 'https://assets.margam.app/demo/gurukul-logo.png', 'active', '2026-03-31 00:00:00+05:30')
      RETURNING id;
    `);
    const institutionId = instRes.rows[0].id;
    console.log('Institution seeded.');

    // 2. Academic Year
    const ayRes = await client.query(`
      INSERT INTO academic_years (institution_id, label, starts_on, ends_on, is_current)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `, [institutionId, '2025-26', '2025-04-01', '2026-03-31', true]);
    const academicYearId = ayRes.rows[0].id;
    console.log('Academic year seeded.');

    // 3. Classes — grade_number 1–15 (constraint updated in migration)
    const classData = [
      ['Nursery', 1], ['LKG', 2], ['UKG', 3], ['Class 1', 4], ['Class 2', 5],
      ['Class 3', 6], ['Class 4', 7], ['Class 5', 8], ['Class 6', 9], ['Class 7', 10],
      ['Class 8', 11], ['Class 9', 12], ['Class 10', 13], ['Class 11', 14], ['Class 12', 15]
    ];
    const classIdMap = {};
    for (const [name, grade] of classData) {
      const res = await client.query(
        `INSERT INTO classes (institution_id, name, grade_number) VALUES ($1, $2, $3) RETURNING id;`,
        [institutionId, name, grade]
      );
      classIdMap[name] = res.rows[0].id;
    }
    console.log('Classes seeded.');

    // 4. Subjects
    const subjectsData = [
      ['English Rhymes & Reading', 'PP-ENG'], ['Hindi Varnamala', 'PP-HIN'], ['Number Fun (Maths)', 'PP-MAT'],
      ['General Awareness', 'PP-GK'], ['Art & Craft', 'ART'], ['Physical Activity', 'PA'],
      ['English', 'ENG'], ['Hindi', 'HIN'], ['Mathematics', 'MAT'], ['Environmental Studies', 'EVS'],
      ['General Knowledge', 'GK'], ['Computer Science', 'CS'], ['Physical Education', 'PE'],
      ['Science', 'SCI'], ['Social Science', 'SST'], ['Sanskrit', 'SAN'],
      ['Physics', 'PHY'], ['Chemistry', 'CHE'], ['Biology', 'BIO'], ['History & Civics', 'HIS'], ['Geography', 'GEO'],
      ['Physics (Sr.)', 'PHY-SR'], ['Chemistry (Sr.)', 'CHE-SR'], ['Biology (Sr.)', 'BIO-SR'],
      ['Mathematics (Sr.)', 'MAT-SR'], ['English Core', 'ENG-CORE'], ['Informatics Practices', 'IP'],
      ['Accountancy', 'ACC'], ['Business Studies', 'BST'], ['Economics', 'ECO']
    ];
    const subjectIdMap = {};
    for (const [name, code] of subjectsData) {
      const res = await client.query(
        `INSERT INTO subjects (institution_id, name, code) VALUES ($1, $2, $3) RETURNING id;`,
        [institutionId, name, code]
      );
      subjectIdMap[code] = res.rows[0].id;
    }
    console.log('Subjects seeded.');

    // 5. Users — Non-teaching staff (Institution Admin)
    for (let sr = 1; sr <= 70; sr++) {
      let fullName;
      if (sr === 1) fullName = 'Dr. Shyam Sundar Pandey';
      else if (sr === 2) fullName = 'Smt. Usha Rani Sharma';
      else if (sr === 3) fullName = 'Shri Arvind Kumar Mishra';
      else {
        const gender = sr % 2 === 0 ? 'male' : 'female';
        const first = gender === 'male' ? MALE_FIRST[Math.floor(sr / 2) % 20] : FEMALE_FIRST[Math.floor(sr / 2) % 20];
        const surname = SURNAMES[sr % 20];
        fullName = `${first} ${surname}`;
      }
await client.query(`
  INSERT INTO users (login_id, full_name, email, phone, role, status, institution_id)
  VALUES ($1, $2, $3, $4, 'institution_admin', 'active', $5)
`, [`GS-ADM-${String(sr).padStart(3, '0')}`, fullName, `adm${sr}@gurukulsiksha.edu.in`, `+91-98970-${String(sr).padStart(5, '0')}`, institutionId]);
    }
    console.log('Non-teaching staff seeded.');

    // 6 & 7. Users (Teachers) and Teacher Profiles
    const teachersData = [
      ['Ramesh Kumar Sharma', 'male', 'Mathematics', 'M.Sc., B.Ed.'],
      ['Sunita Devi Gupta', 'female', 'Hindi', 'M.A. Hindi, B.Ed.'],
      ['Ajay Pratap Singh', 'male', 'Science (Middle)', 'M.Sc. Physics, B.Ed.'],
      ['Meena Rani Mishra', 'female', 'English', 'M.A. English, B.Ed.'],
      ['Vinod Kumar Tiwari', 'male', 'Social Science', 'M.A. History, B.Ed.'],
      ['Rekha Devi Verma', 'female', 'Mathematics', 'M.Sc. Maths, B.Ed.'],
      ['Santosh Kumar Yadav', 'male', 'Physical Education', 'M.P.Ed.'],
      ['Priya Pandey', 'female', 'Sanskrit', 'M.A. Sanskrit, B.Ed.'],
      ['Rajesh Nath Dubey', 'male', 'Physics', 'M.Sc. Physics, B.Ed.'],
      ['Savita Singh Chauhan', 'female', 'Chemistry', 'M.Sc. Chemistry, B.Ed.'],
      ['Dinesh Kumar Awasthi', 'male', 'Biology', 'M.Sc. Biology, B.Ed.'],
      ['Anita Kumari Srivastava', 'female', 'Computer Science', 'MCA, B.Ed.'],
      ['Manoj Kumar Patel', 'male', 'History & Civics', 'M.A. History, B.Ed.'],
      ['Kavita Rani Shukla', 'female', 'Geography', 'M.A. Geography, B.Ed.'],
      ['Suresh Chandra Bajpai', 'male', 'Mathematics (Sr.)', 'M.Sc. Maths, M.Ed.'],
      ['Lalita Devi Tripathi', 'female', 'English Core', 'M.A. English, M.Ed.'],
      ['Harish Kumar Saxena', 'male', 'Accountancy', 'M.Com., B.Ed.'],
      ['Pushpa Singh', 'female', 'Business Studies', 'MBA, B.Ed.'],
      ['Umesh Kumar Dwivedi', 'male', 'Economics', 'M.A. Economics, B.Ed.'],
      ['Geeta Rani Agarwal', 'female', 'Hindi', 'M.A. Hindi, B.Ed.'],
      ['Rajeev Ranjan Mishra', 'male', 'Physics (Sr.)', 'M.Sc. Physics, M.Ed.'],
      ['Sudha Devi Pandey', 'female', 'Chemistry (Sr.)', 'M.Sc. Chemistry, M.Ed.'],
      ['Ashok Kumar Dixit', 'male', 'EVS / General Science', 'M.Sc. Env. Science, B.Ed.'],
      ['Neha Tripathi', 'female', 'Art & Craft', 'B.F.A., B.Ed.'],
      ['Sanjay Kumar Singh', 'male', 'Computer Science (Sr.)', 'M.Tech. CS'],
      ['Renu Yadav', 'female', 'Mathematics (Primary)', 'B.Sc., B.Ed.'],
      ['Pankaj Kumar Shukla', 'male', 'English (Primary)', 'M.A. English, B.Ed.'],
      ['Saroj Devi Kushwaha', 'female', 'Social Science', 'M.A. Pol. Science, B.Ed.'],
      ['Devendra Pratap Rao', 'male', 'Biology (Sr.)', 'M.Sc. Zoology, M.Ed.'],
      ['Mamta Agarwal', 'female', 'Informatics Practices', 'B.Tech. IT, B.Ed.']
    ];

    const teacherLoginIdMap = {}; // loginId -> userId

    for (let i = 0; i < teachersData.length; i++) {
      const [name, gender, spec, qual] = teachersData[i];
      const sr = i + 1;
      const loginId = `GS-TCH-${String(sr).padStart(3, '0')}`;
      const empCode = `TCH${String(sr).padStart(3, '0')}`;

      // date_of_joining: TCH001 = 2010-06-01, increment 4 months per teacher
      const baseDate = new Date('2010-06-01');
      baseDate.setMonth(baseDate.getMonth() + (sr - 1) * 4);
      const doj = baseDate.toISOString().slice(0, 10);

      const uRes = await client.query(`
        INSERT INTO users (login_id, full_name, email, phone, role, status, institution_id)
VALUES ($1, $2, $3, $4, 'teacher', 'active', $5)
RETURNING id;
`, [loginId, name, `tch${sr}@gurukulsiksha.edu.in`, `+91-94150-${String(sr).padStart(5, '0')}`, institutionId]);
      const userId = uRes.rows[0].id;

      await client.query(`
        INSERT INTO teachers (user_id, employee_code, specialization, qualification, gender, date_of_joining, emergency_contact, address, institution_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `, [userId, empCode, spec, qual, gender, doj, `+91-94150-${String(sr + 100).padStart(5, '0')}`, 'Auraiya, Uttar Pradesh', institutionId]);

      teacherLoginIdMap[loginId] = userId;
    }
    console.log('Teachers seeded.');

    // 8. Sections
    const sectionLayout = [
      { class: 'Nursery',  secs: ['A'] },
      { class: 'LKG',      secs: ['A'] },
      { class: 'UKG',      secs: ['A', 'B'] },
      { class: 'Class 1',  secs: ['A', 'B'] },
      { class: 'Class 2',  secs: ['A', 'B'] },
      { class: 'Class 3',  secs: ['A', 'B'] },
      { class: 'Class 4',  secs: ['A', 'B'] },
      { class: 'Class 5',  secs: ['A', 'B'] },
      { class: 'Class 6',  secs: ['A', 'B'] },
      { class: 'Class 7',  secs: ['A', 'B'] },
      { class: 'Class 8',  secs: ['A', 'B'] },
      { class: 'Class 9',  secs: ['A', 'B', 'C'] },
      { class: 'Class 10', secs: ['A', 'B', 'C'] },
      { class: 'Class 11', secs: ['A', 'B', 'C', 'D'] },
      { class: 'Class 12', secs: ['A', 'B', 'C', 'D'] },
    ];
    const classTeacherMap = {
      'Nursery-A': 'GS-TCH-024', 'LKG-A': 'GS-TCH-026', 'UKG-A': 'GS-TCH-027', 'UKG-B': 'GS-TCH-023',
      'Class 1-A': 'GS-TCH-004', 'Class 1-B': 'GS-TCH-020', 'Class 2-A': 'GS-TCH-002', 'Class 2-B': 'GS-TCH-028',
      'Class 3-A': 'GS-TCH-008', 'Class 3-B': 'GS-TCH-016', 'Class 4-A': 'GS-TCH-006', 'Class 4-B': 'GS-TCH-026',
      'Class 5-A': 'GS-TCH-027', 'Class 5-B': 'GS-TCH-023', 'Class 6-A': 'GS-TCH-003', 'Class 6-B': 'GS-TCH-005',
      'Class 7-A': 'GS-TCH-012', 'Class 7-B': 'GS-TCH-028', 'Class 8-A': 'GS-TCH-001', 'Class 8-B': 'GS-TCH-013',
      'Class 9-A': 'GS-TCH-009', 'Class 9-B': 'GS-TCH-010', 'Class 9-C': 'GS-TCH-011', 'Class 10-A': 'GS-TCH-014',
      'Class 10-B': 'GS-TCH-019', 'Class 10-C': 'GS-TCH-025', 'Class 11-A': 'GS-TCH-021', 'Class 11-B': 'GS-TCH-022',
      'Class 11-C': 'GS-TCH-017', 'Class 11-D': 'GS-TCH-018', 'Class 12-A': 'GS-TCH-015', 'Class 12-B': 'GS-TCH-029',
      'Class 12-C': 'GS-TCH-030', 'Class 12-D': 'GS-TCH-007',
    };
    const sectionIdMap = {};        // 'Class 9-A' -> sectionId
    const sectionClassIdMap = {};   // sectionId   -> classId
    for (const item of sectionLayout) {
      for (const secName of item.secs) {
        const key = `${item.class}-${secName}`;
        const teacherLoginId = classTeacherMap[key];
        const teacherId = teacherLoginIdMap[teacherLoginId];
        const res = await client.query(`
          INSERT INTO sections (class_id, academic_year_id, name, capacity, class_teacher_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id;
        `, [classIdMap[item.class], academicYearId, secName, 60, teacherId]);
        sectionIdMap[key] = res.rows[0].id;
        sectionClassIdMap[res.rows[0].id] = classIdMap[item.class];
      }
    }
    console.log('Sections seeded.');

    // 9. Class Subjects
    const mapping = [
      { group: ['Nursery', 'LKG', 'UKG'],                                subjects: ['PP-ENG', 'PP-HIN', 'PP-MAT', 'PP-GK', 'ART', 'PA'] },
      { group: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'], subjects: ['ENG', 'HIN', 'MAT', 'EVS', 'GK', 'CS', 'ART', 'PE'] },
      { group: ['Class 6', 'Class 7', 'Class 8'],                        subjects: ['ENG', 'HIN', 'MAT', 'SCI', 'SST', 'SAN', 'CS', 'PE'] },
      { group: ['Class 9', 'Class 10'],                                   subjects: ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'HIS', 'GEO', 'CS', 'PE'] },
      { group: ['Class 11', 'Class 12'], science: ['PHY-SR', 'CHE-SR', 'BIO-SR', 'MAT-SR', 'ENG-CORE', 'IP'], commerce: ['ACC', 'BST', 'ECO', 'MAT-SR', 'ENG-CORE'] }
    ];
    for (const entry of mapping) {
      for (const className of entry.group) {
        const sections = sectionLayout.find(s => s.class === className).secs;
        for (const secName of sections) {
          const secKey = `${className}-${secName}`;
          const secId = sectionIdMap[secKey];
          let subs = entry.subjects || [];
          if (entry.science && entry.commerce) {
            subs = ['A', 'B'].includes(secName) ? entry.science : entry.commerce;
          }
          for (const subCode of subs) {
            await client.query(
              `INSERT INTO class_subjects (section_id, subject_id, academic_year_id, max_marks) VALUES ($1, $2, $3, 100);`,
              [secId, subjectIdMap[subCode], academicYearId]
            );
          }
        }
      }
    }
    console.log('Class Subjects seeded.');

    // 10. Timetable — same slot pattern applied to all sections (only slots that the section teaches)
    const ttPattern = [
      { day: 'Monday',    slots: ['PHY', 'CHE', 'ENG', 'MAT', 'HIN', 'BIO'] },
      { day: 'Tuesday',   slots: ['MAT', 'PHY', 'HIN', 'CS',  'GEO', 'ENG'] },
      { day: 'Wednesday', slots: ['CHE', 'BIO', 'MAT', 'HIS', 'PHY', 'CS']  },
      { day: 'Thursday',  slots: ['ENG', 'MAT', 'GEO', 'PHY', 'CHE', 'HIN'] },
      { day: 'Friday',    slots: ['HIN', 'HIS', 'ENG', 'BIO', 'MAT', 'PE']  },
      { day: 'Saturday',  slots: ['PHY', 'CHE', 'MAT', 'ENG', null,  null]  },
    ];
    const slotTimes = [
      { start: '08:00', end: '08:45' }, { start: '08:50', end: '09:35' }, { start: '09:40', end: '10:25' },
      { start: '10:40', end: '11:25' }, { start: '11:30', end: '12:15' }, { start: '12:20', end: '13:05' }
    ];
    for (const secKey in sectionIdMap) {
      const secId = sectionIdMap[secKey];
      for (let d = 0; d < ttPattern.length; d++) {
        const day = ttPattern[d].day.toLowerCase();
        for (let p = 0; p < 6; p++) {
          const subCode = ttPattern[d].slots[p];
          if (subCode) {
            const subId = subjectIdMap[subCode];
            if (subId) {
              const csRes = await client.query(
                `SELECT id FROM class_subjects WHERE section_id = $1 AND subject_id = $2`,
                [secId, subId]
              );
              const csId = csRes.rows[0]?.id;
              if (csId) {
                await client.query(
                  `INSERT INTO timetable (section_id, class_subject_id, day, period_number, starts_at, ends_at, academic_year_id) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
                  [secId, csId, day, p + 1, slotTimes[p].start, slotTimes[p].end, academicYearId]
                );
              }
            }
          }
        }
      }
    }
    console.log('Timetable seeded.');

    // 11 & 12. Students
    const studentDist = [
      { class: 'Nursery',  secs: ['A'],            count: 30 },
      { class: 'LKG',      secs: ['A'],             count: 35 },
      { class: 'UKG',      secs: ['A', 'B'],        count: 35 },
      { class: 'Class 1',  secs: ['A', 'B'],        count: 50 },
      { class: 'Class 2',  secs: ['A', 'B'],        count: 50 },
      { class: 'Class 3',  secs: ['A', 'B'],        count: 50 },
      { class: 'Class 4',  secs: ['A', 'B'],        count: 50 },
      { class: 'Class 5',  secs: ['A', 'B'],        count: 48 },
      { class: 'Class 6',  secs: ['A', 'B'],        count: 45 },
      { class: 'Class 7',  secs: ['A', 'B'],        count: 45 },
      { class: 'Class 8',  secs: ['A', 'B'],        count: 44 },
      { class: 'Class 9',  secs: ['A', 'B', 'C'],   count: 42 },
      { class: 'Class 10', secs: ['A', 'B', 'C'],   count: 42 },
      { class: 'Class 11', secs: ['A', 'B', 'C', 'D'], count: 36 },
      { class: 'Class 12', secs: ['A', 'B', 'C', 'D'], count: 26 },
    ];

    let totalStudentsCreated = 0;
    const allStudentIds = []; // { userId, studentId, secId, srInSec, className, secName, village }

    for (const entry of studentDist) {
      const gradeNum = classData.find(c => c[0] === entry.class)[1];
      // Nursery (grade 1) -> DOB year 2021; Class 12 (grade 15) -> DOB year 2009
      const dobYear = 2022 - gradeNum;

      for (const secName of entry.secs) {
        const secKey = `${entry.class}-${secName}`;
        const secId = sectionIdMap[secKey];

        // FIX: last section of Class 12-D gets the remainder to reach exactly 1400
        let count = entry.count;
        if (entry.class === 'Class 12' && secName === 'D') {
          count = 1400 - totalStudentsCreated;
          if (count < 0) count = 0;
        }

        for (let i = 1; i <= count; i++) {
          totalStudentsCreated++;
          const sr = totalStudentsCreated;
          const surname = STU_SURNAMES[(sr - 1) % 26];
          const gender = sr % 2 === 1 ? 'male' : 'female';
          const first = gender === 'male'
            ? STU_MALE_FIRST[Math.floor((sr - 1) / 2) % 30]
            : STU_FEMALE_FIRST[Math.floor((sr - 1) / 2) % 30];
          const guardianFirst = GUARDIAN_FIRST[(sr - 1) % 30];
          const village = VILLAGES[(sr - 1) % 8];

          const uRes = await client.query(`
            INSERT INTO users (login_id, full_name, email, phone, role, status, institution_id)
VALUES ($1, $2, $3, $4, 'student', 'active', $5)
            RETURNING id;
          `, [
            `GS-STU-${String(sr).padStart(4, '0')}`,
            `${first} ${surname}`,
            `stu${sr}@gurukulsiksha.edu.in`,
            `+91-9795${String(sr).padStart(6, '0')}`,
            institutionId
          ]);
          const userId = uRes.rows[0].id;

          const dob = `${dobYear}-${String((sr % 12) + 1).padStart(2, '0')}-${String((sr % 28) + 1).padStart(2, '0')}`;

          const sRes = await client.query(`
            INSERT INTO students (user_id, student_code, guardian_name, date_of_birth, gender, blood_group, address, admission_date, guardian_phone, institution_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id;
          `, [
            userId,
            `STU${String(sr).padStart(4, '0')}`,
            `${guardianFirst} ${surname}`,
            dob,
            gender,
            BLOOD_GROUPS[sr % 8],
            village,
            '2025-04-05',
            `+91-9795${String(sr).padStart(6, '0')}`,
            institutionId
          ]);
          const studentId = sRes.rows[0].id;
          allStudentIds.push({ userId, studentId, secId, srInSec: i, className: entry.class, secName, village });
        }
      }
    }
    console.log(`Students seeded: ${totalStudentsCreated} rows.`);

    // 13. Enrollments
    // Roll number format: <classCode><section>-<padded position>
    // e.g. 1A-01, 9C-03, N-A-05 (Nursery), LKG-A-01, UKG-A-01
    for (const s of allStudentIds) {
      const code = getClassCode(s.className);
      // Pre-primary classes use a dash between code and section: N-A-01, LKG-A-01, UKG-A-01
      // Standard classes: 1A-01, 9C-03
      const roll = (s.className === 'Nursery' || s.className === 'LKG' || s.className === 'UKG')
        ? `${code}-${s.secName}-${String(s.srInSec).padStart(2, '0')}`
        : `${code}${s.secName}-${String(s.srInSec).padStart(2, '0')}`;

      await client.query(
        `INSERT INTO enrollments (student_id, section_id, academic_year_id, enrolled_on, is_active, roll_number) VALUES ($1, $2, $3, $4, TRUE, $5);`,
        [s.studentId, s.secId, academicYearId, '2025-04-05', roll]
      );
    }
    console.log('Enrollments seeded.');

    // 14. Fee Structures
    const groupFees = [
      { classes: ['Nursery', 'LKG', 'UKG'],
        fees: { 'Tuition Fee': 8000, 'Development Fund': 1000, 'Library Fee': 300, 'Examination Fee': 500, 'Sports Fee': 300, 'Transport Fee': 5000 } },
      { classes: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
        fees: { 'Tuition Fee': 12000, 'Development Fund': 2000, 'Computer Lab Fee': 1500, 'Library Fee': 500, 'Examination Fee': 1000, 'Sports Fee': 500, 'Transport Fee': 6000 } },
      { classes: ['Class 6', 'Class 7', 'Class 8'],
        fees: { 'Tuition Fee': 15000, 'Development Fund': 2500, 'Computer Lab Fee': 2000, 'Library Fee': 500, 'Examination Fee': 1200, 'Sports Fee': 600, 'Transport Fee': 6000 } },
      { classes: ['Class 9', 'Class 10'],
        fees: { 'Tuition Fee': 18000, 'Development Fund': 3000, 'Computer Lab Fee': 2500, 'Library Fee': 600, 'Examination Fee': 1500, 'Sports Fee': 600, 'Transport Fee': 6000 } },
      { classes: ['Class 11', 'Class 12'],
        fees: { 'Tuition Fee': 22000, 'Development Fund': 3500, 'Computer Lab Fee': 3000, 'Library Fee': 700, 'Examination Fee': 2000, 'Sports Fee': 700, 'Transport Fee': 6000 } },
    ];
    for (const group of groupFees) {
      for (const className of group.classes) {
        for (const [feeName, amount] of Object.entries(group.fees)) {
          // FIX: Added ON CONFLICT DO NOTHING — fee_structures has UNIQUE(institution_id, academic_year_id, class_id, fee_name)
          await client.query(
            `INSERT INTO fee_structures (institution_id, academic_year_id, class_id, fee_name, amount, due_date) VALUES ($1, $2, $3, $4, $5, '2025-04-30') ON CONFLICT DO NOTHING;`,
            [institutionId, academicYearId, classIdMap[className], feeName, amount]
          );
        }
      }
    }
    console.log('Fee Structures seeded.');

    // ─────────────────────────────────────────────────────────────
    // 18–21. TRANSPORT — correct FK dependency order:
    //   1. users (role='driver')
    //   2. transport_routes
    //   3. transport_vehicles  (route_id NOT NULL)
    //   4. transport_drivers   (vehicle_id)
    //   5. student_transport_assignments
    // ─────────────────────────────────────────────────────────────

    // 18. Driver Users
    const driversData = [
      ['Ramu Prasad Nishad',   '+91-9453101001', 'UP76-2018-0012345', '2028-06-30'],
      ['Chhote Lal Yadav',     '+91-9453101002', 'UP76-2016-0056789', '2026-11-15'],
      ['Sonu Kumar Lodhi',     '+91-9453101003', 'UP76-2019-0098765', '2029-03-20'],
      ['Kallu Singh Rawat',    '+91-9453101004', 'UP76-2015-0043210', '2025-09-10'],
      ['Babulal Maurya',       '+91-9453101005', 'UP76-2020-0067890', '2030-01-05'],
      ['Sukhdev Prajapati',    '+91-9453101006', 'UP76-2017-0034567', '2027-08-22'],
    ];
    // Will be populated in order: driverUserIds[i] corresponds to driversData[i]
    const driverUserIds = [];

    for (let i = 0; i < driversData.length; i++) {
      const [name, phone] = driversData[i];
      const sr = i + 1;
      const uRes = await client.query(`
        INSERT INTO users (login_id, full_name, email, phone, role, status, institution_id)
VALUES ($1, $2, $3, $4, 'driver', 'active', $5)
        RETURNING id;
      `, [
        `GS-DRV-${String(sr).padStart(3, '0')}`,
        name,
        `drv${sr}@gurukulsiksha.edu.in`,
        phone,
        institutionId
      ]);
      driverUserIds.push(uRes.rows[0].id);
    }
    console.log('Driver users seeded.');

    // 19. Transport Routes (must exist before vehicles)
    // Map of route name -> { vehicle reg, driver index }
    const routesData = [
      { name: 'Route A - North Zone', start: 'Dibiyapur',   end: 'School', distance: 12, vehicleReg: 'UP76-AB-1234', driverIdx: 0 },
      { name: 'Route B - South Zone', start: 'Ajitmal',     end: 'School', distance: 15, vehicleReg: 'UP76-AB-5678', driverIdx: 1 },
      { name: 'Route C - East Zone',  start: 'Achhalda',    end: 'School', distance: 10, vehicleReg: 'UP76-CD-2341', driverIdx: 2 },
      { name: 'Route D - West Zone',  start: 'Bidhuna',     end: 'School', distance: 18, vehicleReg: 'UP76-CD-6782', driverIdx: 3 },
      { name: 'Route E - City Zone',  start: 'Sadar Bazar', end: 'School', distance: 5,  vehicleReg: 'UP76-EF-4321', driverIdx: 4 },
      { name: 'Route F - Rural Zone', start: 'Saurikh',     end: 'School', distance: 22, vehicleReg: 'UP76-EF-8765', driverIdx: 5 },
    ];
    const routeIdMap = {}; // route name -> routeId

    for (const r of routesData) {
      const res = await client.query(`
        INSERT INTO transport_routes (institution_id, name, start_location, end_location, distance)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `, [institutionId, r.name, r.start, r.end, r.distance]);
      routeIdMap[r.name] = res.rows[0].id;
    }
    console.log('Transport routes seeded.');

    // 20. Vehicles — route_id NOT NULL, so must seed after routes
    const vehiclesData = [
      { reg: 'UP76-AB-1234', model: 'Tata Starbus 52',        cap: 52, status: 'active',      insExp: '2026-03-31', fitExp: '2026-01-15', routeName: 'Route A - North Zone' },
      { reg: 'UP76-AB-5678', model: 'Tata Starbus 52',        cap: 52, status: 'active',      insExp: '2026-03-31', fitExp: '2026-01-15', routeName: 'Route B - South Zone' },
      { reg: 'UP76-CD-2341', model: 'Ashok Leyland Lynx 40',  cap: 40, status: 'active',      insExp: '2025-12-31', fitExp: '2025-10-20', routeName: 'Route C - East Zone'  },
      { reg: 'UP76-CD-6782', model: 'Ashok Leyland Lynx 40',  cap: 40, status: 'active',      insExp: '2026-03-31', fitExp: '2026-02-10', routeName: 'Route D - West Zone'  },
      { reg: 'UP76-EF-4321', model: 'Force Traveller 26',     cap: 26, status: 'active',      insExp: '2026-06-30', fitExp: '2026-04-05', routeName: 'Route E - City Zone'  },
      { reg: 'UP76-EF-8765', model: 'Force Traveller 26',     cap: 26, status: 'maintenance', insExp: '2025-11-30', fitExp: '2025-09-01', routeName: 'Route F - Rural Zone' },
    ];
    const vehicleIdMap = {}; // vehicle_number -> vehicleId

    for (const v of vehiclesData) {
      const routeId = routeIdMap[v.routeName];
      const res = await client.query(`
        INSERT INTO transport_vehicles (institution_id, route_id, vehicle_number, vehicle_type, capacity)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `, [institutionId, routeId, v.reg, v.model, v.cap]);
      vehicleIdMap[v.reg] = res.rows[0].id;
    }
    console.log('Transport vehicles seeded.');

    // 21. Transport Drivers — vehicle_id references vehicles
    for (let i = 0; i < driversData.length; i++) {
      const [, , lic] = driversData[i];
      const vehicleReg = routesData[i].vehicleReg;
      const vehicleId = vehicleIdMap[vehicleReg];
      const userId = driverUserIds[i];

      await client.query(`
        INSERT INTO transport_drivers (institution_id, user_id, license_number, vehicle_id)
        VALUES ($1, $2, $3, $4);
      `, [institutionId, userId, lic, vehicleId]);
    }
    console.log('Transport drivers seeded.');

    // Student transport assignments
    // Village -> Route name map (exclude 'Auraiya' = sr % 8 == 1 i.e. index 0)
    const VILLAGE_ROUTE_MAP = {
      'Achhalda':  'Route C - East Zone',
      'Bidhuna':   'Route D - West Zone',
      'Rasulabad': 'Route B - South Zone',
      'Ajitmal':   'Route B - South Zone',
      'Dibiyapur': 'Route A - North Zone',
      'Phaphund':  'Route A - North Zone',
      'Saurikh':   'Route F - Rural Zone',
    };

    for (const s of allStudentIds) {
      if (s.village === 'Auraiya') continue; // Auraiya students walk
      const routeName = VILLAGE_ROUTE_MAP[s.village];
      if (!routeName) continue;
      const routeId = routeIdMap[routeName];
      // Find the vehicle assigned to this route
      const vehicleReg = routesData.find(r => r.name === routeName)?.vehicleReg;
      const vehicleId = vehicleIdMap[vehicleReg];

      await client.query(`
        INSERT INTO student_transport_assignments (student_id, route_id, vehicle_id, start_date)
        VALUES ($1, $2, $3, $4);
      `, [s.studentId, routeId, vehicleId, '2025-04-05']);
    }
    console.log('Student transport assignments seeded.');

    // ─────────────────────────────────────────────────────────────
    // 22. Exams — UNIQUE (institution_id, academic_year_id, class_id, subject_id, exam_name, exam_date)
    // So one exam per (class × subject × exam event), not per section.
    // ─────────────────────────────────────────────────────────────
    const examEvents = [
      { name: 'Unit Test 1', type: 'unit_test', startDate: '2025-07-14', endDate: '2025-07-19', date: '2025-07-14', max: 25, pass: 9,  start: '09:00', end: '10:30' },
      { name: 'Half Yearly', type: 'midterm',   startDate: '2025-09-22', endDate: '2025-10-03', date: '2025-09-22', max: 80, pass: 27, start: '09:00', end: '12:00' },
      { name: 'Unit Test 2', type: 'unit_test', startDate: '2025-12-08', endDate: '2025-12-13', date: '2025-12-08', max: 25, pass: 9,  start: '09:00', end: '10:30' },
      { name: 'Annual Exam', type: 'final',     startDate: '2026-02-16', endDate: '2026-03-05', date: '2026-02-16', max: 80, pass: 27, start: '09:00', end: '12:00' },
    ];

    // examIdMapFull[examName][classId][subjectId] = examId
    const examIdMapFull = {};

    for (const event of examEvents) {
      examIdMapFull[event.name] = {};

      // Get distinct (class_id, subject_id) combinations from class_subjects via sections
      const distinctRes = await client.query(`
        SELECT DISTINCT s.class_id, cs.subject_id
        FROM class_subjects cs
        JOIN sections s ON s.id = cs.section_id
        WHERE cs.academic_year_id = $1
      `, [academicYearId]);

      for (const row of distinctRes.rows) {
        const { class_id, subject_id } = row;
        // FIX: Added ON CONFLICT DO NOTHING — exams has UNIQUE(institution_id, academic_year_id, class_id, subject_id, exam_name, exam_date)
        // Also handle re-runs: fetch existing exam id if conflict occurs
        const res = await client.query(`
          INSERT INTO exams (institution_id, academic_year_id, class_id, subject_id, exam_name, exam_type, exam_date, start_time, end_time, total_marks, passing_marks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (institution_id, academic_year_id, class_id, subject_id, exam_name, exam_date) DO UPDATE SET exam_type = EXCLUDED.exam_type
          RETURNING id;
        `, [institutionId, academicYearId, class_id, subject_id, event.name, event.type, event.date, event.start, event.end, event.max, event.pass]);

        if (!examIdMapFull[event.name][class_id]) {
          examIdMapFull[event.name][class_id] = {};
        }
        examIdMapFull[event.name][class_id][subject_id] = res.rows[0].id;
      }
    }
    console.log('Exams seeded.');

    // 24. Exam Results — Only for Unit Test 1 and Half Yearly
    const resultsToSeed = ['Unit Test 1', 'Half Yearly'];
    for (const examName of resultsToSeed) {
      const classSubjectExamMap = examIdMapFull[examName];

      // For each section, for each subject taught in that section, get the exam id and insert results
      for (const secKey in sectionIdMap) {
        const secId = sectionIdMap[secKey];
        const classId = sectionClassIdMap[secId];

        // Get subjects for this section
        const csRows = await client.query(
          `SELECT subject_id FROM class_subjects WHERE section_id = $1 AND academic_year_id = $2`,
          [secId, academicYearId]
        );

        // Get students enrolled in this section
        const studentsInSec = await client.query(
          `SELECT student_id FROM enrollments WHERE section_id = $1`,
          [secId]
        );

        for (const csRow of csRows.rows) {
          const subjectId = csRow.subject_id;
          const examId = classSubjectExamMap?.[classId]?.[subjectId];
          if (!examId) continue;

          let srCount = 0;
          for (const s of studentsInSec.rows) {
            srCount++;
            const isAbsent = (examName === 'Unit Test 1' ? srCount % 20 === 0 : srCount % 25 === 0);
            const marks = isAbsent ? null : (examName === 'Unit Test 1' ? (10 + (srCount % 16)) : (35 + (srCount % 46)));

            // FIX: Added ON CONFLICT DO NOTHING — exam_results has UNIQUE(exam_id, student_id)
            await client.query(
              `INSERT INTO exam_results (exam_id, student_id, marks_obtained) VALUES ($1, $2, $3) ON CONFLICT (exam_id, student_id) DO NOTHING;`,
              [examId, s.student_id, marks]
            );
          }
        }
      }
    }
    console.log('Exam Results seeded.');

    // 25. Holidays — institution_id and academic_year_id are NOT NULL
    const holidaysData = [
      ['2025-08-15', 'Independence Day'],
      ['2025-08-16', 'Janmashtami'],
      ['2025-10-02', 'Gandhi Jayanti / Dussehra'],
      ['2025-10-20', 'Diwali'],
      ['2025-10-21', 'Diwali (Second Day)'],
      ['2025-11-05', 'Govardhan Puja'],
      ['2025-11-15', 'Guru Nanak Jayanti'],
      ['2025-12-25', 'Christmas Day'],
      ['2026-01-14', 'Makar Sankranti'],
      ['2026-01-26', 'Republic Day'],
      ['2026-03-17', 'Holi'],
      ['2026-03-30', 'Eid ul-Fitr'],
      ['2026-03-31', 'Year closing day'],
    ];
    for (const [date, name] of holidaysData) {
      // FIX: Added ON CONFLICT DO NOTHING — holidays has UNIQUE(institution_id, date)
      await client.query(
        `INSERT INTO holidays (institution_id, academic_year_id, date, name) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`,
        [institutionId, academicYearId, date, name]
      );
    }
    console.log('Holidays seeded.');

    // 26. Circulars — correct columns: content (not body), publish_date (not published_at)
    const circularsData = [
      ['Welcome to New Academic Year 2025-26',   'Warm welcome from Principal Dr. Shyam Sundar Pandey. School timings, uniform rules, fee schedule overview.', '2025-04-01'],
      ['Annual Sports Day – 15 November 2025',   'All students to participate. Practice schedule from 1 Nov. Parents invited.',                                  '2025-10-15'],
      ['Half Yearly Exam Schedule Released',      'Dates: 22 Sep – 3 Oct 2025. Syllabus attached. Bring admit card daily.',                                      '2025-09-01'],
      ['Fee Payment Reminder – Quarter 2',        'Q2 fees due by 31 July 2025. Pay at school office (cash / UPI). Late fee ₹50/day after due date.',            '2025-07-15'],
      ['Republic Day Celebration – 26 January 2026', 'Programme at school ground 9:00 AM. Cultural performances by students. All staff to report by 8:00 AM.',  '2026-01-20'],
    ];
    for (const [title, content, date] of circularsData) {
      // FIX: Added ON CONFLICT DO NOTHING — circulars has UNIQUE(institution_id, title, publish_date)
      await client.query(
        `INSERT INTO circulars (title, content, publish_date, institution_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`,
        [title, content, date, institutionId]
      );
    }
    console.log('Circulars seeded.');

    await client.query('COMMIT');
    console.log('\n✅ Database successfully seeded! (Postgres tables)');

    // Now, create auth users in Supabase Auth
    console.log('Fetching seeded users to register in Supabase Auth...');
    const usersRes = await client.query('SELECT email FROM public.users WHERE email IS NOT NULL');
    const users = usersRes.rows;
    console.log(`Found ${users.length} users to register.`);

    for (let i = 0; i < users.length; i += 10) {
      const batch = users.slice(i, i + 10);
      await Promise.all(batch.map(user => 
        supabase.auth.admin.createUser({
          email: user.email,
          password: 'password123',
          email_confirm: true,
          user_metadata: { is_admin_registered: true }
        })
      ));
      await new Promise(r => setTimeout(r, 500));
      console.log(`Auth users created: ${Math.min(i + 10, users.length)}/${users.length}`);
    }

    console.log('All auth users successfully registered and synced!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', err.message);
    console.error(err);
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch(console.error);
