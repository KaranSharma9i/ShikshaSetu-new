import { 
  getStudentAttendanceSummary, 
  getStudentAttendanceList, 
  getStaffAttendanceSummary, 
  getStaffAttendanceList, 
  getDepartments,
  getInstitutionSections,
  resolveStudentAcademicYear,
  resolveStaffAcademicYear
} from '../src/repositories/attendanceRepository';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Get institution
    const instRes = await client.query('SELECT id, name FROM institutions LIMIT 1');
    if (instRes.rows.length === 0) throw new Error('No institutions found');
    const institutionId = instRes.rows[0].id;
    console.log(`Institution ID: ${institutionId}`);

    // 2. Fetch sections
    console.log('\n--- Sections ---');
    const sections = await getInstitutionSections(institutionId);
    console.log(sections.map(s => `${s.name} (${s.id})`));
    if (sections.length === 0) throw new Error('No sections found');

    const firstSectionId = sections[0].id;

    // 3. Student Attendance Summary for May 2026
    console.log('\n--- Student Attendance Summary (May 2026) ---');
    const resolvedStudentAY = await resolveStudentAcademicYear(institutionId, firstSectionId, 5, 2026);
    if (!resolvedStudentAY) throw new Error('No resolved academic year for student section');
    const studentSummary = await getStudentAttendanceSummary(institutionId, firstSectionId, resolvedStudentAY.id, resolvedStudentAY.resolvedYear, 5);
    console.log(`Monthly Avg: ${studentSummary.monthlyAvg}%`);
    console.log(`Critical Days: ${studentSummary.criticalDays}`);
    console.log(`Calendar Data (Sample first 5):`, studentSummary.calendarData.slice(0, 5));
    const todayCell = studentSummary.calendarData.find(c => c.date === '2026-05-25');
    console.log(`Calendar Data (Sample May 25):`, todayCell);
    console.log(`Holidays in Calendar:`, studentSummary.calendarData.filter(c => c.type === 'holiday'));
    console.log(`Insight: "${studentSummary.insight}"`);

    // 4. Student Attendance List
    console.log('\n--- Student Attendance List (May 2026) ---');
    const studentList = await getStudentAttendanceList(institutionId, firstSectionId, resolvedStudentAY.id, resolvedStudentAY.resolvedYear, 5);
    console.log(`Total students: ${studentList.length}`);
    console.log(`Sample first 3 students (sorted by critical first):`);
    console.log(studentList.slice(0, 3));

    // 5. Staff Departments
    console.log('\n--- Staff Departments ---');
    const departments = await getDepartments(institutionId);
    console.log(departments);

    // 6. Staff Attendance Summary (May 2026)
    console.log('\n--- Staff Attendance Summary (May 2026) ---');
    const resolvedStaffAY = await resolveStaffAcademicYear(institutionId, 5, 2026);
    if (!resolvedStaffAY) throw new Error('No resolved academic year for staff');
    const staffSummary = await getStaffAttendanceSummary(institutionId, resolvedStaffAY.id, resolvedStaffAY.resolvedYear, 5, 'All');
    console.log(`Monthly Avg: ${staffSummary.monthlyAvg}%`);
    console.log(`Staff On Leave Today: ${staffSummary.staffOnLeaveToday}`);
    console.log(`Insight: "${staffSummary.insight}"`);

    // 7. Staff Attendance List (May 2026)
    console.log('\n--- Staff Attendance List (May 2026) ---');
    const staffList = await getStaffAttendanceList(institutionId, resolvedStaffAY.id, resolvedStaffAY.resolvedYear, 5, 'All');
    console.log(`Total staff: ${staffList.length}`);
    console.log(`Sample first 3 staff:`);
    console.log(staffList.slice(0, 3));

    // 8. Staff Attendance Summary in April 2026 (should show on_leave pattern)
    console.log('\n--- Staff Attendance Summary (April 2026 - Planned Leave Check) ---');
    const resolvedStaffAYApril = await resolveStaffAcademicYear(institutionId, 4, 2026);
    if (!resolvedStaffAYApril) throw new Error('No resolved academic year for staff in April');
    const staffSummaryApril = await getStaffAttendanceSummary(institutionId, resolvedStaffAYApril.id, resolvedStaffAYApril.resolvedYear, 4, 'All');
    console.log(`Monthly Avg (April): ${staffSummaryApril.monthlyAvg}%`);
    console.log(`Insight (April): "${staffSummaryApril.insight}"`);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await client.end();
  }
}

verify();
