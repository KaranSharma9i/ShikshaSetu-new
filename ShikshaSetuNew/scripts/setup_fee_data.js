const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Query the existing institution_id
    console.log('Querying institution...');
    const instRes = await client.query('SELECT id, name FROM institutions LIMIT 1');
    if (instRes.rows.length === 0) {
      throw new Error('No institutions found in database');
    }
    const institution = instRes.rows[0];
    const institutionId = institution.id;
    console.log(`Found institution: ${institution.name} (${institutionId})`);

    // 2. Query the existing academic_year_id for "2026-27"
    console.log('Querying academic year "2026-27"...');
    let ayRes = await client.query(
      'SELECT id, label FROM academic_years WHERE institution_id = $1 AND label = $2',
      [institutionId, '2026-27']
    );
    
    let academicYearId;
    if (ayRes.rows.length === 0) {
      console.log('Academic year "2026-27" not found. Inserting it to support session...');
      const insertAy = await client.query(
        `INSERT INTO academic_years (id, institution_id, label, starts_on, ends_on, is_current, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, '2026-27', '2026-03-31 18:30:00+00', '2027-03-30 18:30:00+00', false, now(), now()) RETURNING id`,
        [institutionId]
      );
      academicYearId = insertAy.rows[0].id;
    } else {
      academicYearId = ayRes.rows[0].id;
    }
    console.log(`Using academic year ID: ${academicYearId}`);

    // Count and print warning before deleting records
    console.log('Checking existing fee records for deletion warning...');
    const countPaymentsRes = await client.query(
      `SELECT COUNT(*) FROM fee_payments 
       WHERE fee_structure_id IN (
         SELECT id FROM fee_structures WHERE academic_year_id = $1
       )`,
      [academicYearId]
    );
    const countStructuresRes = await client.query(
      'SELECT COUNT(*) FROM fee_structures WHERE academic_year_id = $1',
      [academicYearId]
    );

    const oldPaymentsCount = parseInt(countPaymentsRes.rows[0].count, 10);
    const oldStructuresCount = parseInt(countStructuresRes.rows[0].count, 10);

    console.log('\n⚠️  WARNING: PRE-DELETE WIPE CHECK ⚠️');
    console.log(`About to delete existing fee data for academic year "2026-27":`);
    console.log(`- fee_payments:   ${oldPaymentsCount} records will be deleted`);
    console.log(`- fee_structures: ${oldStructuresCount} records will be deleted`);
    console.log('Wiping old records to ensure clean idempotent seed...\n');

    // Delete existing fee data
    if (oldPaymentsCount > 0) {
      await client.query(
        `DELETE FROM fee_payments 
         WHERE fee_structure_id IN (
           SELECT id FROM fee_structures WHERE academic_year_id = $1
         )`,
        [academicYearId]
      );
      console.log('Deleted existing fee_payments.');
    }
    if (oldStructuresCount > 0) {
      await client.query('DELETE FROM fee_structures WHERE academic_year_id = $1', [academicYearId]);
      console.log('Deleted existing fee_structures.');
    }

    // 3. For each class, insert one fee_structure record
    console.log('Fetching classes...');
    const classesRes = await client.query(
      'SELECT id, name FROM classes WHERE institution_id = $1 ORDER BY grade_number, name',
      [institutionId]
    );
    const classes = classesRes.rows;
    console.log(`Found ${classes.length} classes.`);

    if (classes.length === 0) {
      throw new Error('No classes found in database');
    }

    // Insert fee structures
    console.log('Inserting fee structures...');
    const structureMap = new Map(); // class_id -> { structureId, dueDate }
    
    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      // First 2 classes set to due date '2026-05-10' (overdue), all others '2026-05-30' (pending)
      const dueDate = i < 2 ? '2026-05-10' : '2026-05-30';
      const insertStructRes = await client.query(
        `INSERT INTO fee_structures (
           institution_id, academic_year_id, class_id, fee_name, amount, due_date, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now()) RETURNING id`,
        [institutionId, academicYearId, cls.id, 'Term 1 Tuition Fee', 17500, dueDate, `Seeded fee structure for ${cls.name}`]
      );
      const structureId = insertStructRes.rows[0].id;
      structureMap.set(cls.id, { structureId, dueDate });
    }
    console.log(`Successfully inserted ${classes.length} fee structures.`);

    // 4. Query active students spread across different classes (enrolled in current active session)
    console.log('Querying active enrolled students...');
    const studentsRes = await client.query(
      `SELECT s.id AS student_id, sec.class_id, u.full_name, c.name AS class_name
       FROM students s
       JOIN enrollments e ON e.student_id = s.id
       JOIN sections sec ON sec.id = e.section_id
       JOIN classes c ON c.id = sec.class_id
       JOIN users u ON u.id = s.user_id
       WHERE s.institution_id = $1 AND e.is_active = true
       ORDER BY sec.class_id, s.id`,
      [institutionId]
    );

    const students = studentsRes.rows;
    console.log(`Found ${students.length} active students.`);

    if (students.length < 20) {
      throw new Error(`Not enough active students to select 20 (found ${students.length})`);
    }

    // Group students by class
    const studentsByClass = new Map(); // class_id -> student_list
    students.forEach(student => {
      if (!studentsByClass.has(student.class_id)) {
        studentsByClass.set(student.class_id, []);
      }
      studentsByClass.get(student.class_id).push(student);
    });

    console.log(`Students grouped into ${studentsByClass.size} classes.`);

    // Let's identify the first 2 classes (overdue classes)
    const overdueClassIds = classes.slice(0, 2).map(c => c.id);
    const pendingClassIds = classes.slice(2).map(c => c.id);

    const selectedOverdue = [];
    const selectedPending = [];
    const selectedPaid = [];

    // Let's pick 2 overdue students from the first 2 classes
    for (const classId of overdueClassIds) {
      const list = studentsByClass.get(classId) || [];
      if (list.length > 0 && selectedOverdue.length < 2) {
        const student = list.shift(); // remove from class list to avoid double picking
        selectedOverdue.push(student);
      }
    }
    // If we couldn't get 2 from the distinct first 2 classes, pick any remaining from either of them
    if (selectedOverdue.length < 2) {
      for (const classId of overdueClassIds) {
        const list = studentsByClass.get(classId) || [];
        while (list.length > 0 && selectedOverdue.length < 2) {
          const student = list.shift();
          selectedOverdue.push(student);
        }
      }
    }

    console.log(`Selected ${selectedOverdue.length} overdue students.`);

    // Let's pick 4 pending students from the classes with due date 2026-05-30
    // Try to spread across different classes
    let classIndex = 0;
    while (selectedPending.length < 4 && classIndex < pendingClassIds.length) {
      const classId = pendingClassIds[classIndex];
      const list = studentsByClass.get(classId) || [];
      if (list.length > 0) {
        const student = list.shift();
        selectedPending.push(student);
      }
      classIndex++;
    }
    // If still not enough, pick from any remaining list in pending classes
    if (selectedPending.length < 4) {
      for (const classId of pendingClassIds) {
        const list = studentsByClass.get(classId) || [];
        while (list.length > 0 && selectedPending.length < 4) {
          const student = list.shift();
          selectedPending.push(student);
        }
      }
    }

    console.log(`Selected ${selectedPending.length} pending students.`);

    // Let's pick 14 paid students from the remaining students across all classes (preferably pending classes first)
    // We iterate through all classes in a round-robin style to ensure they are spread out
    let hasMoreStudents = true;
    while (selectedPaid.length < 14 && hasMoreStudents) {
      hasMoreStudents = false;
      for (const [classId, list] of studentsByClass.entries()) {
        if (list.length > 0 && selectedPaid.length < 14) {
          const student = list.shift();
          selectedPaid.push(student);
          hasMoreStudents = true;
        }
      }
    }

    console.log(`Selected ${selectedPaid.length} paid students.`);

    if (selectedOverdue.length !== 2 || selectedPending.length !== 4 || selectedPaid.length !== 14) {
      throw new Error(`Failed to satisfy student selection counts (Overdue: ${selectedOverdue.length}/2, Pending: ${selectedPending.length}/4, Paid: ${selectedPaid.length}/14)`);
    }

    // Now insert the fee_payment records
    console.log('Inserting fee payments...');
    let totalPaymentsInserted = 0;

    // 14 PAID students
    for (let i = 0; i < selectedPaid.length; i++) {
      const student = selectedPaid[i];
      const structInfo = structureMap.get(student.class_id);
      if (!structInfo) throw new Error(`Structure not found for class ${student.class_id}`);
      
      const paymentMethod = ['cash', 'online', 'cheque'][i % 3];
      const paymentDate = '2026-05-20T10:00:00Z'; // before due date '2026-05-30'
      
      await client.query(
        `INSERT INTO fee_payments (
           fee_structure_id, student_id, amount_paid, payment_date, payment_method, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, now(), now())`,
        [
          structInfo.structureId,
          student.student_id,
          17500,
          paymentDate,
          paymentMethod,
          `Paid in full via ${paymentMethod}`
        ]
      );
      totalPaymentsInserted++;
      console.log(`[Paid] Student: ${student.full_name} (${student.class_name}) - Amount: 17500`);
    }

    // 4 PENDING students
    for (let i = 0; i < selectedPending.length; i++) {
      const student = selectedPending[i];
      const structInfo = structureMap.get(student.class_id);
      if (!structInfo) throw new Error(`Structure not found for class ${student.class_id}`);
      
      await client.query(
        `INSERT INTO fee_payments (
           fee_structure_id, student_id, amount_paid, payment_date, payment_method, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, now(), $4, $5, now(), now())`,
        [
          structInfo.structureId,
          student.student_id,
          0,
          null,
          'Pending payment record'
        ]
      );
      totalPaymentsInserted++;
      console.log(`[Pending] Student: ${student.full_name} (${student.class_name}) - Amount: 0 (Due: ${structInfo.dueDate})`);
    }

    // 2 OVERDUE students
    for (let i = 0; i < selectedOverdue.length; i++) {
      const student = selectedOverdue[i];
      const structInfo = structureMap.get(student.class_id);
      if (!structInfo) throw new Error(`Structure not found for class ${student.class_id}`);
      
      await client.query(
        `INSERT INTO fee_payments (
           fee_structure_id, student_id, amount_paid, payment_date, payment_method, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, now(), $4, $5, now(), now())`,
        [
          structInfo.structureId,
          student.student_id,
          0,
          null,
          'Overdue payment record'
        ]
      );
      totalPaymentsInserted++;
      console.log(`[Overdue] Student: ${student.full_name} (${student.class_name}) - Amount: 0 (Due: ${structInfo.dueDate})`);
    }

    console.log(`\n✅ Fee data setup completed successfully. Seeded ${totalPaymentsInserted} payments for 20 students.`);

  } catch (err) {
    console.error('Error seeding fee data:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
