'use server'

import { createClient } from '@/utils/supabase/server'
import {
  getStudentAttendanceSummary,
  getStudentAttendanceList,
  getStaffAttendanceSummary,
  getStaffAttendanceList,
  getInstitutionAttendance,
  resolveStudentAcademicYear,
  resolveStaffAcademicYear,
} from '@/lib/repositories/attendance'

// Authenticate and verify tenant admin access
async function verifyAdminAccess() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not logged in.')
  }

  // 2. Fetch admin user profile to enforce tenant boundaries
  const { data: userData, error: userErr } = await supabase
    .from('users')
    .select('role, institution_id')
    .eq('id', user.id)
    .single()

  if (userErr || !userData || userData.role !== 'institution_admin') {
    throw new Error('Unauthorized. Only institution admins can access attendance data.')
  }

  return { supabase, institutionId: userData.institution_id }
}

export async function getStudentAttendanceAction(
  sectionId: string,
  month: number,
  year: number
) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()

    if (!sectionId) {
      return { success: false, error: 'Section selection is required.' }
    }

    // Resolve academic year based on selected date
    const resolvedAY = await resolveStudentAcademicYear(
      supabase,
      institutionId,
      sectionId,
      month,
      year
    )

    if (!resolvedAY) {
      return { success: false, error: 'Academic year details not found.' }
    }

    const [summary, list] = await Promise.all([
      getStudentAttendanceSummary(
        supabase,
        institutionId,
        sectionId,
        resolvedAY.id,
        resolvedAY.resolvedYear,
        month
      ),
      getStudentAttendanceList(
        supabase,
        institutionId,
        sectionId,
        resolvedAY.id,
        resolvedAY.resolvedYear,
        month
      ),
    ])

    return {
      success: true,
      summary,
      list,
    }
  } catch (error: any) {
    console.error('Error in getStudentAttendanceAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function getStaffAttendanceAction(
  month: number,
  year: number,
  department: string
) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()

    // Resolve academic year based on selected date
    const resolvedAY = await resolveStaffAcademicYear(
      supabase,
      institutionId,
      month,
      year
    )

    if (!resolvedAY) {
      return { success: false, error: 'Academic year details not found.' }
    }

    const [summary, list] = await Promise.all([
      getStaffAttendanceSummary(
        supabase,
        institutionId,
        resolvedAY.id,
        resolvedAY.resolvedYear,
        month,
        department
      ),
      getStaffAttendanceList(
        supabase,
        institutionId,
        resolvedAY.id,
        resolvedAY.resolvedYear,
        month,
        department
      ),
    ])

    return {
      success: true,
      summary,
      list,
    }
  } catch (error: any) {
    console.error('Error in getStaffAttendanceAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function getDailyAttendanceAction(date: string) {
  try {
    const { supabase, institutionId } = await verifyAdminAccess()

    if (!date) {
      return { success: false, error: 'Date selection is required.' }
    }

    const breakdown = await getInstitutionAttendance(supabase, institutionId, date)

    return {
      success: true,
      breakdown,
    }
  } catch (error: any) {
    console.error('Error in getDailyAttendanceAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
