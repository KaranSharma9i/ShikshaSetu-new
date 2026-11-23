import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { addDays, dayOfWeek, monthBounds, todayIST } from '@/utils/date'

// NOTE ON THE DATA MODEL
// `student_attendance` stores one row per student, per class_subject (period/subject), per date.
// Reports therefore collapse those rows into a single status per student per day before counting,
// otherwise a student with 6 subjects would be counted as "6 days present" for a single day.
// When marking attendance from the web portal we write the same daily status to every
// class_subject of the section, which matches how the existing data was seeded.

type Client = SupabaseClient<Database>
// The generated types are out of date for the attendance tables (enum values, deleted_at, etc.),
// so the attendance queries go through an untyped handle.
 
const db = (supabase: Client) => supabase as any

export type StudentAttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'on_leave'

export const STUDENT_STATUSES: StudentAttendanceStatus[] = ['present', 'absent', 'late', 'excused']
export const STAFF_STATUSES: StaffAttendanceStatus[] = ['present', 'absent', 'late', 'on_leave']

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
  hasData: boolean;
}

export interface StudentAttendanceListItem {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  initials: string;
  attendancePercent: number | null;
  status: "excellent" | "leadership" | "warning" | "critical" | "no_data";
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  totalDays: number;
}

export interface StaffAttendanceSummary {
  monthlyAvg: number;
  staffOnLeaveToday: number;
  calendarData: CalendarDay[];
  insight: string;
  resolvedYear: number;
  hasData: boolean;
}

export interface StaffAttendanceListItem {
  teacherId: string;
  teacherName: string;
  employeeCode: string | null;
  initials: string;
  subject: string;
  attendancePercent: number | null;
  status: "excellent" | "leadership" | "warning" | "critical" | "no_data";
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalDays: number;
}

export interface ClassAttendanceBreakdown {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  unmarkedCount: number;
  totalCount: number;
}

export interface AcademicYearInfo {
  id: string;
  label: string | null;
  starts_on: string;
  ends_on: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function getAttendanceStatus(percent: number): "excellent" | "leadership" | "warning" | "critical" {
  if (percent >= 95) return "excellent";
  if (percent >= 90) return "leadership";
  if (percent >= 85) return "warning";
  return "critical";
}

const PAGE_SIZE = 1000;
const IN_CHUNK = 150;

/**
 * Supabase/PostgREST caps responses at 1000 rows by default. Attendance tables grow quickly
 * (students x subjects x days), so every attendance read is paginated.
 */
 
async function fetchAllRows<T = any>(build: (from: number, to: number) => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Runs a paginated query for each chunk of ids (keeps `.in()` URLs short). */
async function fetchAllForIds<T = any>(  
  ids: string[],
   
  build: (chunk: string[], from: number, to: number) => any
): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    rows.push(...(await fetchAllRows<T>((from, to) => build(chunk, from, to))));
  }
  return rows;
}

const STATUS_PRIORITY: Record<string, number> = {
  present: 5,
  late: 4,
  excused: 3,
  absent: 2,
  holiday: 1,
};

/**
 * Collapses per-subject rows into one status per student per day.
 * If a student attended at least one period the day counts as present (or late).
 */
function collapseDaily(rows: Array<{ student_id: string; date: string; status: string }>) {
  const map = new Map<string, Map<string, string>>();
  for (const r of rows) {
    if (!r.student_id || !r.date || !r.status) continue;
    let days = map.get(r.student_id);
    if (!days) {
      days = new Map();
      map.set(r.student_id, days);
    }
    const existing = days.get(r.date);
    const status = String(r.status).toLowerCase();
    if (!existing || (STATUS_PRIORITY[status] ?? 0) > (STATUS_PRIORITY[existing] ?? 0)) {
      days.set(r.date, status);
    }
  }
  return map;
}

const isPresent = (s: string) => s === 'present' || s === 'late';
// Excused (approved leave) and holiday records do not count against attendance.
const isCounted = (s: string) => s === 'present' || s === 'late' || s === 'absent';

function buildCalendar(
  year: number,
  month: number,
  holidayDates: Set<string>,
  dailyRates: Record<string, { present: number; total: number }>
): CalendarDay[] {
  const { lastDay } = monthBounds(year, month);
  const today = todayIST();
  const calendar: CalendarDay[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const dStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = dayOfWeek(dStr);
    const stats = dailyRates[dStr];
    if (dStr > today) {
      calendar.push({ date: dStr, type: "future" });
    } else if (holidayDates.has(dStr)) {
      calendar.push({ date: dStr, type: "holiday" });
    } else if (stats && stats.total > 0) {
      calendar.push({ date: dStr, type: (stats.present / stats.total) * 100 < 85 ? "absent" : "present" });
    } else if (dow === 0 || dow === 6) {
      calendar.push({ date: dStr, type: "weekend" });
    } else {
      calendar.push({ date: dStr, type: "no_data" });
    }
  }
  return calendar;
}

async function getHolidayDates(supabase: Client, institutionId: string, start: string, end: string) {
  const { data } = await db(supabase)
    .from("holidays")
    .select("date, name")
    .eq("institution_id", institutionId)
    .eq("event_type", "holiday")
    .gte("date", start)
    .lte("date", end)
    .is("deleted_at", null);
  const map = new Map<string, string>();
  (data || []).forEach((h: { date: string; name: string }) => map.set(h.date, h.name));
  return map;
}

/** Verifies a section belongs to the institution. Returns its display name or null. */
export async function getSectionForInstitution(
  supabase: Client,
  institutionId: string,
  sectionId: string
): Promise<{ id: string; name: string; className: string; academicYearId: string } | null> {
  const { data } = await db(supabase)
    .from("sections")
    .select("id, name, academic_year_id, class:classes!inner(id, name, institution_id)")
    .eq("id", sectionId)
    .eq("class.institution_id", institutionId)
    .maybeSingle();
  if (!data) return null;
  const cls = one(data.class) as { name?: string } | null;
  return { id: data.id, name: data.name, className: cls?.name || "", academicYearId: data.academic_year_id };
}

// ---------------------------------------------------------------------------
// Academic year resolution
// ---------------------------------------------------------------------------

/** Finds the academic year covering a date, falling back to the current academic year. */
export async function resolveAcademicYearForDate(
  supabase: Client,
  institutionId: string,
  dateStr: string
): Promise<AcademicYearInfo | null> {
  const { data: covering } = await db(supabase)
    .from("academic_years")
    .select("id, label, starts_on, ends_on")
    .eq("institution_id", institutionId)
    .lte("starts_on", dateStr)
    .gte("ends_on", dateStr)
    .order("starts_on", { ascending: false })
    .limit(1);
  if (covering && covering.length > 0) return covering[0];

  const { data: current } = await db(supabase)
    .from("academic_years")
    .select("id, label, starts_on, ends_on")
    .eq("institution_id", institutionId)
    .eq("is_current", true)
    .limit(1);
  return current && current.length > 0 ? current[0] : null;
}

async function getAcademicYearById(supabase: Client, institutionId: string, id: string): Promise<AcademicYearInfo | null> {
  const { data } = await db(supabase)
    .from("academic_years")
    .select("id, label, starts_on, ends_on")
    .eq("id", id)
    .eq("institution_id", institutionId)
    .maybeSingle();
  return data || null;
}

export async function resolveStudentAcademicYear(
  supabase: Client,
  institutionId: string,
  _sectionId: string,
  month: number,
  year: number
) {
  const ay = await resolveAcademicYearForDate(supabase, institutionId, `${year}-${String(month).padStart(2, "0")}-15`);
  if (!ay) return null;
  // The calendar always shows the month the user picked; the academic year only scopes enrollments.
  return { ...ay, resolvedYear: year };
}

export async function resolveStaffAcademicYear(
  supabase: Client,
  institutionId: string,
  month: number,
  year: number
) {
  return resolveStudentAcademicYear(supabase, institutionId, "", month, year);
}

// ---------------------------------------------------------------------------
// Enrollment helpers
// ---------------------------------------------------------------------------

interface SectionStudent {
  studentId: string;
  name: string;
  rollNumber: string | null;
  studentCode: string | null;
}

async function getSectionStudents(
  supabase: Client,
  sectionId: string,
  academicYearId: string,
  activeOnly: boolean
): Promise<SectionStudent[]> {
  let query = db(supabase)
    .from("enrollments")
    .select("student_id, roll_number, is_active, student:students!inner(id, student_code, user:users(full_name))")
    .eq("section_id", sectionId)
    .eq("academic_year_id", academicYearId)
    .is("deleted_at", null);
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;

  return ((data || []) as Array<Record<string, unknown>>)
    .map((e) => {
      const student = one(e.student as Record<string, unknown>) as { student_code?: string; user?: unknown } | null;
      const user = one(student?.user as { full_name?: string }) as { full_name?: string } | null;
      return {
        studentId: e.student_id as string,
        name: user?.full_name || "Unknown Student",
        rollNumber: (e.roll_number as string) || null,
        studentCode: student?.student_code || null,
      };
    })
    .sort((a, b) => {
      const ra = a.rollNumber ? parseInt(a.rollNumber, 10) : NaN;
      const rb = b.rollNumber ? parseInt(b.rollNumber, 10) : NaN;
      if (!isNaN(ra) && !isNaN(rb) && ra !== rb) return ra - rb;
      if (!isNaN(ra) && isNaN(rb)) return -1;
      if (isNaN(ra) && !isNaN(rb)) return 1;
      return a.name.localeCompare(b.name);
    });
}

async function getStudentAttendanceRows(supabase: Client, studentIds: string[], start: string, end: string) {
  return fetchAllForIds<{ student_id: string; date: string; status: string; remarks?: string | null }>(
    studentIds,
    (chunk, from, to) =>
      db(supabase)
        .from("student_attendance")
        .select("student_id, date, status, remarks")
        .in("student_id", chunk)
        .gte("date", start)
        .lte("date", end)
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, to)
  );
}

// ---------------------------------------------------------------------------
// Student monthly reports
// ---------------------------------------------------------------------------

export async function getStudentMonthlyReport(
  supabase: Client,
  institutionId: string,
  sectionId: string,
  academicYearId: string,
  year: number,
  month: number
): Promise<{ summary: StudentAttendanceSummary; list: StudentAttendanceListItem[] }> {
  const { start, end } = monthBounds(year, month);
  const section = await getSectionForInstitution(supabase, institutionId, sectionId);
  if (!section) throw new Error("Section not found.");

  // Sections belong to one academic year; their enrollments are the roster for the report.
  const students = await getSectionStudents(supabase, sectionId, section.academicYearId || academicYearId, false);
  const studentIds = students.map((s) => s.studentId);
  const rows = studentIds.length > 0 ? await getStudentAttendanceRows(supabase, studentIds, start, end) : [];
  const daily = collapseDaily(rows);
  const holidays = await getHolidayDates(supabase, institutionId, start, end);

  const dailyRates: Record<string, { present: number; total: number }> = {};
  const weekdayAbsences: Record<number, number> = {};
  let totalPresent = 0;
  let totalCounted = 0;

  const list: StudentAttendanceListItem[] = students.map((s) => {
    const days = daily.get(s.studentId) || new Map<string, string>();
    let present = 0, absent = 0, late = 0, excused = 0;
    days.forEach((status, date) => {
      if (holidays.has(date)) return;
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'absent') {
        absent++;
        const dow = dayOfWeek(date);
        weekdayAbsences[dow] = (weekdayAbsences[dow] || 0) + 1;
      } else if (status === 'excused') excused++;
      if (isCounted(status)) {
        dailyRates[date] = dailyRates[date] || { present: 0, total: 0 };
        dailyRates[date].total++;
        if (isPresent(status)) dailyRates[date].present++;
      }
    });
    const counted = present + late + absent;
    totalPresent += present + late;
    totalCounted += counted;
    const percent = counted > 0 ? Math.round(((present + late) / counted) * 100) : null;
    return {
      studentId: s.studentId,
      studentName: s.name,
      rollNumber: s.rollNumber,
      initials: getInitials(s.name),
      attendancePercent: percent,
      status: percent === null ? "no_data" : getAttendanceStatus(percent),
      presentDays: present + late,
      absentDays: absent,
      lateDays: late,
      excusedDays: excused,
      totalDays: counted,
    };
  });

  const monthlyAvg = totalCounted > 0 ? (totalPresent / totalCounted) * 100 : 0;
  const criticalDays = Object.values(dailyRates).filter((d) => d.total > 0 && (d.present / d.total) * 100 < 85).length;
  const holidaySet = new Set(holidays.keys());
  const className = `${section.className}-${section.name}`;

  let insight: string;
  if (students.length === 0) {
    insight = "No students are enrolled in this section for the selected academic year.";
  } else if (totalCounted === 0) {
    insight = "No attendance has been marked for this section in the selected month yet.";
  } else {
    insight = generateInsight(className, monthlyAvg, weekdayAbsences, list);
  }

  const order = { critical: 0, warning: 1, leadership: 2, excellent: 3, no_data: 4 };
  list.sort((a, b) => order[a.status] - order[b.status] || a.studentName.localeCompare(b.studentName));

  return {
    summary: {
      monthlyAvg: parseFloat(monthlyAvg.toFixed(1)),
      criticalDays,
      calendarData: buildCalendar(year, month, holidaySet, dailyRates),
      insight,
      resolvedYear: year,
      hasData: totalCounted > 0,
    },
    list,
  };
}

export function generateInsight(
  className: string,
  monthlyAvg: number,
  weekdayAbsences: Record<number, number>,
  list: StudentAttendanceListItem[]
): string {
  const label = className || "This class";
  const critical = list.filter((s) => s.status === "critical").length;
  const totalAbs = Object.values(weekdayAbsences).reduce((a, b) => a + b, 0);
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (totalAbs >= 5) {
    const [peakDay, peakCount] = Object.entries(weekdayAbsences).sort((a, b) => b[1] - a[1])[0];
    const share = peakCount / totalAbs;
    if (share >= 0.35) {
      return `${Math.round(share * 100)}% of ${label}'s absences this month fall on ${weekdayNames[Number(peakDay)]}s. Consider checking scheduling or commute issues on that day.`;
    }
  }
  if (monthlyAvg < 85) {
    return `${label} is ${Math.round(85 - monthlyAvg)}% below the 85% attendance target. ${critical} student${critical === 1 ? " is" : "s are"} in the critical band — consider contacting their guardians.`;
  }
  if (critical > 0) {
    return `${label} is on track overall, but ${critical} student${critical === 1 ? " is" : "s are"} below 85% attendance.`;
  }
  return "Attendance is on track this month.";
}

// Backwards compatible wrappers (used by older callers).
export async function getStudentAttendanceSummary(
  supabase: Client, institutionId: string, sectionId: string, academicYearId: string, resolvedYear: number, month: number
): Promise<StudentAttendanceSummary> {
  return (await getStudentMonthlyReport(supabase, institutionId, sectionId, academicYearId, resolvedYear, month)).summary;
}

export async function getStudentAttendanceList(
  supabase: Client, institutionId: string, sectionId: string, academicYearId: string, resolvedYear: number, month: number
): Promise<StudentAttendanceListItem[]> {
  return (await getStudentMonthlyReport(supabase, institutionId, sectionId, academicYearId, resolvedYear, month)).list;
}

// ---------------------------------------------------------------------------
// Staff monthly reports
// ---------------------------------------------------------------------------

interface InstitutionTeacher {
  id: string;
  name: string;
  employeeCode: string | null;
  specialization: string | null;
}

async function getInstitutionTeachers(supabase: Client, institutionId: string, department?: string): Promise<InstitutionTeacher[]> {
  let query = db(supabase)
    .from("teachers")
    .select("id, employee_code, specialization, user:users(full_name)")
    .eq("institution_id", institutionId)
    .is("deleted_at", null);
  if (department && department !== "All") query = query.eq("specialization", department);
  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as Array<Record<string, unknown>>)
    .map((t) => ({
      id: t.id as string,
      name: (one(t.user as { full_name?: string }) as { full_name?: string } | null)?.full_name || "Unknown Staff",
      employeeCode: (t.employee_code as string) || null,
      specialization: (t.specialization as string) || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStaffMonthlyReport(
  supabase: Client,
  institutionId: string,
  year: number,
  month: number,
  department?: string
): Promise<{ summary: StaffAttendanceSummary; list: StaffAttendanceListItem[] }> {
  const { start, end } = monthBounds(year, month);
  const teachers = await getInstitutionTeachers(supabase, institutionId, department);
  const teacherIds = teachers.map((t) => t.id);
  const today = todayIST();

  const rows = teacherIds.length > 0
    ? await fetchAllForIds<{ teacher_id: string; date: string; status: string }>(teacherIds, (chunk, from, to) =>
        db(supabase)
          .from("teacher_attendance")
          .select("teacher_id, date, status")
          .in("teacher_id", chunk)
          .gte("date", start)
          .lte("date", end)
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .range(from, to)
      )
    : [];

  const { data: todayLeaves } = teacherIds.length > 0
    ? await db(supabase)
        .from("teacher_attendance")
        .select("teacher_id")
        .in("teacher_id", teacherIds.slice(0, 500))
        .eq("date", today)
        .eq("status", "on_leave")
        .is("deleted_at", null)
    : { data: [] };

  const holidays = await getHolidayDates(supabase, institutionId, start, end);
  const dailyRates: Record<string, { present: number; total: number }> = {};
  const stats = new Map<string, { present: number; absent: number; leave: number }>();
  let totalPresent = 0, totalCounted = 0;

  for (const r of rows) {
    const status = String(r.status).toLowerCase();
    if (holidays.has(r.date) || status === 'holiday') continue;
    const s = stats.get(r.teacher_id) || { present: 0, absent: 0, leave: 0 };
    if (isPresent(status)) s.present++;
    else if (status === 'absent') s.absent++;
    else if (status === 'on_leave') s.leave++;
    stats.set(r.teacher_id, s);
    // On-leave days are approved absences: shown separately, not counted against the rate.
    if (isCounted(status)) {
      dailyRates[r.date] = dailyRates[r.date] || { present: 0, total: 0 };
      dailyRates[r.date].total++;
      totalCounted++;
      if (isPresent(status)) {
        dailyRates[r.date].present++;
        totalPresent++;
      }
    }
  }

  const list: StaffAttendanceListItem[] = teachers.map((t) => {
    const s = stats.get(t.id) || { present: 0, absent: 0, leave: 0 };
    const counted = s.present + s.absent;
    const percent = counted > 0 ? Math.round((s.present / counted) * 100) : null;
    return {
      teacherId: t.id,
      teacherName: t.name,
      employeeCode: t.employeeCode,
      initials: getInitials(t.name),
      subject: t.specialization || "General",
      attendancePercent: percent,
      status: percent === null ? "no_data" : getAttendanceStatus(percent),
      presentDays: s.present,
      absentDays: s.absent,
      leaveDays: s.leave,
      totalDays: counted,
    };
  });

  const order = { critical: 0, warning: 1, leadership: 2, excellent: 3, no_data: 4 };
  list.sort((a, b) => order[a.status] - order[b.status] || a.teacherName.localeCompare(b.teacherName));

  const monthlyAvg = totalCounted > 0 ? (totalPresent / totalCounted) * 100 : 0;
  const staffOnLeaveToday = (todayLeaves || []).length;

  let insight = "Staff attendance is on track this month.";
  if (teachers.length === 0) {
    insight = "No staff members found for this department.";
  } else if (totalCounted === 0) {
    insight = "No staff attendance has been marked for the selected month yet.";
  } else if (staffOnLeaveToday > 0) {
    insight = `${staffOnLeaveToday} staff member${staffOnLeaveToday > 1 ? "s are" : " is"} on leave today. Check the timetable for class coverage.`;
  } else if (monthlyAvg < 90) {
    insight = "Staff attendance is below the 90% target this month. Consider reviewing leave patterns.";
  }

  return {
    summary: {
      monthlyAvg: parseFloat(monthlyAvg.toFixed(1)),
      staffOnLeaveToday,
      calendarData: buildCalendar(year, month, new Set(holidays.keys()), dailyRates),
      insight,
      resolvedYear: year,
      hasData: totalCounted > 0,
    },
    list,
  };
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export async function getDepartments(supabase: Client, institutionId: string): Promise<string[]> {
  try {
    const { data, error } = await db(supabase)
      .from("teachers")
      .select("specialization")
      .eq("institution_id", institutionId)
      .is("deleted_at", null);
    if (error) throw error;
    const set = new Set<string>();
    (data || []).forEach((t: { specialization?: string }) => t.specialization && set.add(t.specialization));
    return Array.from(set).sort();
  } catch (error) {
    console.error("Error in getDepartments repository:", error);
    return [];
  }
}

export interface SectionOption {
  id: string;
  name: string;
  academicYearId: string;
}

export async function getInstitutionSections(
  supabase: Client,
  institutionId: string
): Promise<SectionOption[]> {
  try {
    // BUGFIX: previously the join did not select `institution_id`, so the client-side
    // institution filter removed every section and the selector was always empty.
    const { data, error } = await db(supabase)
      .from("sections")
      .select("id, name, academic_year_id, class:classes!inner(id, name, grade_number, institution_id)")
      .eq("class.institution_id", institutionId)
      .is("deleted_at", null);
    if (error) throw error;

    return ((data || []) as Array<Record<string, unknown>>)
      .map((s) => {
        const cls = one(s.class as { name?: string; grade_number?: number }) as { name?: string; grade_number?: number } | null;
        return {
          id: s.id as string,
          name: cls ? `${cls.name}-${s.name}` : (s.name as string),
          academicYearId: s.academic_year_id as string,
          grade: cls?.grade_number ?? 0,
        };
      })
      .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map(({ id, name, academicYearId }) => ({ id, name, academicYearId }));
  } catch (error) {
    console.error("Error in getInstitutionSections repository:", error);
    return [];
  }
}

export interface AcademicYearOption extends AcademicYearInfo {
  is_current: boolean;
}

export async function getAcademicYears(supabase: Client, institutionId: string): Promise<AcademicYearOption[]> {
  const { data, error } = await db(supabase)
    .from("academic_years")
    .select("id, label, starts_on, ends_on, is_current")
    .eq("institution_id", institutionId)
    .is("deleted_at", null)
    .order("starts_on", { ascending: false });
  if (error) {
    console.error("Error in getAcademicYears repository:", error);
    return [];
  }
  return data || [];
}

// ---------------------------------------------------------------------------
// Daily breakdown
// ---------------------------------------------------------------------------

export async function getInstitutionAttendance(
  supabase: Client,
  institutionId: string,
  date: string
): Promise<ClassAttendanceBreakdown[]> {
  const ay = await resolveAcademicYearForDate(supabase, institutionId, date);
  if (!ay) return [];

  const { data: sectionsData, error: sectionsError } = await db(supabase)
    .from("sections")
    .select("id, name, class:classes!inner(id, name, grade_number, institution_id)")
    .eq("class.institution_id", institutionId)
    .eq("academic_year_id", ay.id)
    .is("deleted_at", null);
  if (sectionsError) throw sectionsError;

  const sections = ((sectionsData || []) as Array<Record<string, unknown>>).map((s) => {
    const cls = one(s.class as { id?: string; name?: string; grade_number?: number }) as { id?: string; name?: string; grade_number?: number } | null;
    return { sectionId: s.id as string, sectionName: s.name as string, classId: cls?.id || "", className: cls?.name || "", grade: cls?.grade_number ?? 0 };
  });
  if (sections.length === 0) return [];

  const sectionIds = sections.map((s) => s.sectionId);
  const enrollments = await fetchAllForIds<{ student_id: string; section_id: string }>(sectionIds, (chunk, from, to) =>
    db(supabase)
      .from("enrollments")
      .select("student_id, section_id")
      .in("section_id", chunk)
      .eq("academic_year_id", ay.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, to)
  );

  const studentsBySection = new Map<string, string[]>();
  enrollments.forEach((e) => {
    const list = studentsBySection.get(e.section_id) || [];
    list.push(e.student_id);
    studentsBySection.set(e.section_id, list);
  });

  const allStudentIds = enrollments.map((e) => e.student_id);
  const rows = allStudentIds.length > 0 ? await getStudentAttendanceRows(supabase, allStudentIds, date, date) : [];
  const daily = collapseDaily(rows);

  return sections
    .sort((a, b) => a.grade - b.grade || a.sectionName.localeCompare(b.sectionName))
    .map((sec) => {
      const students = studentsBySection.get(sec.sectionId) || [];
      let present = 0, absent = 0, late = 0, excused = 0, unmarked = 0;
      students.forEach((id) => {
        const status = daily.get(id)?.get(date);
        if (!status) unmarked++;
        else if (status === 'present') present++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;
        else if (status === 'absent') absent++;
        else unmarked++;
      });
      return {
        classId: sec.classId,
        className: sec.className,
        sectionId: sec.sectionId,
        sectionName: sec.sectionName,
        presentCount: present + late,
        absentCount: absent,
        lateCount: late,
        excusedCount: excused,
        unmarkedCount: unmarked,
        totalCount: students.length,
      };
    });
}

// ---------------------------------------------------------------------------
// Marking: students
// ---------------------------------------------------------------------------

export interface StudentRosterEntry {
  studentId: string;
  name: string;
  rollNumber: string | null;
  studentCode: string | null;
  status: StudentAttendanceStatus | null;
  remarks: string | null;
  onApprovedLeave: boolean;
}

export interface StudentRoster {
  academicYear: AcademicYearInfo;
  section: { id: string; name: string; className: string };
  holidayName: string | null;
  isWeekend: boolean;
  subjectCount: number;
  alreadyMarked: boolean;
  students: StudentRosterEntry[];
}

async function getSectionClassSubjectIds(supabase: Client, sectionId: string, academicYearId: string): Promise<string[]> {
  const { data, error } = await db(supabase)
    .from("class_subjects")
    .select("id")
    .eq("section_id", sectionId)
    .eq("academic_year_id", academicYearId)
    .is("deleted_at", null);
  if (error) throw error;
  return (data || []).map((r: { id: string }) => r.id);
}

async function getApprovedLeaveStudentIds(supabase: Client, studentIds: string[], date: string): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const rows = await fetchAllForIds<{ student_id: string }>(studentIds, (chunk, from, to) =>
    db(supabase)
      .from("leaves")
      .select("student_id")
      .in("student_id", chunk)
      .eq("status", "approved")
      .lte("from_date", date)
      .gte("to_date", date)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, to)
  );
  return new Set(rows.map((r) => r.student_id));
}

export async function getStudentMarkingRoster(
  supabase: Client,
  institutionId: string,
  sectionId: string,
  date: string
): Promise<StudentRoster> {
  const section = await getSectionForInstitution(supabase, institutionId, sectionId);
  if (!section) throw new Error("Section not found.");

  const ay = await getAcademicYearById(supabase, institutionId, section.academicYearId);
  if (!ay) throw new Error("Academic year for this section was not found.");
  if (date < ay.starts_on || date > ay.ends_on) {
    throw new Error(`This section belongs to academic year ${ay.label || ""} (${ay.starts_on} to ${ay.ends_on}). Pick a date inside it.`);
  }

  const [students, subjectIds, holidays] = await Promise.all([
    getSectionStudents(supabase, sectionId, ay.id, true),
    getSectionClassSubjectIds(supabase, sectionId, ay.id),
    getHolidayDates(supabase, institutionId, date, date),
  ]);

  const studentIds = students.map((s) => s.studentId);
  const [rows, onLeave] = await Promise.all([
    studentIds.length > 0 ? getStudentAttendanceRows(supabase, studentIds, date, date) : Promise.resolve([]),
    getApprovedLeaveStudentIds(supabase, studentIds, date),
  ]);
  const daily = collapseDaily(rows);
  const remarksByStudent = new Map<string, string>();
  rows.forEach((r) => r.remarks && remarksByStudent.set(r.student_id, r.remarks));

  let markedCount = 0;
  const entries: StudentRosterEntry[] = students.map((s) => {
    const raw = daily.get(s.studentId)?.get(date) || null;
    const status = raw && (STUDENT_STATUSES as string[]).includes(raw) ? (raw as StudentAttendanceStatus) : null;
    if (status) markedCount++;
    return {
      ...s,
      status,
      remarks: remarksByStudent.get(s.studentId) || null,
      onApprovedLeave: onLeave.has(s.studentId),
    };
  });

  const dow = dayOfWeek(date);
  return {
    academicYear: ay,
    section,
    holidayName: holidays.get(date) || null,
    isWeekend: dow === 0 || dow === 6,
    subjectCount: subjectIds.length,
    alreadyMarked: markedCount > 0,
    students: entries,
  };
}

export interface StudentMarkInput {
  studentId: string;
  status: StudentAttendanceStatus;
  remarks?: string | null;
}

export async function saveStudentAttendance(
  supabase: Client,
  institutionId: string,
  markedBy: string,
  sectionId: string,
  date: string,
  entries: StudentMarkInput[]
): Promise<{ saved: number }> {
  if (date > todayIST()) throw new Error("Attendance cannot be marked for a future date.");
  for (const e of entries) {
    if (!STUDENT_STATUSES.includes(e.status)) throw new Error(`Invalid status "${e.status}".`);
  }

  const section = await getSectionForInstitution(supabase, institutionId, sectionId);
  if (!section) throw new Error("Section not found.");

  const ay = await getAcademicYearById(supabase, institutionId, section.academicYearId);
  if (!ay) throw new Error("Academic year for this section was not found.");
  if (date < ay.starts_on || date > ay.ends_on) {
    throw new Error("The selected date is outside this section's academic year.");
  }

  const [students, subjectIds] = await Promise.all([
    getSectionStudents(supabase, sectionId, ay.id, true),
    getSectionClassSubjectIds(supabase, sectionId, ay.id),
  ]);

  if (subjectIds.length === 0) {
    throw new Error("No subjects are configured for this section in its academic year. Configure the section's subjects before marking attendance.");
  }

  const enrolled = new Set(students.map((s) => s.studentId));
  const invalid = entries.filter((e) => !enrolled.has(e.studentId));
  if (invalid.length > 0) {
    throw new Error("Some students are not actively enrolled in this section.");
  }

  const now = new Date().toISOString();
  const rows = entries.flatMap((e) =>
    subjectIds.map((classSubjectId) => ({
      student_id: e.studentId,
      class_subject_id: classSubjectId,
      academic_year_id: ay.id,
      date,
      status: e.status,
      remarks: e.remarks?.trim() ? e.remarks.trim().slice(0, 500) : null,
      marked_by: markedBy,
      updated_at: now,
      deleted_at: null,
    }))
  );

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db(supabase)
      .from("student_attendance")
      .upsert(rows.slice(i, i + 500), { onConflict: "student_id,class_subject_id,date" });
    if (error) throw error;
  }

  return { saved: entries.length };
}

// ---------------------------------------------------------------------------
// Marking: staff
// ---------------------------------------------------------------------------

export interface StaffRosterEntry {
  teacherId: string;
  name: string;
  employeeCode: string | null;
  specialization: string | null;
  status: StaffAttendanceStatus | null;
  checkIn: string | null; // HH:MM (IST)
  checkOut: string | null; // HH:MM (IST)
  remarks: string | null;
}

function toISTTime(ts: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

function fromISTTime(date: string, time: string | null | undefined): string | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

export async function getStaffMarkingRoster(
  supabase: Client,
  institutionId: string,
  date: string
): Promise<{ academicYear: AcademicYearInfo; holidayName: string | null; isWeekend: boolean; alreadyMarked: boolean; staff: StaffRosterEntry[] }> {
  const ay = await resolveAcademicYearForDate(supabase, institutionId, date);
  if (!ay) throw new Error("No academic year is configured for this date.");

  const teachers = await getInstitutionTeachers(supabase, institutionId);
  const ids = teachers.map((t) => t.id);
  const rows = ids.length > 0
    ? await fetchAllForIds<{ teacher_id: string; status: string; check_in_at: string | null; check_out_at: string | null; remarks: string | null }>(ids, (chunk, from, to) =>
        db(supabase)
          .from("teacher_attendance")
          .select("teacher_id, status, check_in_at, check_out_at, remarks")
          .in("teacher_id", chunk)
          .eq("date", date)
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .range(from, to)
      )
    : [];
  const byTeacher = new Map(rows.map((r) => [r.teacher_id, r]));
  const holidays = await getHolidayDates(supabase, institutionId, date, date);
  const dow = dayOfWeek(date);

  return {
    academicYear: ay,
    holidayName: holidays.get(date) || null,
    isWeekend: dow === 0 || dow === 6,
    alreadyMarked: rows.length > 0,
    staff: teachers.map((t) => {
      const r = byTeacher.get(t.id);
      const status = r && (STAFF_STATUSES as string[]).includes(r.status) ? (r.status as StaffAttendanceStatus) : null;
      return {
        teacherId: t.id,
        name: t.name,
        employeeCode: t.employeeCode,
        specialization: t.specialization,
        status,
        checkIn: toISTTime(r?.check_in_at ?? null),
        checkOut: toISTTime(r?.check_out_at ?? null),
        remarks: r?.remarks ?? null,
      };
    }),
  };
}

export interface StaffMarkInput {
  teacherId: string;
  status: StaffAttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  remarks?: string | null;
}

export async function saveStaffAttendance(
  supabase: Client,
  institutionId: string,
  markedBy: string,
  date: string,
  entries: StaffMarkInput[]
): Promise<{ saved: number }> {
  if (date > todayIST()) throw new Error("Attendance cannot be marked for a future date.");
  for (const e of entries) {
    if (!STAFF_STATUSES.includes(e.status)) throw new Error(`Invalid status "${e.status}".`);
    if (e.checkIn && e.checkOut && e.checkOut < e.checkIn) {
      throw new Error("Check-out time cannot be earlier than check-in time.");
    }
  }

  const ay = await resolveAcademicYearForDate(supabase, institutionId, date);
  if (!ay) throw new Error("No academic year is configured for this date.");

  const teachers = await getInstitutionTeachers(supabase, institutionId);
  const valid = new Set(teachers.map((t) => t.id));
  if (entries.some((e) => !valid.has(e.teacherId))) {
    throw new Error("Some staff members do not belong to this institution.");
  }

  const now = new Date().toISOString();
  const rows = entries.map((e) => {
    const attended = e.status === 'present' || e.status === 'late';
    return {
      teacher_id: e.teacherId,
      academic_year_id: ay.id,
      date,
      status: e.status,
      check_in_at: attended ? fromISTTime(date, e.checkIn) : null,
      check_out_at: attended ? fromISTTime(date, e.checkOut) : null,
      remarks: e.remarks?.trim() ? e.remarks.trim().slice(0, 500) : null,
      marked_by: markedBy,
      updated_at: now,
      deleted_at: null,
    };
  });

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db(supabase)
      .from("teacher_attendance")
      .upsert(rows.slice(i, i + 500), { onConflict: "teacher_id,date" });
    if (error) throw error;
  }
  return { saved: rows.length };
}

// ---------------------------------------------------------------------------
// Student leave requests
// ---------------------------------------------------------------------------

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequestItem {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  classSection: string | null;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export async function getLeaveRequests(
  supabase: Client,
  institutionId: string,
  status: LeaveStatus | 'all'
): Promise<LeaveRequestItem[]> {
  let query = db(supabase)
    .from("leaves")
    .select("id, student_id, from_date, to_date, reason, status, review_note, reviewed_at, created_at, student:students!inner(id, student_code, institution_id, user:users(full_name))")
    .eq("student.institution_id", institutionId)
    .is("deleted_at", null)
    .order("from_date", { ascending: false })
    .limit(300);
  if (status !== 'all') query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;

  const leaves = (data || []) as Array<Record<string, unknown>>;
  const studentIds = Array.from(new Set(leaves.map((l) => l.student_id as string)));

  // Resolve the current class/section of each student for display.
  const sectionByStudent = new Map<string, string>();
  if (studentIds.length > 0) {
    const enrolls = await fetchAllForIds<Record<string, unknown>>(studentIds, (chunk, from, to) =>
      db(supabase)
        .from("enrollments")
        .select("student_id, section:sections(name, class:classes(name))")
        .in("student_id", chunk)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, to)
    );
    enrolls.forEach((e) => {
      const sec = one(e.section as { name?: string; class?: unknown }) as { name?: string; class?: unknown } | null;
      const cls = one(sec?.class as { name?: string }) as { name?: string } | null;
      if (sec) sectionByStudent.set(e.student_id as string, `${cls?.name || ""}-${sec.name || ""}`);
    });
  }

  return leaves.map((l) => {
    const student = one(l.student as Record<string, unknown>) as { student_code?: string; user?: unknown } | null;
    const user = one(student?.user as { full_name?: string }) as { full_name?: string } | null;
    const fromDate = l.from_date as string;
    const toDate = l.to_date as string;
    const days = Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000) + 1;
    return {
      id: l.id as string,
      studentId: l.student_id as string,
      studentName: user?.full_name || "Unknown Student",
      studentCode: student?.student_code || null,
      classSection: sectionByStudent.get(l.student_id as string) || null,
      fromDate,
      toDate,
      days,
      reason: (l.reason as string) || "",
      status: l.status as LeaveStatus,
      reviewNote: (l.review_note as string) || null,
      reviewedAt: (l.reviewed_at as string) || null,
      createdAt: l.created_at as string,
    };
  });
}

async function assertStudentInInstitution(supabase: Client, institutionId: string, studentId: string) {
  const { data } = await db(supabase)
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("institution_id", institutionId)
    .maybeSingle();
  if (!data) throw new Error("Student not found.");
}

/** Marks any already-recorded "absent" days within an approved leave as "excused". */
async function excuseAbsencesForLeave(supabase: Client, studentId: string, fromDate: string, toDate: string) {
  const { error } = await db(supabase)
    .from("student_attendance")
    .update({ status: "excused", updated_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("status", "absent")
    .gte("date", fromDate)
    .lte("date", toDate)
    .is("deleted_at", null);
  if (error) throw error;
}

export async function reviewLeaveRequest(
  supabase: Client,
  institutionId: string,
  reviewerId: string,
  leaveId: string,
  decision: 'approved' | 'rejected',
  note: string | null
) {
  const { data: leave } = await db(supabase)
    .from("leaves")
    .select("id, student_id, from_date, to_date, status, student:students!inner(institution_id)")
    .eq("id", leaveId)
    .eq("student.institution_id", institutionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!leave) throw new Error("Leave request not found.");

  const { error } = await db(supabase)
    .from("leaves")
    .update({
      status: decision,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_note: note?.trim() ? note.trim().slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveId);
  if (error) throw error;

  if (decision === 'approved') {
    await excuseAbsencesForLeave(supabase, leave.student_id, leave.from_date, leave.to_date);
  }
}

export async function createLeave(
  supabase: Client,
  institutionId: string,
  reviewerId: string,
  input: { studentId: string; fromDate: string; toDate: string; reason: string; approve: boolean }
) {
  if (!input.reason.trim()) throw new Error("Reason is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.toDate)) {
    throw new Error("Valid from and to dates are required.");
  }
  if (input.toDate < input.fromDate) throw new Error("The end date cannot be before the start date.");
  if (addDays(input.fromDate, 60) < input.toDate) throw new Error("A single leave cannot exceed 60 days.");

  await assertStudentInInstitution(supabase, institutionId, input.studentId);

  const ay = await resolveAcademicYearForDate(supabase, institutionId, input.fromDate);
  if (!ay) throw new Error("No academic year is configured for these dates.");

  const now = new Date().toISOString();
  const { error } = await db(supabase).from("leaves").insert({
    student_id: input.studentId,
    academic_year_id: ay.id,
    from_date: input.fromDate,
    to_date: input.toDate,
    reason: input.reason.trim().slice(0, 1000),
    status: input.approve ? "approved" : "pending",
    reviewed_by: input.approve ? reviewerId : null,
    reviewed_at: input.approve ? now : null,
  });
  if (error) throw error;

  if (input.approve) {
    await excuseAbsencesForLeave(supabase, input.studentId, input.fromDate, input.toDate);
  }
}

/** Students of a section (active enrollments in the current academic year) for pickers. */
export async function getSectionStudentOptions(
  supabase: Client,
  institutionId: string,
  sectionId: string
): Promise<Array<{ id: string; name: string; rollNumber: string | null }>> {
  const section = await getSectionForInstitution(supabase, institutionId, sectionId);
  if (!section) throw new Error("Section not found.");
  const students = await getSectionStudents(supabase, sectionId, section.academicYearId, true);
  return students.map((s) => ({ id: s.studentId, name: s.name, rollNumber: s.rollNumber }));
}

// ---------------------------------------------------------------------------
// Monthly register (student x day grid) for export
// ---------------------------------------------------------------------------

export interface MonthlyRegister {
  className: string;
  year: number;
  month: number;
  dates: string[];
  holidays: string[];
  rows: Array<{ name: string; rollNumber: string | null; marks: Record<string, string>; present: number; total: number }>;
}

export async function getMonthlyRegister(
  supabase: Client,
  institutionId: string,
  sectionId: string,
  year: number,
  month: number
): Promise<MonthlyRegister> {
  const section = await getSectionForInstitution(supabase, institutionId, sectionId);
  if (!section) throw new Error("Section not found.");
  const { start, end, lastDay } = monthBounds(year, month);
  const students = await getSectionStudents(supabase, sectionId, section.academicYearId, false);
  const rows = students.length > 0 ? await getStudentAttendanceRows(supabase, students.map((s) => s.studentId), start, end) : [];
  const daily = collapseDaily(rows);
  const holidays = await getHolidayDates(supabase, institutionId, start, end);
  const dates = Array.from({ length: lastDay }, (_, i) => `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
  const code: Record<string, string> = { present: "P", absent: "A", late: "L", excused: "E", holiday: "H" };

  return {
    className: `${section.className}-${section.name}`,
    year,
    month,
    dates,
    holidays: Array.from(holidays.keys()),
    rows: students.map((s) => {
      const days = daily.get(s.studentId) || new Map<string, string>();
      const marks: Record<string, string> = {};
      let present = 0, total = 0;
      days.forEach((status, date) => {
        marks[date] = code[status] || "";
        if (!holidays.has(date) && isCounted(status)) {
          total++;
          if (isPresent(status)) present++;
        }
      });
      return { name: s.name, rollNumber: s.rollNumber, marks, present, total };
    }),
  };
}
