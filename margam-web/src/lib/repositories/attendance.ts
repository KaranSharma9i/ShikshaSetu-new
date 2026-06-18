import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export interface CalendarDay {
  date: string;
  type: "present" | "absent" | "holiday" | "weekend" | "future" | "no_data";
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

export interface ClassAttendanceBreakdown {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
}

// Helpers
function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

export function getAttendanceStatus(percent: number): "excellent" | "leadership" | "warning" | "critical" {
  if (percent >= 95) return "excellent";
  if (percent >= 90) return "leadership";
  if (percent >= 85) return "warning";
  return "critical";
}

export async function resolveStudentAcademicYear(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  sectionId: string,
  month: number,
  year: number
) {
  const dateStr = `${year}-${String(month).padStart(2, "0")}-15`;
  let ay: any = null;
  const { data: first } = await supabase
    .from("academic_years")
    .select("id, starts_on, ends_on")
    .eq("institution_id", institutionId)
    .lte("starts_on", dateStr)
    .gte("ends_on", dateStr)
    .maybeSingle();
  ay = first;

  if (!ay) {
    const { data: fallback } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .eq("label", "2026-27")
      .maybeSingle();
    ay = fallback;
  }

  if (!ay) {
    const { data: current } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
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
    .eq("is_active", true);

  if (count === 0) {
    const { data: ays } = await (supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .order("starts_on", { ascending: false }) as any);

    if (ays && ays.length > 0) {
      for (const candidate of ays) {
        const { count: ayEnrollCount } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("section_id", sectionId)
          .eq("academic_year_id", candidate.id)
          .eq("is_active", true);

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
  supabase: SupabaseClient<Database>,
  institutionId: string,
  month: number,
  year: number
) {
  const dateStr = `${year}-${String(month).padStart(2, "0")}-15`;
  let ay: any = null;
  const { data: first } = await supabase
    .from("academic_years")
    .select("id, starts_on, ends_on")
    .eq("institution_id", institutionId)
    .lte("starts_on", dateStr)
    .gte("ends_on", dateStr)
    .maybeSingle();
  ay = first;

  if (!ay) {
    const { data: fallback } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .eq("label", "2026-27")
      .maybeSingle();
    ay = fallback;
  }

  if (!ay) {
    const { data: current } = await supabase
      .from("academic_years")
      .select("id, starts_on, ends_on")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
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

export async function getStudentAttendanceSummary(
  supabase: SupabaseClient<Database>,
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
    const { data: students } = await (supabase
      .from("enrollments")
      .select("student_id")
      .eq("section_id", sectionId)
      .eq("academic_year_id", academicYearId)
      .eq("is_active", true) as any);

    const studentIds = (students || []).map((s: any) => s.student_id);

    // B. Query student attendance
    let attendance: any[] = [];
    if (studentIds.length > 0) {
      const { data } = await (supabase
        .from("student_attendance" as any) as any)
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
    const { data: holidays } = await (supabase
      .from("holidays" as any) as any)
      .select("date")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId)
      .eq("event_type", "holiday")
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    const holidayDates = new Set<string>(holidays?.map((h: any) => h.date) || []);

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
        calendarData.push({ date: dStr, type: "future" });
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        calendarData.push({ date: dStr, type: "weekend" });
      } else if (holidayDates.has(dStr)) {
        calendarData.push({ date: dStr, type: "holiday" });
      } else {
        const dayStats = dailyRates[dStr];
        if (dayStats && dayStats.total > 0) {
          const rate = (dayStats.present / dayStats.total) * 100;
          if (rate < 85) {
            calendarData.push({ date: dStr, type: "absent" });
          } else {
            calendarData.push({ date: dStr, type: "present" });
          }
        } else {
          calendarData.push({ date: dStr, type: "no_data" });
        }
      }
    }

    // Get section class name for insight
    const { data: sectionRes } = await supabase
      .from("sections")
      .select(`
        name,
        class:classes (
          name
        )
      `)
      .eq("id", sectionId)
      .maybeSingle() as any;

    const className = sectionRes
      ? `${sectionRes.class?.name || ""}-${sectionRes.name || ""}`
      : "";

    const insight = studentIds.length === 0
      ? "No active students in this class."
      : await generateInsight(sectionId, academicYearId, resolvedYear, month, attendance, className, monthlyAvg, institutionId, supabase);

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

export async function getStudentAttendanceList(
  supabase: SupabaseClient<Database>,
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
        student:students (
          id,
          user:users (
            full_name
          )
        )
      `)
      .eq("section_id", sectionId)
      .eq("academic_year_id", academicYearId)
      .eq("is_active", true) as any;

    if (!enrolls || enrolls.length === 0) return [];

    // B. Query student attendance
    const studentIds = enrolls.map((e: any) => e.student_id);
    const { data: attendance } = await (supabase
      .from("student_attendance" as any) as any)
      .select("student_id, status")
      .in("student_id", studentIds)
      .eq("academic_year_id", academicYearId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    // Group attendance by student
    const studentAttMap: Record<string, { present: number; total: number }> = {};
    studentIds.forEach((id: string) => {
      studentAttMap[id] = { present: 0, total: 0 };
    });

    attendance?.forEach((att: any) => {
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

export async function getStaffAttendanceSummary(
  supabase: SupabaseClient<Database>,
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
      .eq("institution_id", institutionId);

    if (departmentId && departmentId !== "All") {
      teacherQuery = teacherQuery.eq("specialization", departmentId);
    }

    const { data: teachers } = await teacherQuery;
    const teacherIds = (teachers || []).map((t: any) => t.id);
    if (teacherIds.length === 0) {
      return { monthlyAvg: 0, staffOnLeaveToday: 0, calendarData: [], insight: "No teachers found in this department.", resolvedYear };
    }

    // B. Fetch teacher attendance
    const { data: attendance } = await (supabase
      .from("teacher_attendance" as any) as any)
      .select("date, status, teacher_id")
      .in("teacher_id", teacherIds)
      .eq("academic_year_id", academicYearId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    // C. Query holidays
    const { data: holidays } = await (supabase
      .from("holidays" as any) as any)
      .select("date")
      .eq("institution_id", institutionId)
      .eq("academic_year_id", academicYearId)
      .eq("event_type", "holiday")
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    const holidayDates = new Set<string>(holidays?.map((h: any) => h.date) || []);

    // D. Compute stats
    const todayStr = new Date().toISOString().slice(0, 10);
    const calendarData: CalendarDay[] = [];
    const dailyRates: Record<string, { present: number; total: number }> = {};

    attendance?.forEach((att: any) => {
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
    attendance?.forEach((att: any) => {
      if (att.status !== "holiday") {
        totalRecords++;
        if (att.status === "present" || att.status === "late") {
          totalPresent++;
        }
      }
    });

    const monthlyAvg = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    // Count on leave today
    const { data: leaves } = await (supabase
      .from("teacher_attendance" as any) as any)
      .select(`
        id,
        teacher:teachers!inner (
          specialization,
          institution_id
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
        calendarData.push({ date: dStr, type: "future" });
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        calendarData.push({ date: dStr, type: "weekend" });
      } else if (holidayDates.has(dStr)) {
        calendarData.push({ date: dStr, type: "holiday" });
      } else {
        const dayStats = dailyRates[dStr];
        if (dayStats && dayStats.total > 0) {
          const rate = (dayStats.present / dayStats.total) * 100;
          if (rate < 85) {
            calendarData.push({ date: dStr, type: "absent" });
          } else {
            calendarData.push({ date: dStr, type: "present" });
          }
        } else {
          calendarData.push({ date: dStr, type: "no_data" });
        }
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

export async function getStaffAttendanceList(
  supabase: SupabaseClient<Database>,
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
        user:users (
          full_name
        )
      `)
      .eq("institution_id", institutionId);

    if (departmentId && departmentId !== "All") {
      teacherQuery = teacherQuery.eq("specialization", departmentId);
    }

    const { data: teachers } = await teacherQuery as any;
    if (!teachers || teachers.length === 0) return [];

    // B. Query teacher attendance
    const teacherIds = teachers.map((t: any) => t.id);
    const { data: attendance } = await (supabase
      .from("teacher_attendance" as any) as any)
      .select("teacher_id, status")
      .in("teacher_id", teacherIds)
      .eq("academic_year_id", academicYearId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    // Group attendance by teacher
    const teacherAttMap: Record<string, { present: number; total: number }> = {};
    teacherIds.forEach((id: string) => {
      teacherAttMap[id] = { present: 0, total: 0 };
    });

    attendance?.forEach((att: any) => {
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
      list = list.filter(item => item.teacherName.toLowerCase().includes(q) || item.subject.toLowerCase().includes(q));
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

export async function getDepartments(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<string[]> {
  try {
    const { data, error } = await (supabase
      .from("teachers")
      .select("specialization")
      .eq("institution_id", institutionId) as any);

    if (error) throw error;

    const departmentsSet = new Set<string>();
    data?.forEach((t: any) => {
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

export async function getInstitutionSections(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<{ id: string; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from("sections")
      .select(`
        id,
        name,
        class:classes (
          id,
          name,
          grade_number
        )
      `) as any;
      
    if (error) throw error;

    const filteredSections = (data || []).filter((s: any) => {
      const classObj = Array.isArray(s.class) ? s.class[0] : s.class;
      return classObj?.institution_id === institutionId;
    });
    
    return filteredSections.map((s: any) => {
      const classObj = Array.isArray(s.class) ? s.class[0] : s.class;
      return {
        id: s.id,
        name: classObj ? `${classObj.name}-${s.name}` : s.name,
        grade_number: classObj?.grade_number || 0
      };
    }).sort((a: any, b: any) => {
      if (a.grade_number !== b.grade_number) return a.grade_number - b.grade_number;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error in getInstitutionSections repository:", error);
    return [];
  }
}

export async function getInstitutionAttendance(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  date: string
): Promise<ClassAttendanceBreakdown[]> {
  try {
    const { data: sectionsData, error: sectionsError } = await supabase
      .from("sections")
      .select(`
        id,
        name,
        class:classes (
          id,
          name,
          institution_id
        )
      `) as any;

    if (sectionsError) throw sectionsError;

    const filteredSections = (sectionsData || []).filter((s: any) => {
      const classObj = Array.isArray(s.class) ? s.class[0] : s.class;
      return classObj?.institution_id === institutionId;
    });

    const sections = filteredSections.map((s: any) => {
      const classObj = Array.isArray(s.class) ? s.class[0] : s.class;
      return {
        sectionId: s.id,
        sectionName: s.name,
        classId: classObj?.id || "",
        className: classObj?.name || "",
      };
    });

    const sectionIds = sections.map((s: any) => s.sectionId);
    if (sectionIds.length === 0) return [];

    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("student_id, section_id")
      .in("section_id", sectionIds)
      .eq("is_active", true);

    if (enrollmentsError) throw enrollmentsError;

    const sectionActiveStudents: Record<string, Set<string>> = {};
    sectionIds.forEach((id: string) => {
      sectionActiveStudents[id] = new Set();
    });
    enrollmentsData?.forEach((e: any) => {
      if (e.section_id && e.student_id) {
        sectionActiveStudents[e.section_id].add(e.student_id);
      }
    });

    const { data: attendanceData, error: attendanceError } = await (supabase
      .from("student_attendance" as any) as any)
      .select("student_id, status")
      .eq("date", date)
      .is("deleted_at", null);

    if (attendanceError) throw attendanceError;

    const studentAttendanceMap: Record<string, string> = {};
    attendanceData?.forEach((att: any) => {
      if (att.student_id && att.status) {
        studentAttendanceMap[att.student_id] = att.status.toLowerCase();
      }
    });

    const breakdown: ClassAttendanceBreakdown[] = sections.map((sec: any) => {
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

export async function generateInsight(
  sectionId: string,
  academicYearId: string,
  resolvedYear: number,
  month: number,
  attendanceData: any[],
  className: string,
  monthlyAvg: number,
  _institutionId: string,
  _supabase: SupabaseClient<Database>
): Promise<string> {
  try {
    const weekdayAbsences: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
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
          const day = dateObj.getDay();
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
        return `${className || "This class"} shows a 5% drop in attendance every ${weekdayName}. Consider checking class scheduling or student commute options.`;
      }
    }

    if (monthlyAvg < 85) {
      const diff = Math.round(85 - monthlyAvg);
      return `${className || "This class"} is currently ${diff}% below the 85% attendance target. Contact guardians of critical students.`;
    }

    return "Attendance is on track this month.";
  } catch (error) {
    console.error("Error in generateInsight helper:", error);
    return "Attendance is on track this month.";
  }
}
