import { supabase } from "../lib/supabase";

export interface CalendarDay {
  date: string;
  type: "present" | "absent" | "holiday" | "weekend";
}

export interface StudentAttendanceSummary {
  monthlyAvg: number;
  criticalDays: number;
  calendarData: CalendarDay[];
  insight: string;
  resolvedYear: number;
}

export interface StudentAttendanceListItem {
  studentId: string;
  studentName: string;
  initials: string;
  attendancePercent: number;
  status: "excellent" | "leadership" | "warning" | "critical";
  presentDays: number;
  totalDays: number;
}

export interface StaffAttendanceSummary {
  monthlyAvg: number;
  staffOnLeaveToday: number;
  calendarData: CalendarDay[];
  insight: string;
  resolvedYear: number;
}

export interface StaffAttendanceListItem {
  teacherId: string;
  teacherName: string;
  initials: string;
  subject: string;
  attendancePercent: number;
  status: "excellent" | "leadership" | "warning" | "critical";
  presentDays: number;
  totalDays: number;
}

// Helper to determine active academic year ID for a given date
async function getAcademicYearId(institutionId: string, year: number, month: number): Promise<string> {
  const dateStr = `${year}-${String(month).padStart(2, "0")}-15`;
  
  // Try to find the academic year containing the middle of the month
  const { data: ay } = await supabase
    .from("academic_years")
    .select("id")
    .eq("institution_id", institutionId)
    .lte("starts_on", dateStr)
    .gte("ends_on", dateStr)
    .is("deleted_at", null)
    .maybeSingle();

  if (ay) return ay.id;

  // Fallback: search for '2026-27'
  const { data: fallback } = await supabase
    .from("academic_years")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("label", "2026-27")
    .is("deleted_at", null)
    .maybeSingle();

  if (fallback) return fallback.id;

  // Final fallback to is_current
  const { data: current } = await supabase
    .from("academic_years")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("is_current", true)
    .is("deleted_at", null)
    .maybeSingle();

  return current?.id || "";
}

// Helper to get initials
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Badge thresholds
export function getAttendanceStatus(percent: number): "excellent" | "leadership" | "warning" | "critical" {
  if (percent >= 95) return "excellent";
  if (percent >= 90) return "leadership";
  if (percent >= 85) return "warning";
  return "critical";
}

export interface ResolvedAcademicYear {
  id: string;
  starts_on: string;
  ends_on: string;
  resolvedYear: number;
}

export async function resolveStudentAcademicYear(
  institutionId: string,
  sectionId: string,
  month: number,
  year: number
): Promise<ResolvedAcademicYear | null> {
  const dateStr = `${year}-${String(month).padStart(2, "0")}-15`;
  
  let { data: ay } = await supabase
    .from("academic_years")
    .select("id, starts_on, ends_on")
    .eq("institution_id", institutionId)
    .lte("starts_on", dateStr)
    .gte("ends_on", dateStr)
    .is("deleted_at", null)
    .maybeSingle();

  if (!ay) {
    const { data: fallback } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .eq("label", "2026-27")
      .is("deleted_at", null)
      .maybeSingle();
    ay = fallback;
  }

  if (!ay) {
    const { data: current } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .is("deleted_at", null)
      .maybeSingle();
    ay = current;
  }

  if (!ay) return null;

  let finalAy = ay;

  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId)
    .eq("academic_year_id", ay.id)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (count === 0) {
    const { data: ays } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .is("deleted_at", null)
      .order("starts_on", { ascending: false });

    if (ays && ays.length > 0) {
      for (const candidate of ays) {
        const { count: ayEnrollCount } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("section_id", sectionId)
          .eq("academic_year_id", candidate.id)
          .eq("is_active", true)
          .is("deleted_at", null);

        if (ayEnrollCount && ayEnrollCount > 0) {
          finalAy = candidate;
          break;
        }
      }
    }
  }

  const ayStartYear = new Date(finalAy.starts_on).getFullYear();
  const resolvedYear = month >= 4 ? ayStartYear : ayStartYear + 1;

  return {
    id: finalAy.id,
    starts_on: finalAy.starts_on,
    ends_on: finalAy.ends_on,
    resolvedYear,
  };
}

export async function resolveStaffAcademicYear(
  institutionId: string,
  month: number,
  year: number
): Promise<ResolvedAcademicYear | null> {
  const dateStr = `${year}-${String(month).padStart(2, "0")}-15`;
  
  let { data: ay } = await supabase
    .from("academic_years")
    .select("id, starts_on, ends_on")
    .eq("institution_id", institutionId)
    .lte("starts_on", dateStr)
    .gte("ends_on", dateStr)
    .is("deleted_at", null)
    .maybeSingle();

  if (!ay) {
    const { data: fallback } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .eq("label", "2026-27")
      .is("deleted_at", null)
      .maybeSingle();
    ay = fallback;
  }

  if (!ay) {
    const { data: current } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .is("deleted_at", null)
      .maybeSingle();
    ay = current;
  }

  if (!ay) return null;

  const ayStartYear = new Date(ay.starts_on).getFullYear();
  const resolvedYear = month >= 4 ? ayStartYear : ayStartYear + 1;

  return {
    id: ay.id,
    starts_on: ay.starts_on,
    ends_on: ay.ends_on,
    resolvedYear,
  };
}

// 1. Get Student Attendance Summary
export async function getStudentAttendanceSummary(
  institutionId: string,
  sectionId: string,
  academicYearId: string,
  resolvedYear: number,
  month: number
): Promise<StudentAttendanceSummary> {
  try {
    if (!academicYearId || !sectionId) {
      return { monthlyAvg: 0, criticalDays: 0, calendarData: [], insight: "No data available.", resolvedYear: resolvedYear || new Date().getFullYear() };
    }

    const startDate = `${resolvedYear}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(resolvedYear, month, 0).getDate();
    const endDate = `${resolvedYear}-${String(month).padStart(2, "0")}-${lastDay}`;

    // A. Query students in section
    const { data: students } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("section_id", sectionId)
      .eq("academic_year_id", academicYearId)
      .eq("is_active", true)
      .is("deleted_at", null);

    const studentIds = students?.map(s => s.student_id) || [];

    // B. Query student attendance if students exist
    let attendance: any[] = [];
    if (studentIds.length > 0) {
      const { data } = await supabase
        .from("student_attendance")
        .select("date, status, student_id")
        .in("student_id", studentIds)
        .eq("academic_year_id", academicYearId)
        .gte("date", startDate)
        .lte("date", endDate)
        .is("deleted_at", null);
      if (data) {
        attendance = data;
      }
    }

    // C. Query holidays
    const { data: holidays } = await supabase
      .from("holidays")
      .select("date")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    const holidayDates = new Set(holidays?.map(h => h.date) || []);

    // D. Compute stats and calendar grid
    const todayStr = new Date().toISOString().slice(0, 10);
    const calendarData: CalendarDay[] = [];
    const dailyRates: Record<string, { present: number; total: number }> = {};

    attendance.forEach(att => {
      const dStr = att.date;
      if (att.status === "holiday") return;
      if (!dailyRates[dStr]) {
        dailyRates[dStr] = { present: 0, total: 0 };
      }
      dailyRates[dStr].total++;
      if (att.status === "present" || att.status === "late") {
        dailyRates[dStr].present++;
      }
    });

    let totalPresent = 0;
    let totalRecords = 0;
    attendance.forEach(att => {
      if (att.status !== "holiday") {
        totalRecords++;
        if (att.status === "present" || att.status === "late") {
          totalPresent++;
        }
      }
    });

    const monthlyAvg = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    let criticalDays = 0;
    for (const dStr in dailyRates) {
      const day = dailyRates[dStr];
      if (day.total > 0) {
        const rate = (day.present / day.total) * 100;
        if (rate < 85) {
          criticalDays++;
        }
      }
    }

    // Build Calendar Data
    for (let d = 1; d <= lastDay; d++) {
      const dStr = `${resolvedYear}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(resolvedYear, month - 1, d);
      const dayOfWeek = dateObj.getDay();

      if (dStr > todayStr) {
        // Future dates (greyed out)
        calendarData.push({ date: dStr, type: "weekend" });
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        calendarData.push({ date: dStr, type: "weekend" });
      } else if (holidayDates.has(dStr)) {
        calendarData.push({ date: dStr, type: "holiday" });
      } else {
        // Past school day - check if class avg was low (absent) or okay (present)
        const dayStats = dailyRates[dStr];
        let type: "present" | "absent" = "present";
        if (dayStats && dayStats.total > 0) {
          const rate = (dayStats.present / dayStats.total) * 100;
          if (rate < 85) {
            type = "absent"; // highlight critical class absence days on calendar!
          }
        }
        calendarData.push({ date: dStr, type });
      }
    }

    // Generate insight
    const sectionRes = await supabase
      .from("sections")
      .select(`
        name,
        class:classes!inner (
          name
        )
      `)
      .eq("id", sectionId)
      .maybeSingle();

    const className = sectionRes?.data 
      ? `${(sectionRes.data as any).class?.name}-${sectionRes.data.name}` 
      : "";

    const insight = studentIds.length === 0
      ? "No active students in this class."
      : await generateInsight(sectionId, academicYearId, resolvedYear, month, attendance || [], className, monthlyAvg, institutionId);

    return {
      monthlyAvg: parseFloat(monthlyAvg.toFixed(1)),
      criticalDays,
      calendarData,
      insight,
      resolvedYear
    };
  } catch (error) {
    console.error("Error in getStudentAttendanceSummary repository:", error);
    return { monthlyAvg: 0, criticalDays: 0, calendarData: [], insight: "Failed to load summary.", resolvedYear: resolvedYear || new Date().getFullYear() };
  }
}

// 2. Get Student Attendance List
export async function getStudentAttendanceList(
  institutionId: string,
  sectionId: string,
  academicYearId: string,
  resolvedYear: number,
  month: number,
  search?: string
): Promise<StudentAttendanceListItem[]> {
  try {
    if (!academicYearId || !sectionId) return [];

    const startDate = `${resolvedYear}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(resolvedYear, month, 0).getDate();
    const endDate = `${resolvedYear}-${String(month).padStart(2, "0")}-${lastDay}`;

    // A. Query students
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select(`
        student_id,
        student:students!inner (
          id,
          user:users!inner (
            full_name
          )
        )
      `)
      .eq("section_id", sectionId)
      .eq("academic_year_id", academicYearId)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (!enrolls || enrolls.length === 0) return [];

    // B. Query student attendance
    const studentIds = enrolls.map(e => e.student_id);
    const { data: attendance } = await supabase
      .from("student_attendance")
      .select("student_id, status")
      .in("student_id", studentIds)
      .eq("academic_year_id", academicYearId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    // Group attendance by student
    const studentAttMap: Record<string, { present: number; total: number }> = {};
    studentIds.forEach(id => {
      studentAttMap[id] = { present: 0, total: 0 };
    });

    attendance?.forEach(att => {
      if (att.status === "holiday") return;
      if (!studentAttMap[att.student_id]) {
        studentAttMap[att.student_id] = { present: 0, total: 0 };
      }
      studentAttMap[att.student_id].total++;
      if (att.status === "present" || att.status === "late") {
        studentAttMap[att.student_id].present++;
      }
    });

    // Map to list item
    let list: StudentAttendanceListItem[] = enrolls.map((e: any) => {
      const s = e.student;
      const userObj = Array.isArray(s.user) ? s.user[0] : s.user;
      const name = userObj?.full_name || "Unknown Student";
      const attStats = studentAttMap[s.id] || { present: 0, total: 0 };
      
      const attendancePercent = attStats.total > 0 
        ? Math.round((attStats.present / attStats.total) * 100)
        : 100;

      return {
        studentId: s.id,
        studentName: name,
        initials: getInitials(name),
        attendancePercent,
        status: getAttendanceStatus(attendancePercent),
        presentDays: attStats.present,
        totalDays: attStats.total
      };
    });

    // Apply local search filter
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(item => item.studentName.toLowerCase().includes(q));
    }

    // Sort: Critical first, then warning, then leadership, then excellent
    const orderMap = {
      critical: 0,
      warning: 1,
      leadership: 2,
      excellent: 3
    };

    return list.sort((a, b) => {
      if (orderMap[a.status] !== orderMap[b.status]) {
        return orderMap[a.status] - orderMap[b.status];
      }
      return a.studentName.localeCompare(b.studentName);
    });
  } catch (error) {
    console.error("Error in getStudentAttendanceList repository:", error);
    return [];
  }
}

// 3. Get Staff Attendance Summary
export async function getStaffAttendanceSummary(
  institutionId: string,
  academicYearId: string,
  resolvedYear: number,
  month: number,
  departmentId?: string
): Promise<StaffAttendanceSummary> {
  try {
    if (!academicYearId) {
      return { monthlyAvg: 0, staffOnLeaveToday: 0, calendarData: [], insight: "No data available.", resolvedYear: resolvedYear || new Date().getFullYear() };
    }

    const startDate = `${resolvedYear}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(resolvedYear, month, 0).getDate();
    const endDate = `${resolvedYear}-${String(month).padStart(2, "0")}-${lastDay}`;

    // A. Fetch teachers in department
    let teacherQuery = supabase
      .from("teachers")
      .select("id, specialization")
      .eq("institution_id", institutionId)
      .is("deleted_at", null);

    if (departmentId && departmentId !== "All") {
      teacherQuery = teacherQuery.eq("specialization", departmentId);
    }

    const { data: teachers } = await teacherQuery;
    const teacherIds = teachers?.map(t => t.id) || [];
    if (teacherIds.length === 0) {
      return { monthlyAvg: 0, staffOnLeaveToday: 0, calendarData: [], insight: "No teachers found.", resolvedYear };
    }

    // B. Fetch teacher attendance
    const { data: attendance } = await supabase
      .from("teacher_attendance")
      .select("date, status, teacher_id")
      .in("teacher_id", teacherIds)
      .eq("academic_year_id", academicYearId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    // C. Fetch holidays
    const { data: holidays } = await supabase
      .from("holidays")
      .select("date")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    const holidayDates = new Set(holidays?.map(h => h.date) || []);

    // D. Compute stats
    const todayStr = new Date().toISOString().slice(0, 10);
    const calendarData: CalendarDay[] = [];
    const dailyRates: Record<string, { present: number; total: number }> = {};

    attendance?.forEach(att => {
      const dStr = att.date;
      if (att.status === "holiday") return;
      if (!dailyRates[dStr]) {
        dailyRates[dStr] = { present: 0, total: 0 };
      }
      dailyRates[dStr].total++;
      if (att.status === "present" || att.status === "late") {
        dailyRates[dStr].present++;
      }
    });

    let totalPresent = 0;
    let totalRecords = 0;
    attendance?.forEach(att => {
      if (att.status !== "holiday") {
        totalRecords++;
        if (att.status === "present" || att.status === "late") {
          totalPresent++;
        }
      }
    });

    const monthlyAvg = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    // Count on leave today
    const { data: leaves } = await supabase
      .from("teacher_attendance")
      .select(`
        id,
        teacher:teachers!inner (
          specialization
        )
      `)
      .eq("date", todayStr)
      .eq("status", "on_leave")
      .eq("teacher.institution_id", institutionId)
      .is("deleted_at", null);

    let staffOnLeaveToday = 0;
    if (leaves) {
      if (departmentId && departmentId !== "All") {
        staffOnLeaveToday = leaves.filter((l: any) => l.teacher?.specialization === departmentId).length;
      } else {
        staffOnLeaveToday = leaves.length;
      }
    }

    // Build Calendar Data
    for (let d = 1; d <= lastDay; d++) {
      const dStr = `${resolvedYear}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(resolvedYear, month - 1, d);
      const dayOfWeek = dateObj.getDay();

      if (dStr > todayStr) {
        calendarData.push({ date: dStr, type: "weekend" });
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        calendarData.push({ date: dStr, type: "weekend" });
      } else if (holidayDates.has(dStr)) {
        calendarData.push({ date: dStr, type: "holiday" });
      } else {
        const dayStats = dailyRates[dStr];
        let type: "present" | "absent" = "present";
        if (dayStats && dayStats.total > 0) {
          const rate = (dayStats.present / dayStats.total) * 100;
          if (rate < 85) {
            type = "absent";
          }
        }
        calendarData.push({ date: dStr, type });
      }
    }

    // Generate teacher insight
    let insight = "Staff attendance is on track this month.";
    if (staffOnLeaveToday > 0) {
      insight = `${staffOnLeaveToday} staff member${staffOnLeaveToday > 1 ? "s are" : " is"} on leave today. Check schedule for class coverage.`;
    } else if (monthlyAvg < 90) {
      insight = "Staff attendance is slightly lower than target this month. Consider checking leave policy compliance.";
    }

    return {
      monthlyAvg: parseFloat(monthlyAvg.toFixed(1)),
      staffOnLeaveToday,
      calendarData,
      insight,
      resolvedYear
    };
  } catch (error) {
    console.error("Error in getStaffAttendanceSummary repository:", error);
    return { monthlyAvg: 0, staffOnLeaveToday: 0, calendarData: [], insight: "Failed to load summary.", resolvedYear: resolvedYear || new Date().getFullYear() };
  }
}

// 4. Get Staff Attendance List
export async function getStaffAttendanceList(
  institutionId: string,
  academicYearId: string,
  resolvedYear: number,
  month: number,
  departmentId?: string,
  search?: string
): Promise<StaffAttendanceListItem[]> {
  try {
    if (!academicYearId) return [];

    const startDate = `${resolvedYear}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(resolvedYear, month, 0).getDate();
    const endDate = `${resolvedYear}-${String(month).padStart(2, "0")}-${lastDay}`;

    // A. Query teachers
    let teacherQuery = supabase
      .from("teachers")
      .select(`
        id,
        specialization,
        user:users!inner (
          full_name
        )
      `)
      .eq("institution_id", institutionId)
      .is("deleted_at", null);

    if (departmentId && departmentId !== "All") {
      teacherQuery = teacherQuery.eq("specialization", departmentId);
    }

    const { data: teachers } = await teacherQuery;
    if (!teachers || teachers.length === 0) return [];

    // B. Query teacher attendance
    const teacherIds = teachers.map(t => t.id);
    const { data: attendance } = await supabase
      .from("teacher_attendance")
      .select("teacher_id, status")
      .in("teacher_id", teacherIds)
      .eq("academic_year_id", academicYearId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    // Group attendance by teacher
    const teacherAttMap: Record<string, { present: number; total: number }> = {};
    teacherIds.forEach(id => {
      teacherAttMap[id] = { present: 0, total: 0 };
    });

    attendance?.forEach(att => {
      if (att.status === "holiday") return;
      if (!teacherAttMap[att.teacher_id]) {
        teacherAttMap[att.teacher_id] = { present: 0, total: 0 };
      }
      teacherAttMap[att.teacher_id].total++;
      if (att.status === "present" || att.status === "late") {
        teacherAttMap[att.teacher_id].present++;
      }
    });

    // Map to list item
    let list: StaffAttendanceListItem[] = teachers.map((t: any) => {
      const userObj = Array.isArray(t.user) ? t.user[0] : t.user;
      const name = userObj?.full_name || "Unknown Staff";
      const attStats = teacherAttMap[t.id] || { present: 0, total: 0 };
      
      const attendancePercent = attStats.total > 0 
        ? Math.round((attStats.present / attStats.total) * 100)
        : 100;

      return {
        teacherId: t.id,
        teacherName: name,
        initials: getInitials(name),
        subject: t.specialization || "General",
        attendancePercent,
        status: getAttendanceStatus(attendancePercent),
        presentDays: attStats.present,
        totalDays: attStats.total
      };
    });

    // Apply local search filter
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(item => item.teacherName.toLowerCase().includes(q));
    }

    // Sort: Critical first, then warning, then leadership, then excellent
    const orderMap = {
      critical: 0,
      warning: 1,
      leadership: 2,
      excellent: 3
    };

    return list.sort((a, b) => {
      if (orderMap[a.status] !== orderMap[b.status]) {
        return orderMap[a.status] - orderMap[b.status];
      }
      return a.teacherName.localeCompare(b.teacherName);
    });
  } catch (error) {
    console.error("Error in getStaffAttendanceList repository:", error);
    return [];
  }
}

// 5. Get distinct Departments (Specializations) for Staff Toggle
export async function getDepartments(institutionId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("teachers")
      .select("specialization")
      .eq("institution_id", institutionId)
      .is("deleted_at", null);

    if (error) throw error;

    const departmentsSet = new Set<string>();
    data?.forEach(t => {
      if (t.specialization) {
        departmentsSet.add(t.specialization);
      }
    });

    return Array.from(departmentsSet).sort();
  } catch (error) {
    console.error("Error in getDepartments repository:", error);
    return [];
  }
}

// 6. Generate Rule-based insight text
export async function generateInsight(
  sectionId: string,
  academicYearId: string,
  resolvedYear: number,
  month: number,
  attendanceData: any[],
  className: string,
  monthlyAvg: number,
  institutionId: string
): Promise<string> {
  try {
    // Rule 1: Cluster absences on same weekday
    const weekdayAbsences: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // 1: Mon to 5: Fri
    
    // We only evaluate critical students' absences
    const studentAbsCount: Record<string, number> = {};
    attendanceData.forEach(att => {
      if (att.status === "absent") {
        studentAbsCount[att.student_id] = (studentAbsCount[att.student_id] || 0) + 1;
      }
    });

    const criticalStudentIds = Object.keys(studentAbsCount).filter(sid => studentAbsCount[sid] >= 5);

    if (criticalStudentIds.length > 0) {
      attendanceData.forEach(att => {
        if (att.status === "absent" && criticalStudentIds.includes(att.student_id)) {
          const dateObj = new Date(att.date);
          const day = dateObj.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
          if (day >= 1 && day <= 5) {
            weekdayAbsences[day]++;
          }
        }
      });

      let maxAbsDay = 1;
      let maxAbsCount = 0;
      for (const day in weekdayAbsences) {
        if (weekdayAbsences[day] > maxAbsCount) {
          maxAbsCount = weekdayAbsences[day];
          maxAbsDay = Number(day);
        }
      }

      const totalAbs = Object.values(weekdayAbsences).reduce((a, b) => a + b, 0);
      if (totalAbs > 0 && maxAbsCount / totalAbs >= 0.35) {
        const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const weekdayName = weekdayNames[maxAbsDay];
        return `${className || "This class"} shows a 5% drop every ${weekdayName}. Consider checking afternoon session scheduling.`;
      }
    }

    // Rule 2: Compare monthly average with previous month
    let prevMonth = month - 1;
    let prevYear = resolvedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = resolvedYear - 1;
    }

    const prevAY = await resolveStudentAcademicYear(institutionId, sectionId, prevMonth, prevYear);
    if (prevAY) {
      const prevStartDate = `${prevAY.resolvedYear}-${String(prevMonth).padStart(2, "0")}-01`;
      const prevLastDay = new Date(prevAY.resolvedYear, prevMonth, 0).getDate();
      const prevEndDate = `${prevAY.resolvedYear}-${String(prevMonth).padStart(2, "0")}-${prevLastDay}`;

      const { data: students } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("section_id", sectionId)
        .eq("academic_year_id", prevAY.id)
        .eq("is_active", true)
        .is("deleted_at", null);

      const prevStudentIds = students?.map(s => s.student_id) || [];
      if (prevStudentIds.length > 0) {
        const { data: prevAttendance } = await supabase
          .from("student_attendance")
          .select("status")
          .in("student_id", prevStudentIds)
          .gte("date", prevStartDate)
          .lte("date", prevEndDate)
          .is("deleted_at", null);

        let prevPresent = 0;
        let prevTotal = 0;
        prevAttendance?.forEach(att => {
          if (att.status !== "holiday") {
            prevTotal++;
            if (att.status === "present" || att.status === "late") {
              prevPresent++;
            }
          }
        });

        const prevAvg = prevTotal > 0 ? (prevPresent / prevTotal) * 100 : 0;
        if (prevAvg > 0 && monthlyAvg < prevAvg - 1) {
          const diff = Math.round(prevAvg - monthlyAvg);
          return `Attendance dropped ${diff}% vs last month in ${className || "this class"}.`;
        }
      }
    }

    return "Attendance is on track this month.";
  } catch (error) {
    console.error("Error in generateInsight helper:", error);
    return "Attendance is on track this month.";
  }
}

// 7. Get all sections in the institution (for section chips selector)
export async function getInstitutionSections(institutionId: string): Promise<{ id: string; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from("sections")
      .select(`
        id,
        name,
        class:classes!inner (
          id,
          name,
          grade_number
        )
      `)
      .eq("class.institution_id", institutionId)
      .is("deleted_at", null);
      
    if (error) throw error;
    
    return (data || []).map((s: any) => {
      const classObj = Array.isArray(s.class) ? s.class[0] : s.class;
      return {
        id: s.id,
        name: classObj ? `${classObj.name}-${s.name}` : s.name,
        grade_number: classObj?.grade_number || 0
      };
    }).sort((a, b) => {
      if (a.grade_number !== b.grade_number) return a.grade_number - b.grade_number;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error in getInstitutionSections repository:", error);
    return [];
  }
}

export interface ClassAttendanceBreakdown {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
}

export async function getInstitutionAttendance(
  institutionId: string,
  date: string
): Promise<ClassAttendanceBreakdown[]> {
  try {
    // 1. Fetch all classes and sections for the institution
    const { data: sectionsData, error: sectionsError } = await supabase
      .from("sections")
      .select(`
        id,
        name,
        class:classes!inner (
          id,
          name,
          institution_id
        )
      `)
      .eq("class.institution_id", institutionId)
      .is("deleted_at", null);

    if (sectionsError) throw sectionsError;

    const sections = (sectionsData || []).map((s: any) => {
      const classObj = Array.isArray(s.class) ? s.class[0] : s.class;
      return {
        sectionId: s.id,
        sectionName: s.name,
        classId: classObj?.id || "",
        className: classObj?.name || "",
      };
    });

    const sectionIds = sections.map(s => s.sectionId);
    if (sectionIds.length === 0) return [];

    // 2. Fetch all active enrollments for these sections to get active student counts
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("student_id, section_id")
      .in("section_id", sectionIds)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (enrollmentsError) throw enrollmentsError;

    // Group active student IDs by section ID
    const sectionActiveStudents: Record<string, Set<string>> = {};
    sectionIds.forEach(id => {
      sectionActiveStudents[id] = new Set();
    });
    enrollmentsData?.forEach(e => {
      if (e.section_id && e.student_id) {
        sectionActiveStudents[e.section_id].add(e.student_id);
      }
    });

    // 3. Fetch student attendance for this date
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("student_attendance")
      .select("student_id, status")
      .eq("date", date)
      .is("deleted_at", null);

    if (attendanceError) throw attendanceError;

    // Group attendance status by student_id
    const studentAttendanceMap: Record<string, string> = {};
    attendanceData?.forEach(att => {
      if (att.student_id && att.status) {
        studentAttendanceMap[att.student_id] = att.status.toLowerCase();
      }
    });

    // 4. Compute breakdown per section
    const breakdown: ClassAttendanceBreakdown[] = sections.map(sec => {
      const activeStudents = sectionActiveStudents[sec.sectionId] || new Set();
      let presentCount = 0;
      let absentCount = 0;

      activeStudents.forEach(studentId => {
        const status = studentAttendanceMap[studentId];
        if (status === "present" || status === "late") {
          presentCount++;
        } else {
          absentCount++;
        }
      });

      return {
        classId: sec.classId,
        className: sec.className,
        sectionId: sec.sectionId,
        sectionName: sec.sectionName,
        presentCount,
        absentCount,
        totalCount: activeStudents.size,
      };
    });

    return breakdown;
  } catch (error) {
    console.error("Error in getInstitutionAttendance repository:", error);
    return [];
  }
}

