'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getTimetableForSection,
  getClassSubjectsForSection,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry
} from '@/lib/repositories/timetable'

/**
 * Validate that the caller is an authenticated institution admin and belongs to the specified institution.
 */
async function validateAdminSession(institutionId: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'User is not logged in.', supabase }
  }

  // 2. Fetch admin user profile to enforce tenant boundaries
  const { data: adminData, error: adminErr } = await supabase
    .from('users')
    .select('role, institution_id')
    .eq('id', user.id)
    .single()

  if (adminErr || !adminData || adminData.role !== 'institution_admin') {
    return { success: false, error: 'Unauthorized. Only institution admins can manage timetables.', supabase }
  }

  if (adminData.institution_id !== institutionId) {
    return { success: false, error: 'Tenant boundary violation: Institution mismatch.', supabase }
  }

  return { success: true, user, supabase }
}

/**
 * Fetch the timetable for a section.
 */
export async function getTimetableAction(
  institutionId: string,
  sectionId: string,
  academicYearId: string
) {
  try {
    const { success, error, supabase } = await validateAdminSession(institutionId)
    if (!success || !supabase) {
      return { success: false, error }
    }

    if (!sectionId || !academicYearId) {
      return { success: false, error: 'Section and Academic Year are required.' }
    }

    const timetable = await getTimetableForSection(supabase, sectionId, academicYearId)
    return { success: true, data: timetable }
  } catch (error: any) {
    console.error('Error in getTimetableAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

/**
 * Fetch all class subjects assigned to a section.
 */
export async function getClassSubjectsAction(
  institutionId: string,
  sectionId: string,
  academicYearId: string
) {
  try {
    const { success, error, supabase } = await validateAdminSession(institutionId)
    if (!success || !supabase) {
      return { success: false, error }
    }

    if (!sectionId || !academicYearId) {
      return { success: false, error: 'Section and Academic Year are required.' }
    }

    const subjects = await getClassSubjectsForSection(supabase, sectionId, academicYearId)
    return { success: true, data: subjects }
  } catch (error: any) {
    console.error('Error in getClassSubjectsAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

/**
 * Create or update a timetable entry.
 */
export async function saveTimetableEntryAction(
  institutionId: string,
  params: {
    id?: string // Present if updating
    sectionId: string
    classSubjectId: string
    day: string
    periodNumber: number
    startsAt: string
    endsAt: string
    room?: string | null
    academicYearId: string
  }
) {
  try {
    const { success, error, supabase } = await validateAdminSession(institutionId)
    if (!success || !supabase) {
      return { success: false, error }
    }

    // Input Validation
    if (!params.sectionId) return { success: false, error: 'Section is required.' }
    if (!params.classSubjectId) return { success: false, error: 'Class Subject is required.' }
    if (!params.day) return { success: false, error: 'Day is required.' }
    if (!params.periodNumber || params.periodNumber < 1 || params.periodNumber > 12) {
      return { success: false, error: 'Period number must be between 1 and 12.' }
    }
    if (!params.startsAt || !params.endsAt) {
      return { success: false, error: 'Start time and End time are required.' }
    }
    if (params.startsAt >= params.endsAt) {
      return { success: false, error: 'End time must be after start time.' }
    }

    let result
    if (params.id) {
      result = await updateTimetableEntry(supabase, params.id, institutionId, params)
    } else {
      result = await createTimetableEntry(supabase, institutionId, params)
    }

    if (result.success) {
      revalidatePath('/dashboard/timetable')
      return { success: true, id: (result as any).id }
    } else {
      return { success: false, error: result.error || 'Failed to save timetable entry.' }
    }
  } catch (error: any) {
    console.error('Error in saveTimetableEntryAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

/**
 * Delete a timetable entry.
 */
export async function deleteTimetableEntryAction(
  id: string,
  institutionId: string
) {
  try {
    const { success, error, supabase } = await validateAdminSession(institutionId)
    if (!success || !supabase) {
      return { success: false, error }
    }

    if (!id) {
      return { success: false, error: 'Timetable entry ID is required.' }
    }

    const result = await deleteTimetableEntry(supabase, id, institutionId)

    if (result.success) {
      revalidatePath('/dashboard/timetable')
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Failed to delete timetable entry.' }
    }
  } catch (error: any) {
    console.error('Error in deleteTimetableEntryAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
