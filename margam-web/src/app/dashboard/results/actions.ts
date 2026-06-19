'use server'

import { createClient } from '@/utils/supabase/server'
import {
  getExamTermsByClassAndYear,
  createExamTerm,
  assignExamsToTerm
} from '@/lib/repositories/results'
import { revalidatePath } from 'next/cache'

/**
 * Server action to get exam terms for a specific academic year and class
 */
export async function getExamTermsAction(academicYearId: string, classId: string) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const institutionId = userData.institution_id

    // 3. Fetch exam terms
    const terms = await getExamTermsByClassAndYear(supabase, institutionId, academicYearId, classId)
    return { success: true, data: terms }
  } catch (error: any) {
    console.error('Error in getExamTermsAction:', error)
    return { success: false, error: error.message || 'Failed to fetch exam terms.' }
  }
}

/**
 * Server action to create a new exam term on-the-fly
 */
export async function createExamTermAction(params: {
  academicYearId: string
  classId: string
  name: string
}) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only admins can manage exam terms.' }
    }

    const institutionId = userData.institution_id
    const termName = (params.name || '').trim()

    if (!termName) {
      return { success: false, error: 'Term name cannot be empty.' }
    }

    // 3. Create term
    const res = await createExamTerm(supabase, {
      institution_id: institutionId,
      academic_year_id: params.academicYearId,
      class_id: params.classId,
      name: termName,
    })

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to create exam term.' }
    }

    return { success: true, data: res.data }
  } catch (error: any) {
    console.error('Error in createExamTermAction:', error)
    return { success: false, error: error.message || 'Failed to create exam term.' }
  }
}

/**
 * Server action to assign legacy exams to an exam term
 */
export async function assignExamsToTermAction(params: {
  academicYearId: string
  classId: string
  examName: string
  examTermId: string
}) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only admins can assign exams.' }
    }

    const institutionId = userData.institution_id

    // 3. Assign exams
    const res = await assignExamsToTerm(supabase, {
      institutionId,
      academicYearId: params.academicYearId,
      classId: params.classId,
      examName: params.examName,
      examTermId: params.examTermId,
    })

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to assign exams.' }
    }

    // 4. Revalidate pages
    revalidatePath('/dashboard/results')
    revalidatePath('/dashboard/results/legacy-assign')

    return { success: true, count: res.count }
  } catch (error: any) {
    console.error('Error in assignExamsToTermAction:', error)
    return { success: false, error: error.message || 'Failed to assign exams.' }
  }
}
