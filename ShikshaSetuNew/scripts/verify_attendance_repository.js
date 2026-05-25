const { 
  getStudentAttendanceSummary, 
  getStudentAttendanceList, 
  getStaffAttendanceSummary, 
  getStaffAttendanceList, 
  getDepartments,
  getInstitutionSections
} = require('../src/repositories/attendanceRepository');
const { Client } = require('pg');
require('dotenv').config();

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
    const studentSummary = await getStudentAttendanceSummary(institutionId, firstSectionId, 5, 2026);
    console.log(`Monthly Avg: ${studentSummary.monthlyAvg}%`);
    console.log(`Critical Days: ${studentSummary.criticalDays}`);
    console.log(`Calendar Data (Sample first 5):`, studentSummary.calendarData.slice(0, 5));
    console.log(`Calendar Data (Sample May 25):`, studentSummary.calendarData.find(c => c.date === '2026-05-25'));
    console.log(`Holidays in Calendar:`, studentSummary.calendarData.filter(c => c.type === 'holiday'));
    console.log(`Insight: "${studentSummary.insight}"`);

    // 4. Student Attendance List
    console.log('\n--- Student Attendance List (May 2026) ---');
    const studentList = await getStudentAttendanceList(institutionId, firstSectionId, 5, 2026);
    console.log(`Total students: ${studentList.length}`);
    console.log(`Sample first 3 students (sorted by critical first):`);
    console.log(studentList.slice(0, 3));
    console.log(`Sample last student:`);
    console.log(studentList[studentList.length - 1]);

    // 5. Staff Departments
    console.log('\n--- Staff Departments ---');
    const departments = await getDepartments(institutionId);
    console.log(departments);

    // 6. Staff Attendance Summary (May 2026)
    console.log('\n--- Staff Attendance Summary (May 2026) ---');
    const staffSummary = await getStaffAttendanceSummary(institutionId, 'All', 5, 2026);
    console.log(`Monthly Avg: ${staffSummary.monthlyAvg}%`);
    console.log(`Staff On Leave Today: ${staffSummary.staffOnLeaveToday}`);
    console.log(`Insight: "${staffSummary.insight}"`);

    // 7. Staff Attendance List (May 2026)
    console.log('\n--- Staff Attendance List (May 2026) ---');
    const staffList = await getStaffAttendanceList(institutionId, 'All', 5, 2026);
    console.log(`Total staff: ${staffList.length}`);
    console.log(`Sample first 3 staff:`);
    console.log(staffList.slice(0, 3));

    // 8. Staff Attendance Summary in April 2026 (should show on_leave pattern)
    console.log('\n--- Staff Attendance Summary (April 2026 - Planned Leave Check) ---');
    const staffSummaryApril = await getStaffAttendanceSummary(institutionId, 'All', 4, 2026);
    console.log(`Monthly Avg (April): ${staffSummaryApril.monthlyAvg}%`);
    console.log(`Insight (April): "${staffSummaryApril.insight}"`);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await client.end();
  }
}

verify();
