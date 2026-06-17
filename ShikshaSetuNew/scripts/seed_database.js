// WARNING: This script TRUNCATES all data. 
// Only run on empty databases or during development reset.
// Never run in production or when real data exists.

const { Client } = require('pg');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL || !supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables (DATABASE_URL, EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

const force = process.argv.includes('--force');

// --- CONSTANTS ---
const SURNAMES = ['Sharma','Gupta','Singh','Yadav','Verma','Mishra','Tiwari','Pandey','Dubey','Shukla','Srivastava','Patel','Bajpai','Tripathi','Saxena','Dwivedi','Dixit','Kushwaha','Chauhan','Agarwal'];
const MALE_FIRST = ['Ram','Shiv','Hari','Suresh','Dinesh','Rakesh','Mahesh','Naresh','Mukesh','Umesh','Ganesh','Rajesh','Santosh','Arvind','Vinod','Anil','Sunil','Pawan','Rohit','Deepak'];
const FEMALE_FIRST = ['Sunita','Meena','Rekha','Savita','Anita','Kavita','Geeta','Pushpa','Lalita','Sudha','Renu','Saroj','Mamta','Pooja','Shanti','Kiran','Neha','Usha','Seema','Sita'];

const STU_SURNAMES = ['Sharma','Gupta','Singh','Yadav','Verma','Mishra','Tiwari','Pandey','Dubey','Shukla','Srivastava','Patel','Bajpai','Tripathi','Saxena','Dwivedi','Dixit','Kushwaha','Chauhan','Agarwal','Nishad','Maurya','Lodhi','Rajput','Jatav','Rawat'];
const STU_MALE_FIRST = ['Aarav','Arjun','Vivaan','Aditya','Vihaan','Sai','Ansh','Dhruv','Kabir','Rishi','Harsh','Nikhil','Yash','Ayaan','Pranav','Shubham','Akash','Sumit','Rishabh','Kartik','Tushar','Mohit','Rohan','Gaurav','Siddharth','Naman','Abhishek','Varun','Rahul','Dev'];
const STU_FEMALE_FIRST = ['Aanya','Diya','Isha','Kavya','Priya','Ananya','Riya','Siya','Shruti','Neha','Pooja','Sneha','Sakshi','Divya','Anjali','Swati','Muskan','Khushi','Palak','Nidhi','Komal','Simran','Mansi','Deepika','Prachi','Tanvi','Shreya','Aakanksha','Ritu','Garima'];
const GUARDIAN_FIRST = ['Ramesh','Suresh','Dinesh','Rakesh','Mahesh','Rajesh','Santosh','Vinod','Anil','Mukesh','Harish','Umesh','Ganesh','Ashok','Arvind','Pankaj','Sanjay','Ajay','Vijay','Manoj','Deepak','Naresh','Pramod','Shailesh','Rohit','Amit','Sunil','Akhilesh','Girish','Hemant'];
const VILLAGES = ['Auraiya', 'Achhalda', 'Bidhuna', 'Rasulabad', 'Ajitmal', 'Dibiyapur', 'Phaphund', 'Saurikh'];
const BLOOD_GROUPS = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];

function getClassCode(className) {
  if (className === 'Nursery') return 'N';
  if (className === 'LKG') return 'LKG';
  if (className === 'UKG') return 'UKG';
  return className.replace('Class ', '');
}

async function bulkInsert(client, tableName, columns, rows) {
  if (rows.length === 0) return;
  const colNames = columns.join(', ');
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuePlaceholders = [];
    const params = [];
    let pIdx = 1;
    for (const row of batch) {
      const placeholders = [];
      for (const col of columns) {
        placeholders.push(`$${pIdx}`);
        params.push(row[col]);
        pIdx++;
      }
      valuePlaceholders.push(`(${placeholders.join(', ')})`);
    }
    const query = `INSERT INTO ${tableName} (${colNames}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT DO NOTHING;`;
    await client.query(query, params);
  }
}

async function seed() {
  console.log('Running safety checks...');
  const pgClient = new Client({ connectionString: DATABASE_URL });
  await pgClient.connect();

  let studentCount = 0;
  try {
    const res = await pgClient.query('SELECT COUNT(*) as cnt FROM public.students');
    studentCount = parseInt(res.rows[0].cnt);
  } catch (err) {
    console.log('Error checking student count:', err.message);
  }

  if (studentCount > 0 && !force) {
    console.error('SAFETY: Database has real data. Aborting seed to prevent data loss.');
    console.error(`Students: ${studentCount}`);
    console.error('To override, run with --force: node scripts/seed_database.js --force');
    await pgClient.end();
    process.exit(1);
  }

  // --- PREPARE USER REGISTER LIST ---
  // Seed precisely: 3 admins, 17 teachers, 130 students, and 2 drivers
  const usersToCreate = [];

  // 1. Admins (3)
  const adminsData = [
    { name: 'Dr. Shyam Sundar Pandey', email: 'adm1@gurukulsiksha.edu.in', role: 'institution_admin', login_id: 'GS-ADM-001' },
    { name: 'Smt. Usha Rani Sharma', email: 'adm2@gurukulsiksha.edu.in', role: 'institution_admin', login_id: 'GS-ADM-002' },
    { name: 'Shri Arvind Kumar Mishra', email: 'adm3@gurukulsiksha.edu.in', role: 'institution_admin', login_id: 'GS-ADM-003' }
  ];
  usersToCreate.push(...adminsData);

  // 2. Teachers (17)
  const teachersList = [
    { name: 'Ramesh Kumar Sharma', gender: 'male', specialization: 'Mathematics', qualification: 'M.Sc., B.Ed.' },
    { name: 'Sunita Devi Gupta', gender: 'female', specialization: 'Hindi', qualification: 'M.A. Hindi, B.Ed.' },
    { name: 'Ajay Pratap Singh', gender: 'male', specialization: 'Science (Middle)', qualification: 'M.Sc. Physics, B.Ed.' },
    { name: 'Meena Rani Mishra', gender: 'female', specialization: 'English', qualification: 'M.A. English, B.Ed.' },
    { name: 'Vinod Kumar Tiwari', gender: 'male', specialization: 'Social Science', qualification: 'M.A. History, B.Ed.' },
    { name: 'Rekha Devi Verma', gender: 'female', specialization: 'Mathematics', qualification: 'M.Sc. Maths, B.Ed.' },
    { name: 'Santosh Kumar Yadav', gender: 'male', specialization: 'Physical Education', qualification: 'M.P.Ed.' },
    { name: 'Priya Pandey', gender: 'female', specialization: 'Sanskrit', qualification: 'M.A. Sanskrit, B.Ed.' },
    { name: 'Rajesh Nath Dubey', gender: 'male', specialization: 'Physics', qualification: 'M.Sc. Physics, B.Ed.' },
    { name: 'Savita Singh Chauhan', gender: 'female', specialization: 'Chemistry', qualification: 'M.Sc. Chemistry, B.Ed.' },
    { name: 'Dinesh Kumar Awasthi', gender: 'male', specialization: 'Biology', qualification: 'M.Sc. Biology, B.Ed.' },
    { name: 'Anita Kumari Srivastava', gender: 'female', specialization: 'Computer Science', qualification: 'MCA, B.Ed.' },
    { name: 'Manoj Kumar Patel', gender: 'male', specialization: 'History & Civics', qualification: 'M.A. History, B.Ed.' },
    { name: 'Kavita Rani Shukla', gender: 'female', specialization: 'Geography', qualification: 'M.A. Geography, B.Ed.' },
    { name: 'Suresh Chandra Bajpai', gender: 'male', specialization: 'Mathematics (Sr.)', qualification: 'M.Sc. Maths, M.Ed.' },
    { name: 'Lalita Devi Tripathi', gender: 'female', specialization: 'English Core', qualification: 'M.A. English, M.Ed.' },
    { name: 'Harish Kumar Saxena', gender: 'male', specialization: 'Accountancy', qualification: 'M.Com., B.Ed.' }
  ];

  for (let i = 0; i < teachersList.length; i++) {
    const t = teachersList[i];
    const sr = i + 1;
    usersToCreate.push({
      name: t.name,
      email: `tch${sr}@gurukulsiksha.edu.in`,
      role: 'teacher',
      login_id: `GS-TCH-${String(sr).padStart(3, '0')}`,
      gender: t.gender,
      specialization: t.specialization,
      qualification: t.qualification,
      employee_code: `TCH${String(sr).padStart(3, '0')}`,
      date_of_joining: new Date(2015 + Math.floor(sr / 4), (sr % 12), 1).toISOString().slice(0, 10)
    });
  }

  // 3. Drivers (2)
  const driversData = [
    { name: 'Ramu Prasad Nishad', email: 'drv1@gurukulsiksha.edu.in', role: 'driver', login_id: 'GS-DRV-001', license: 'UP76-2018-0012345' },
    { name: 'Chhote Lal Yadav', email: 'drv2@gurukulsiksha.edu.in', role: 'driver', login_id: 'GS-DRV-002', license: 'UP76-2016-0056789' }
  ];
  usersToCreate.push(...driversData.map(d => ({
    name: d.name,
    email: d.email,
    role: 'driver',
    login_id: d.login_id,
    license: d.license
  })));

  // 4. Students (130)
  for (let sr = 1; sr <= 130; sr++) {
    const surname = STU_SURNAMES[(sr - 1) % 26];
    const gender = sr % 2 === 1 ? 'male' : 'female';
    const first = gender === 'male'
      ? STU_MALE_FIRST[Math.floor((sr - 1) / 2) % 30]
      : STU_FEMALE_FIRST[Math.floor((sr - 1) / 2) % 30];
    const guardianFirst = GUARDIAN_FIRST[(sr - 1) % 30];
    const village = VILLAGES[(sr - 1) % 8];
    const plan_tier = sr % 10 === 0 ? 'PRO' : (sr % 10 > 0 && sr % 10 < 9 ? 'STANDARD' : 'FREE');
    const tier_expires_at = plan_tier === 'FREE' ? null : '2027-03-31 00:00:00+05:30';

    usersToCreate.push({
      name: `${first} ${surname}`,
      email: `stu${sr}@gurukulsiksha.edu.in`,
      role: 'student',
      login_id: `GS-STU-${String(sr).padStart(4, '0')}`,
      gender,
      guardian_name: `${guardianFirst} ${surname}`,
      village,
      student_code: `STU${String(sr).padStart(4, '0')}`,
      plan_tier,
      tier_expires_at
    });
  }

  try {
    // Clean auth.users first
    console.log('Cleaning auth.users table...');
    await pgClient.query('DELETE FROM auth.users;');

    // Pre-register all users in Supabase Auth to get UUIDs
    console.log('Pre-registering users in Supabase Auth (152 total)...');
    const authUserMap = {}; // email -> uuid
    const batchSize = 10;
    for (let i = 0; i < usersToCreate.length; i += batchSize) {
      const batch = usersToCreate.slice(i, i + batchSize);
      await Promise.all(batch.map(async (user) => {
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'password123',
          email_confirm: true,
          user_metadata: { is_admin_registered: true }
        });
        if (error) {
          console.error(`Error creating auth user ${user.email}:`, error.message);
          throw error;
        }
        authUserMap[user.email] = data.user.id;
      }));
      await new Promise(r => setTimeout(r, 100));
      console.log(`Auth users registered: ${Math.min(i + batchSize, usersToCreate.length)}/${usersToCreate.length}`);
    }
    console.log('All auth users successfully registered!');

    // Start Postgres seeding
    await pgClient.query('BEGIN');
    console.log('Transaction started...');

    console.log('Truncating all tables for a fresh start...');
    const tablesToTruncate = [
      'wallet_transactions', 'student_wallets', 'student_daily_usage', 'ai_daily_quotas', 'ai_scores',
      'homework_submissions', 'homework',
      'marketing_metrics', 'marketing_leads', 'marketing_channels', 'marketing_campaigns',
      'circulars', 'holidays', 'exam_results', 'exams',
      'student_transport_assignments', 'transport_drivers', 'transport_vehicles', 'transport_routes',
      'fee_payments', 'fee_structures',
      'enrollments', 'students', 'timetable', 'class_subjects', 'sections',
      'teachers', 'users', 'subjects', 'classes', 'academic_years', 'institutions'
    ];
    for (const table of tablesToTruncate) {
      await pgClient.query(`TRUNCATE TABLE ${table} CASCADE;`);
    }

    // 1. Institutions
    const themeData = {
      colors: {
        primary: "#0D1B2A",
        primaryAlt: "#162A56",
        secondary: "#D4AF37",
        secondaryLight: "#F2C14E",
        charcoal: "#333333",
        steelGray: "#6B7280",
        lightGray: "#E5E7EB",
        cream: "#F7F3EB",
        white: "#FFFFFF",
        success: "#22C55E",
        warning: "#EAB308",
        danger: "#EF4444"
      },
      fonts: {
        heading: "Poppins",
        body: "Inter",
        caption: "OpenSans"
      }
    };

    const instRes = await pgClient.query(`
      INSERT INTO institutions (name, code, address, city, state, pincode, phone, email, logo_url, tagline, status, subscription_ends_at, theme)
      VALUES ('Gurukul Shikshalaya', 'GS-AUR-001', 'Civil Lines, Near Collectorate, Auraiya', 'Auraiya', 'Uttar Pradesh', '206122', '+91-5683-220101', 'info@gurukulsiksha.edu.in', 'https://fsdqlsbdbbfpqzvrptgk.supabase.co/storage/v1/object/public/institution-logos/gurukul.png', 'Digital Backbone of Institutions', 'active', '2026-03-31 00:00:00+05:30', $1)
      RETURNING id;
    `, [JSON.stringify(themeData)]);
    const institutionId = instRes.rows[0].id;
    console.log('Institution seeded:', institutionId);

    // 2. Academic Year
    const ayRes = await pgClient.query(`
      INSERT INTO academic_years (institution_id, label, starts_on, ends_on, is_current)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `, [institutionId, '2025-26', '2025-04-01', '2026-03-31', true]);
    const academicYearId = ayRes.rows[0].id;
    console.log('Academic year seeded:', academicYearId);

    // 3. Classes
    const classData = [
      ['Nursery', 1], ['LKG', 2], ['UKG', 3], ['Class 1', 4], ['Class 2', 5],
      ['Class 3', 6], ['Class 4', 7], ['Class 5', 8], ['Class 6', 9], ['Class 7', 10],
      ['Class 8', 11], ['Class 9', 12], ['Class 10', 13], ['Class 11', 14], ['Class 12', 15]
    ];
    const classIdMap = {};
    for (const [name, grade] of classData) {
      const res = await pgClient.query(
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
      const res = await pgClient.query(
        `INSERT INTO subjects (institution_id, name, code) VALUES ($1, $2, $3) RETURNING id;`,
        [institutionId, name, code]
      );
      subjectIdMap[code] = res.rows[0].id;
    }
    console.log('Subjects seeded.');

    // 5. Users
    const userRows = [];
    for (const u of usersToCreate) {
      const authId = authUserMap[u.email];
      userRows.push({
        id: authId,
        institution_id: institutionId,
        role: u.role,
        login_id: u.login_id,
        full_name: u.name,
        email: u.email,
        phone: u.phone || `+91-98970-${Math.floor(10000 + Math.random() * 90000)}`,
        status: 'active'
      });
    }
    console.log('Inserting public.users...');
    await bulkInsert(pgClient, 'users', ['id', 'institution_id', 'role', 'login_id', 'full_name', 'email', 'phone', 'status'], userRows);

    // 6. Teachers
    const teacherIdMap = {}; // login_id -> teachers.id (UUID)
    const teacherRows = [];
    const teacherUsers = usersToCreate.filter(u => u.role === 'teacher');
    for (const t of teacherUsers) {
      const authId = authUserMap[t.email];
      const teacherId = crypto.randomUUID();
      teacherIdMap[t.login_id] = teacherId;

      teacherRows.push({
        id: teacherId,
        user_id: authId,
        institution_id: institutionId,
        employee_code: t.employee_code,
        date_of_birth: '1980-01-01',
        gender: t.gender,
        qualification: t.qualification,
        specialization: t.specialization,
        date_of_joining: t.date_of_joining,
        address: 'Auraiya, Uttar Pradesh',
        emergency_contact: `+91-94150-00000`
      });
    }
    console.log('Inserting teachers...');
    await bulkInsert(pgClient, 'teachers', ['id', 'user_id', 'institution_id', 'employee_code', 'date_of_birth', 'gender', 'qualification', 'specialization', 'date_of_joining', 'address', 'emergency_contact'], teacherRows);

    // 7. Sections (exactly 17 sections, mapped 1-to-1 with the 17 teachers)
    const sectionLayout = [
      { class: 'Nursery',  secs: ['A'] },
      { class: 'LKG',      secs: ['A'] },
      { class: 'UKG',      secs: ['A'] },
      { class: 'Class 1',  secs: ['A'] },
      { class: 'Class 2',  secs: ['A'] },
      { class: 'Class 3',  secs: ['A'] },
      { class: 'Class 4',  secs: ['A'] },
      { class: 'Class 5',  secs: ['A'] },
      { class: 'Class 6',  secs: ['A'] },
      { class: 'Class 7',  secs: ['A'] },
      { class: 'Class 8',  secs: ['A'] },
      { class: 'Class 9',  secs: ['A'] },
      { class: 'Class 10', secs: ['A'] },
      { class: 'Class 11', secs: ['A', 'B'] },
      { class: 'Class 12', secs: ['A', 'B'] },
    ];
    const classTeacherMap = {
      'Nursery-A': 'GS-TCH-001',
      'LKG-A': 'GS-TCH-002',
      'UKG-A': 'GS-TCH-003',
      'Class 1-A': 'GS-TCH-004',
      'Class 2-A': 'GS-TCH-005',
      'Class 3-A': 'GS-TCH-006',
      'Class 4-A': 'GS-TCH-007',
      'Class 5-A': 'GS-TCH-008',
      'Class 6-A': 'GS-TCH-009',
      'Class 7-A': 'GS-TCH-010',
      'Class 8-A': 'GS-TCH-011',
      'Class 9-A': 'GS-TCH-012',
      'Class 10-A': 'GS-TCH-013',
      'Class 11-A': 'GS-TCH-014',
      'Class 11-B': 'GS-TCH-015',
      'Class 12-A': 'GS-TCH-016',
      'Class 12-B': 'GS-TCH-017',
    };

    const sectionIdMap = {};        // 'Class 9-A' -> sectionId
    const sectionClassIdMap = {};   // sectionId   -> classId

    for (const item of sectionLayout) {
      for (const secName of item.secs) {
        const key = `${item.class}-${secName}`;
        const teacherLoginId = classTeacherMap[key];
        const teacherUserId = authUserMap[teacherLoginId + '@gurukulsiksha.edu.in'];

        const res = await pgClient.query(`
          INSERT INTO sections (class_id, academic_year_id, name, capacity, class_teacher_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id;
        `, [classIdMap[item.class], academicYearId, secName, 40, teacherUserId]);
        
        const sectionId = res.rows[0].id;
        sectionIdMap[key] = sectionId;
        sectionClassIdMap[sectionId] = classIdMap[item.class];
      }
    }
    console.log('Sections seeded.');

    // 8. Class Subjects (Teacher matches specialization keyword)
    const pgTeachers = teacherUsers.map(t => ({
      userId: authUserMap[t.email],
      specialization: t.specialization
    }));

    function getTeacherForSubject(subCode) {
      const findTeacher = (specKeyword) => pgTeachers.find(t => t.specialization.toLowerCase().includes(specKeyword.toLowerCase()));
      
      if (['MAT-SR', 'MAT', 'PP-MAT'].includes(subCode)) {
        if (subCode === 'MAT-SR') return findTeacher('mathematics (sr.)') || findTeacher('mathematics');
        const mathTeachers = pgTeachers.filter(t => t.specialization.toLowerCase().includes('mathematics'));
        if (mathTeachers.length > 0) return mathTeachers[Math.floor(Math.random() * mathTeachers.length)];
      }
      if (['HIN', 'PP-HIN'].includes(subCode)) return findTeacher('hindi');
      if (['ENG', 'PP-ENG', 'ENG-CORE'].includes(subCode)) {
        if (subCode === 'ENG-CORE') return findTeacher('english core') || findTeacher('english');
        return findTeacher('english');
      }
      if (['SCI', 'EVS'].includes(subCode)) return findTeacher('science') || findTeacher('evs');
      if (['PHY', 'PHY-SR'].includes(subCode)) return findTeacher('physics') || findTeacher('physics (sr.)');
      if (['CHE', 'CHE-SR'].includes(subCode)) return findTeacher('chemistry') || findTeacher('chemistry (sr.)');
      if (['BIO', 'BIO-SR'].includes(subCode)) return findTeacher('biology') || findTeacher('biology (sr.)');
      if (['CS', 'IP'].includes(subCode)) return findTeacher('computer') || findTeacher('informatics');
      if (subCode === 'SST') return findTeacher('social');
      if (subCode === 'SAN') return findTeacher('sanskrit');
      if (subCode === 'HIS') return findTeacher('history');
      if (subCode === 'GEO') return findTeacher('geography');
      if (['PE', 'PA'].includes(subCode)) return findTeacher('physical');
      if (['ACC', 'BST', 'ECO'].includes(subCode)) return findTeacher('accountancy') || findTeacher('business') || findTeacher('economics');
      
      return pgTeachers[0];
    }

    const classSubjectsMapping = [
      { group: ['Nursery', 'LKG', 'UKG'],                                subjects: ['PP-ENG', 'PP-HIN', 'PP-MAT', 'PP-GK', 'ART', 'PA'] },
      { group: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'], subjects: ['ENG', 'HIN', 'MAT', 'EVS', 'GK', 'CS', 'ART', 'PE'] },
      { group: ['Class 6', 'Class 7', 'Class 8'],                        subjects: ['ENG', 'HIN', 'MAT', 'SCI', 'SST', 'SAN', 'CS', 'PE'] },
      { group: ['Class 9', 'Class 10'],                                   subjects: ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'HIS', 'GEO', 'CS', 'PE'] },
      { group: ['Class 11', 'Class 12'], science: ['PHY-SR', 'CHE-SR', 'BIO-SR', 'MAT-SR', 'ENG-CORE', 'IP'], commerce: ['ACC', 'BST', 'ECO', 'MAT-SR', 'ENG-CORE'] }
    ];

    const classSubjectsRows = [];
    for (const entry of classSubjectsMapping) {
      for (const className of entry.group) {
        const sections = sectionLayout.find(s => s.class === className).secs;
        for (const secName of sections) {
          const secKey = `${className}-${secName}`;
          const secId = sectionIdMap[secKey];
          let subs = entry.subjects || [];
          if (entry.science && entry.commerce) {
            subs = secName === 'A' ? entry.science : entry.commerce;
          }
          for (const subCode of subs) {
            const teacher = getTeacherForSubject(subCode);
            classSubjectsRows.push({
              section_id: secId,
              subject_id: subjectIdMap[subCode],
              academic_year_id: academicYearId,
              teacher_id: teacher ? teacher.userId : null,
              max_marks: 100
            });
          }
        }
      }
    }
    console.log('Inserting class subjects...');
    await bulkInsert(pgClient, 'class_subjects', ['section_id', 'subject_id', 'academic_year_id', 'teacher_id', 'max_marks'], classSubjectsRows);

    // 9. Timetable (Seeded dynamically based on section subjects)
    const slotTimes = [
      { start: '08:00', end: '08:45' }, { start: '08:50', end: '09:35' }, { start: '09:40', end: '10:25' },
      { start: '10:40', end: '11:25' }, { start: '11:30', end: '12:15' }, { start: '12:20', end: '13:05' }
    ];

    const csLookupRes = await pgClient.query(
      `SELECT id, section_id, subject_id FROM class_subjects WHERE academic_year_id = $1`,
      [academicYearId]
    );

    const timetableRows = [];
    for (const secKey in sectionIdMap) {
      const secId = sectionIdMap[secKey];
      const sectionSubjects = csLookupRes.rows.filter(row => row.section_id === secId);
      if (sectionSubjects.length === 0) continue;
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (const day of days) {
        const periods = day === 'saturday' ? 4 : 6;
        for (let p = 0; p < periods; p++) {
          const cs = sectionSubjects[(day.charCodeAt(0) + p) % sectionSubjects.length];
          timetableRows.push({
            section_id: secId,
            class_subject_id: cs.id,
            day,
            period_number: p + 1,
            starts_at: slotTimes[p].start,
            ends_at: slotTimes[p].end,
            academic_year_id: academicYearId
          });
        }
      }
    }
    console.log('Inserting timetable bulk...');
    await bulkInsert(pgClient, 'timetable', ['section_id', 'class_subject_id', 'day', 'period_number', 'starts_at', 'ends_at', 'academic_year_id'], timetableRows);

    // 10. Students, Enrollments, Wallets
    const studentUsers = usersToCreate.filter(u => u.role === 'student');
    const studentRows = [];
    const enrollmentRows = [];
    const studentWalletRows = [];
    const studentIds = [];
    const sectionKeys = Object.keys(sectionIdMap);

    for (let i = 0; i < studentUsers.length; i++) {
      const s = studentUsers[i];
      const authId = authUserMap[s.email];
      const studentId = crypto.randomUUID();
      studentIds.push(studentId);

      const secKey = sectionKeys[i % sectionKeys.length];
      const secId = sectionIdMap[secKey];

      const dobYear = 2022 - classData.find(c => c[0] === secKey.split('-')[0])[1];
      const dob = `${dobYear}-07-15`;

      const rollNumber = `${getClassCode(secKey.split('-')[0])}-${secKey.split('-')[1]}-${String(Math.floor(i / sectionKeys.length) + 1).padStart(2, '0')}`;

      studentRows.push({
        id: studentId,
        user_id: authId,
        institution_id: institutionId,
        student_code: s.student_code,
        date_of_birth: dob,
        gender: s.gender,
        guardian_name: s.guardian_name,
        guardian_phone: `+91-9795${String(i+1).padStart(6, '0')}`,
        guardian_email: `guardian.${s.student_code.toLowerCase()}@example.com`,
        blood_group: BLOOD_GROUPS[i % BLOOD_GROUPS.length],
        address: s.village,
        admission_date: '2025-04-05',
        plan_tier: s.plan_tier,
        tier_expires_at: s.tier_expires_at
      });

      enrollmentRows.push({
        student_id: studentId,
        section_id: secId,
        academic_year_id: academicYearId,
        roll_number: rollNumber,
        enrolled_on: '2025-04-05',
        is_active: true
      });

      let balancePaisa = 0;
      if (s.plan_tier === 'PRO') balancePaisa = 100000;
      else if (s.plan_tier === 'STANDARD') balancePaisa = 50000;

      studentWalletRows.push({
        student_id: studentId,
        institution_id: institutionId,
        balance_paisa: balancePaisa
      });
    }

    console.log('Inserting students...');
    await bulkInsert(pgClient, 'students', ['id', 'user_id', 'institution_id', 'student_code', 'date_of_birth', 'gender', 'guardian_name', 'guardian_phone', 'guardian_email', 'blood_group', 'address', 'admission_date', 'plan_tier', 'tier_expires_at'], studentRows);
    
    console.log('Inserting enrollments...');
    await bulkInsert(pgClient, 'enrollments', ['student_id', 'section_id', 'academic_year_id', 'roll_number', 'enrolled_on', 'is_active'], enrollmentRows);
    
    console.log('Inserting student wallets...');
    await bulkInsert(pgClient, 'student_wallets', ['student_id', 'institution_id', 'balance_paisa'], studentWalletRows);

    // 11. Fee structures
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
    
    const feeStructureIdMap = {};
    for (const group of groupFees) {
      for (const className of group.classes) {
        const classId = classIdMap[className];
        for (const [feeName, amount] of Object.entries(group.fees)) {
          const res = await pgClient.query(
            `INSERT INTO fee_structures (institution_id, academic_year_id, class_id, fee_name, amount, due_date)
             VALUES ($1, $2, $3, $4, $5, '2025-04-30')
             ON CONFLICT DO NOTHING
             RETURNING id;`,
            [institutionId, academicYearId, classId, feeName, amount]
          );
          if (res.rows[0]) {
            feeStructureIdMap[`${classId}_${feeName}`] = res.rows[0].id;
          }
        }
      }
    }
    console.log('Fee Structures seeded.');

    // 12. Fee Payments
    const feePaymentsRows = [];
    for (let i = 0; i < 10; i++) {
      const studentId = studentIds[i];
      const enroll = enrollmentRows[i];
      const classId = sectionClassIdMap[enroll.section_id];
      const feeStructId = feeStructureIdMap[`${classId}_Tuition Fee`];
      if (feeStructId) {
        feePaymentsRows.push({
          fee_structure_id: feeStructId,
          student_id: studentId,
          amount_paid: 4000,
          payment_date: new Date().toISOString(),
          payment_method: 'UPI',
          notes: 'Partial payment of Q1 tuition fee'
        });
      }
    }
    await bulkInsert(pgClient, 'fee_payments', ['fee_structure_id', 'student_id', 'amount_paid', 'payment_date', 'payment_method', 'notes'], feePaymentsRows);
    console.log('Fee payments seeded.');

    // 13. Transport Routes, Vehicles, Drivers, and Assignments
    const route1Res = await pgClient.query(`
      INSERT INTO transport_routes (institution_id, name, start_location, end_location, distance)
      VALUES ($1, 'Route A - North Zone', 'Dibiyapur', 'School', 12)
      RETURNING id;
    `, [institutionId]);
    const route1Id = route1Res.rows[0].id;

    const route2Res = await pgClient.query(`
      INSERT INTO transport_routes (institution_id, name, start_location, end_location, distance)
      VALUES ($1, 'Route B - South Zone', 'Ajitmal', 'School', 15)
      RETURNING id;
    `, [institutionId]);
    const route2Id = route2Res.rows[0].id;
    console.log('Transport routes seeded.');

    const veh1Res = await pgClient.query(`
      INSERT INTO transport_vehicles (institution_id, route_id, vehicle_number, vehicle_type, capacity)
      VALUES ($1, $2, 'UP76-AB-1234', 'Tata Starbus 52', 52)
      RETURNING id;
    `, [institutionId, route1Id]);
    const veh1Id = veh1Res.rows[0].id;

    const veh2Res = await pgClient.query(`
      INSERT INTO transport_vehicles (institution_id, route_id, vehicle_number, vehicle_type, capacity)
      VALUES ($1, $2, 'UP76-AB-5678', 'Tata Starbus 52', 52)
      RETURNING id;
    `, [institutionId, route2Id]);
    const veh2Id = veh2Res.rows[0].id;
    console.log('Transport vehicles seeded.');

    await pgClient.query(`
      INSERT INTO transport_drivers (institution_id, user_id, license_number, vehicle_id)
      VALUES ($1, $2, 'UP76-2018-0012345', $3);
    `, [institutionId, authUserMap['drv1@gurukulsiksha.edu.in'], veh1Id]);

    await pgClient.query(`
      INSERT INTO transport_drivers (institution_id, user_id, license_number, vehicle_id)
      VALUES ($1, $2, 'UP76-2016-0056789', $3);
    `, [institutionId, authUserMap['drv2@gurukulsiksha.edu.in'], veh2Id]);
    console.log('Transport drivers seeded.');

    const transAssignments = [];
    const VILLAGE_ROUTE_MAP = {
      'Dibiyapur': { routeId: route1Id, vehicleId: veh1Id },
      'Phaphund':  { routeId: route1Id, vehicleId: veh1Id },
      'Ajitmal':   { routeId: route2Id, vehicleId: veh2Id },
      'Rasulabad': { routeId: route2Id, vehicleId: veh2Id }
    };

    for (let i = 0; i < studentRows.length; i++) {
      const student = studentRows[i];
      const routeInfo = VILLAGE_ROUTE_MAP[student.address];
      if (routeInfo) {
        transAssignments.push({
          student_id: student.id,
          route_id: routeInfo.routeId,
          vehicle_id: routeInfo.vehicleId,
          start_date: '2025-04-05'
        });
      }
    }
    console.log('Inserting student transport assignments...');
    await bulkInsert(pgClient, 'student_transport_assignments', ['student_id', 'route_id', 'vehicle_id', 'start_date'], transAssignments);

    // 14. Exams & Results
    const examEvents = [
      { name: 'Unit Test 1', type: 'unit_test', date: '2025-07-14', max: 25, pass: 9, start: '09:00', end: '10:30' },
      { name: 'Half Yearly', type: 'midterm',   date: '2025-09-22', max: 80, pass: 27, start: '09:00', end: '12:00' }
    ];
    
    const examIds = [];
    const class9Id = classIdMap['Class 9'];
    const mathSubId = subjectIdMap['MAT'];
    
    for (const event of examEvents) {
      const res = await pgClient.query(`
        INSERT INTO exams (institution_id, academic_year_id, class_id, subject_id, exam_name, exam_type, exam_date, start_time, end_time, total_marks, passing_marks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id;
      `, [institutionId, academicYearId, class9Id, mathSubId, event.name, event.type, event.date, event.start, event.end, event.max, event.pass]);
      examIds.push({ id: res.rows[0].id, name: event.name });
    }
    console.log('Exams seeded.');

    const class9SecId = sectionIdMap['Class 9-A'];
    const class9Students = enrollmentRows.filter(e => e.section_id === class9SecId).map(e => e.student_id);
    
    const examResultsRows = [];
    for (const exam of examIds) {
      for (let i = 0; i < class9Students.length; i++) {
        const studentId = class9Students[i];
        const marks = exam.name === 'Unit Test 1' ? (15 + (i % 10)) : (45 + (i % 30));
        examResultsRows.push({
          exam_id: exam.id,
          student_id: studentId,
          marks_obtained: marks
        });
      }
    }
    console.log('Inserting exam results...');
    await bulkInsert(pgClient, 'exam_results', ['exam_id', 'student_id', 'marks_obtained'], examResultsRows);

    // 15. Holidays & Circulars
    const holidaysData = [
      ['2025-08-15', 'Independence Day'],
      ['2025-08-16', 'Janmashtami'],
      ['2025-10-02', 'Gandhi Jayanti / Dussehra'],
      ['2025-10-20', 'Diwali'],
      ['2025-12-25', 'Christmas Day'],
      ['2026-01-26', 'Republic Day']
    ];
    for (const [date, name] of holidaysData) {
      await pgClient.query(
        `INSERT INTO holidays (institution_id, academic_year_id, date, name, event_type, status)
         VALUES ($1, $2, $3, $4, 'holiday', 'published') ON CONFLICT DO NOTHING;`,
        [institutionId, academicYearId, date, name]
      );
    }
    console.log('Holidays seeded.');

    const circularsData = [
      ['Welcome to New Academic Year 2025-26', 'Warm welcome from Principal. School timings and uniform rules.', '2025-04-01', 'general'],
      ['Annual Sports Day – 15 November 2025', 'All students to participate. Practice starts soon.', '2025-10-15', 'event'],
      ['Half Yearly Exam Schedule Released', 'Dates: 22 Sep – 3 Oct 2025. Syllabus attached.', '2025-09-01', 'academic']
    ];
    for (const [title, content, date, category] of circularsData) {
      await pgClient.query(
        `INSERT INTO circulars (title, content, publish_date, institution_id, category, target_roles)
         VALUES ($1, $2, $3, $4, $5, ARRAY['institution_admin'::text, 'teacher'::text, 'student'::text]) ON CONFLICT DO NOTHING;`,
        [title, content, date, institutionId, category]
      );
    }
    console.log('Circulars seeded.');

    // 16. Homework & Homework Submissions
    const homeworkData = [
      { secKey: 'Class 9-A', subCode: 'MAT', tchLoginId: 'GS-TCH-001', title: 'Linear Equations in Two Variables', desc: 'Solve all questions in Exercise 4.2 of the Mathematics textbook.' },
      { secKey: 'Class 10-A', subCode: 'ENG', tchLoginId: 'GS-TCH-004', title: 'A Letter to God - Comprehension', desc: 'Read the story and answer the short questions in your notebook.' },
      { secKey: 'Class 11-A', subCode: 'PHY-SR', tchLoginId: 'GS-TCH-009', title: 'Newton\'s Laws of Motion', desc: 'Derive the equations of motion and solve numerical problems 1 to 5.' },
      { secKey: 'Class 12-A', subCode: 'BIO-SR', tchLoginId: 'GS-TCH-011', title: 'Structure of DNA', desc: 'Draw a neat labeled diagram of the double helix structure of DNA.' }
    ];

    const homeworkIds = [];
    for (const hw of homeworkData) {
      const secId = sectionIdMap[hw.secKey];
      const classId = sectionClassIdMap[secId];
      const subId = subjectIdMap[hw.subCode];
      const teacherProfileId = teacherIdMap[hw.tchLoginId];
      
      const res = await pgClient.query(`
        INSERT INTO homework (institution_id, academic_year_id, class_id, subject_id, teacher_id, section_id, title, description, assign_date, due_date, total_marks, difficulty, status, ai_generated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '2025-10-10', '2025-10-17', 10, 'Medium', 'active', false)
        RETURNING id;
      `, [institutionId, academicYearId, classId, subId, teacherProfileId, secId, hw.title, hw.desc]);
      
      homeworkIds.push({ id: res.rows[0].id, secId });
    }
    console.log('Homework seeded.');

    const submissionRows = [];
    for (const hw of homeworkIds) {
      const studentsInSection = enrollmentRows.filter(e => e.section_id === hw.secId).map(e => e.student_id);
      
      for (let j = 0; j < studentsInSection.length; j++) {
        const studentId = studentsInSection[j];
        const isScored = j % 2 === 0;
        const status = isScored ? 'scored' : 'submitted';
        const aiScore = isScored ? (6.0 + (j % 5) * 0.8) : null;
        
        const studentObj = studentRows.find(s => s.id === studentId);
        const tier = studentObj ? studentObj.plan_tier : 'STANDARD';
        
        let aiFeedback = null;
        if (isScored) {
          if (tier === 'PRO') {
            aiFeedback = {
              completeness: 8.5,
              concept_clarity: 8.0,
              presentation: 7.5,
              insights: ["Excellent logic structure.", "Work on hand-writing and readability."],
              wrong_answers: [],
              partial_answers: [{"question_number": 3, "description": "Partially correct solution."}]
            };
          } else {
            aiFeedback = {
              completeness: 8.0,
              concept_clarity: 7.0,
              presentation: 8.0
            };
          }
        }
        
        submissionRows.push({
          homework_id: hw.id,
          student_id: studentId,
          submitted_at: '2025-10-12 14:00:00+05:30',
          marks_obtained: isScored ? (aiScore ? aiScore : null) : null,
          ai_feedback: aiFeedback ? JSON.stringify(aiFeedback) : null,
          status,
          ai_score: aiScore,
          scored_at: isScored ? '2025-10-12 14:05:00+05:30' : null,
          attachment_urls: ['https://assets.margam.app/demo/student_sub_1.jpg']
        });
      }
    }
    console.log('Inserting homework submissions...');
    await bulkInsert(pgClient, 'homework_submissions', ['homework_id', 'student_id', 'submitted_at', 'marks_obtained', 'ai_feedback', 'status', 'ai_score', 'scored_at', 'attachment_urls'], submissionRows);

    // 17. Historical AI Scores (ai_scores) for Class 9-A students
    const aiScoresRows = [];
    for (let i = 0; i < class9Students.length; i++) {
      const studentId = class9Students[i];
      const dates = ['2025-10-01', '2025-10-05', '2025-10-10'];
      for (let d = 0; d < dates.length; d++) {
        aiScoresRows.push({
          student_id: studentId,
          score: 6.5 + (i % 4) * 0.8 + d * 0.3,
          date: dates[d]
        });
      }
    }
    console.log('Inserting historical AI scores...');
    await bulkInsert(pgClient, 'ai_scores', ['student_id', 'score', 'date'], aiScoresRows);

    await pgClient.query('COMMIT');
    console.log('\n✅ Database successfully reset and seeded!');

  } catch (err) {
    await pgClient.query('ROLLBACK');
    console.error('❌ Error seeding database:', err.message);
    console.error(err);
    throw err;
  } finally {
    await pgClient.end();
  }
}

seed().catch(console.error);
