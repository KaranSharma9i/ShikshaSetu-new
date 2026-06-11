import { getInstitutionSections, getDepartments, resolveStudentAcademicYear, getStudentAttendanceSummary, getStudentAttendanceList, getInstitutionAttendance } from "../src/repositories/attendanceRepository";
import { supabase } from "../src/lib/supabase";
require('dotenv').config();

async function run() {
  const instId = '65ac109d-2e8e-4bd8-8b59-8b557a1bca16';
  console.log("Starting verification for institution:", instId);

  try {
    console.log("1. Calling getInstitutionSections...");
    const sections = await getInstitutionSections(instId);
    console.log("Sections count:", sections.length);
    console.log("Sections:", sections);

    console.log("2. Calling getDepartments...");
    const depts = await getDepartments(instId);
    console.log("Departments:", depts);

    if (sections.length > 0) {
      const selectedSectionId = sections[0].id;
      console.log("3. Calling resolveStudentAcademicYear for section:", selectedSectionId);
      const resolvedAY = await resolveStudentAcademicYear(instId, selectedSectionId, 5, 2026);
      console.log("Resolved AY:", resolvedAY);

      if (resolvedAY) {
        console.log("4. Calling getStudentAttendanceSummary...");
        const summary = await getStudentAttendanceSummary(instId, selectedSectionId, resolvedAY.id, resolvedAY.resolvedYear, 5);
        console.log("Summary avg:", summary.monthlyAvg, "critical:", summary.criticalDays);

        console.log("5. Calling getStudentAttendanceList...");
        const list = await getStudentAttendanceList(instId, selectedSectionId, resolvedAY.id, resolvedAY.resolvedYear, 5);
        console.log("List count:", list.length);
      }
    }

    console.log("6. Calling getInstitutionAttendance...");
    const breakdown = await getInstitutionAttendance(instId, "2026-05-25");
    console.log("Breakdown count:", breakdown.length);
    console.log("Breakdown:", breakdown);

    console.log("All repo calls completed successfully!");
  } catch (err) {
    console.error("CRITICAL ERROR DURING REPO CALLS:", err);
  }
}

run();
