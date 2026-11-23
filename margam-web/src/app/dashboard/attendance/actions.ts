'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import {
  getStudentMonthlyReport,
  getStaffMonthlyReport,
  getInstitutionAttendance,
  resolveStudentAcademicYear,
  getStudentMarkingRoster,
  saveStudentAttendance,
  getStaffMarkingRoster,
  saveStaffAttendance,
  getLeaveRequests,
  reviewLeaveRequest,
  createLeave,
  getSectionStudentOptions,
  getMonthlyRegister,
  type StudentMarkInput,
  type StaffMarkInput,
  type LeaveStatus,
} from '@/lib/repositories/attendance'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'An unexpected error occurred.'
}

// Authenticate and verify tenant admin access
async function verifyAdminAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in.')
  }

  const { data: userData, error: userErr } = await supabase
    .from('users')
    .select('role, institution_id')
    .eq('id', user.id)
    .single()

  if (userErr || !userData || userData.role !== 'institution_admin' || !userData.institution_id) {
    throw new Error('Unauthorized. Only institution admins can access attendance data.')
  }

  return { supabase, institutionId: userData.institution_id as string, userId: user.id }
}

function validMonth(month: number, year: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000 && year <= 2100
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function getStudentAttendanceAction(sectionId: string, month: number, year: number) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()
    if (!sectionId) return { success: false, error: 'Section selection is required.' }
    if (!validMonth(month, year)) return { success: false, error: 'Invalid month selected.' }

    const resolvedAY = await resolveStudentAcademicYear(supabase, institutionId, sectionId, month, year)
    if (!resolvedAY) return { success: false, error: 'No academic year is configured for this institution.' }

    const { summary, list } = await getStudentMonthlyReport(supabase, institutionId, sectionId, resolvedAY.id, year, month)
    return { success: true, summary, list }
  } catch (error) {
    console.error('Error in getStudentAttendanceAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

export async function getStaffAttendanceAction(month: number, year: number, department: string) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()
    if (!validMonth(month, year)) return { success: false, error: 'Invalid month selected.' }

    const { summary, list } = await getStaffMonthlyReport(supabase, institutionId, year, month, department)
    return { success: true, summary, list }
  } catch (error) {
    console.error('Error in getStaffAttendanceAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

export async function getDailyAttendanceAction(date: string) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()
    if (!date || !DATE_RE.test(date)) return { success: false, error: 'A valid date is required.' }

    const breakdown = await getInstitutionAttendance(supabase, institutionId, date)
    return { success: true, breakdown }
  } catch (error) {
    console.error('Error in getDailyAttendanceAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

export async function getMonthlyRegisterAction(sectionId: string, month: number, year: number) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()
    if (!sectionId) return { success: false, error: 'Section selection is required.' }
    if (!validMonth(month, year)) return { success: false, error: 'Invalid month selected.' }
    const register = await getMonthlyRegister(supabase, institutionId, sectionId, year, month)
    return { success: true, register }
  } catch (error) {
    console.error('Error in getMonthlyRegisterAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

// ---------------------------------------------------------------------------
// Marking: students
// ---------------------------------------------------------------------------

export async function getStudentRosterAction(sectionId: string, date: string) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()
    if (!sectionId) return { success: false, error: 'Section selection is required.' }
    if (!DATE_RE.test(date)) return { success: false, error: 'A valid date is required.' }
    const roster = await getStudentMarkingRoster(supabase, institutionId, sectionId, date)
    return { success: true, roster }
  } catch (error) {
    console.error('Error in getStudentRosterAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

export async function saveStudentAttendanceAction(sectionId: string, date: string, entries: StudentMarkInput[]) {
  try {
    const { supabase, institutionId, userId } = await verifyAdminAccess()
    if (!sectionId) return { success: false, error: 'Section selection is required.' }
    if (!DATE_RE.test(date)) return { success: false, error: 'A valid date is required.' }
    if (!Array.isArray(entries) || entries.length === 0) {
      return { success: false, error: 'Mark at least one student before saving.' }
    }
    const result = await saveStudentAttendance(supabase, institutionId, userId, sectionId, date, entries)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/attendance')
    return { success: true, saved: result.saved }
  } catch (error) {
    console.error('Error in saveStudentAttendanceAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

// ---------------------------------------------------------------------------
// Marking: staff
// ---------------------------------------------------------------------------

export async function getStaffRosterAction(date: string) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()
    if (!DATE_RE.test(date)) return { success: false, error: 'A valid date is required.' }
    const roster = await getStaffMarkingRoster(supabase, institutionId, date)
    return { success: true, roster }
  } catch (error) {
    console.error('Error in getStaffRosterAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

export async function saveStaffAttendanceAction(date: string, entries: StaffMarkInput[]) {
  try {
    const { supabase, institutionId, userId } = await verifyAdminAccess()
    if (!DATE_RE.test(date)) return { success: false, error: 'A valid date is required.' }
    if (!Array.isArray(entries) || entries.length === 0) {
      return { success: false, error: 'Mark at least one staff member before saving.' }
    }
    const result = await saveStaffAttendance(supabase, institutionId, userId, date, entries)
    revalidatePath('/dashboard/attendance')
    return { success: true, saved: result.saved }
  } catch (error) {
    console.error('Error in saveStaffAttendanceAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------

export async function getLeaveRequestsAction(status: LeaveStatus | 'all') {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()
    const allowed = ['pending', 'approved', 'rejected', 'all']
    const leaves = await getLeaveRequests(supabase, institutionId, allowed.includes(status) ? status : 'pending')
    return { success: true, leaves }
  } catch (error) {
    console.error('Error in getLeaveRequestsAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

export async function reviewLeaveAction(leaveId: string, decision: 'approved' | 'rejected', note: string | null) {
  try {
    const { supabase, institutionId, userId } = await verifyAdminAccess()
    if (!leaveId) return { success: false, error: 'Leave request is required.' }
    if (decision !== 'approved' && decision !== 'rejected') return { success: false, error: 'Invalid decision.' }
    await reviewLeaveRequest(supabase, institutionId, userId, leaveId, decision, note)
    revalidatePath('/dashboard/attendance')
    return { success: true }
  } catch (error) {
    console.error('Error in reviewLeaveAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

export async function createLeaveAction(input: {
  studentId: string
  fromDate: string
  toDate: string
  reason: string
  approve: boolean
}) {
  try {
    const { supabase, institutionId, userId } = await verifyAdminAccess()
    if (!input?.studentId) return { success: false, error: 'Select a student.' }
    await createLeave(supabase, institutionId, userId, input)
    revalidatePath('/dashboard/attendance')
    return { success: true }
  } catch (error) {
    console.error('Error in createLeaveAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}

export async function getSectionStudentsAction(sectionId: string) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()
    if (!sectionId) return { success: false, error: 'Section selection is required.' }
    const students = await getSectionStudentOptions(supabase, institutionId, sectionId)
    return { success: true, students }
  } catch (error) {
    console.error('Error in getSectionStudentsAction:', error)
    return { success: false, error: errorMessage(error) }
  }
}
