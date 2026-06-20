'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getExamsSummary,
  getExamDatesheetForClass,
  saveExamDatesheetForClass,
  updateExamName,
  deleteExam,
  DatesheetRowInput
} from '@/lib/repositories/exams'

/**
 * Validates the current user session and fetches profile details.
 * Returns the institution_id if the user is authorized.
 */
async function getAuthorizedInstitutionContext() {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized: No active session.')
  }

  // 2. Fetch user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('institution_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    throw new Error('Unauthorized: Invalid user profile.')
  }

  if (userData.role !== 'institution_admin') {
    throw new Error('Unauthorized: Admin access required.')
  }

  return { supabase, institutionId: userData.institution_id }
}

/**
 * Fetches distinct exams with summary details for the main view.
 */
export async function getExamsSummaryAction(academicYearId: string) {
  try {
    const { supabase, institutionId } = await getAuthorizedInstitutionContext()
    const exams = await getExamsSummary(supabase, institutionId, academicYearId)
    return { success: true, data: exams }
  } catch (error: any) {
    console.error('Error in getExamsSummaryAction:', error)
    return { success: false, error: error.message || 'Failed to fetch exams.' }
  }
}

/**
 * Fetches the datesheet slots for a specific class.
 */
export async function getExamDatesheetForClassAction(
  examName: string,
  classId: string,
  academicYearId: string
) {
  try {
    const { supabase, institutionId } = await getAuthorizedInstitutionContext()
    const datesheet = await getExamDatesheetForClass(
      supabase,
      institutionId,
      academicYearId,
      examName,
      classId
    )
    return { success: true, data: datesheet }
  } catch (error: any) {
    console.error('Error in getExamDatesheetForClassAction:', error)
    return { success: false, error: error.message || 'Failed to fetch datesheet.' }
  }
}

/**
 * Saves/Updates/Deletes datesheet slots for a specific class.
 */
export async function saveExamDatesheetForClassAction(params: {
  examName: string
  classId: string
  academicYearId: string
  rows: DatesheetRowInput[]
  deletedRowIds?: string[]
}) {
  try {
    const { supabase, institutionId } = await getAuthorizedInstitutionContext()
    const result = await saveExamDatesheetForClass(supabase, {
      institutionId,
      academicYearId: params.academicYearId,
      examName: params.examName,
      classId: params.classId,
      rows: params.rows,
      deletedRowIds: params.deletedRowIds
    })

    if (result.success) {
      revalidatePath('/dashboard/exams')
    }
    return result
  } catch (error: any) {
    console.error('Error in saveExamDatesheetForClassAction:', error)
    return { success: false, error: error.message || 'Failed to save datesheet.' }
  }
}

/**
 * Renames an exam across all classes bulk-wise.
 */
export async function updateExamNameAction(
  academicYearId: string,
  oldName: string,
  newName: string
) {
  try {
    const { supabase, institutionId } = await getAuthorizedInstitutionContext()
    
    if (!newName || newName.trim() === '') {
      return { success: false, error: 'Exam name cannot be empty.' }
    }

    const result = await updateExamName(
      supabase,
      institutionId,
      academicYearId,
      oldName,
      newName.trim()
    )

    if (result.success) {
      revalidatePath('/dashboard/exams')
    }
    return result
  } catch (error: any) {
    console.error('Error in updateExamNameAction:', error)
    return { success: false, error: error.message || 'Failed to rename exam.' }
  }
}

/**
 * Deletes an entire exam (all classes and slots). Safe-guarded by checks for marks entry.
 */
export async function deleteExamAction(examName: string, academicYearId: string) {
  try {
    const { supabase, institutionId } = await getAuthorizedInstitutionContext()
    const result = await deleteExam(supabase, institutionId, academicYearId, examName)

    if (result.success) {
      revalidatePath('/dashboard/exams')
    }
    return result
  } catch (error: any) {
    console.error('Error in deleteExamAction:', error)
    return { success: false, error: error.message || 'Failed to delete exam.' }
  }
}
