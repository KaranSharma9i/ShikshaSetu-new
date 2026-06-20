'use server'

import { createClient } from '@/utils/supabase/server'
import { getSectionsByClassAndYear, getElectiveSubjectsForSection } from '@/lib/repositories/academic'
import { getEnrollmentsForPromotion, promoteStudents } from '@/lib/repositories/student'
import { revalidatePath } from 'next/cache'

export async function getSectionsForClassAction(classId: string, academicYearId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const sections = await getSectionsByClassAndYear(supabase, classId, academicYearId)
    return { success: true, data: sections }
  } catch (error: any) {
    console.error('Error in getSectionsForClassAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function getPromotionStudentsAction(
  academicYearId: string,
  sectionId: string,
  targetAcademicYearId?: string
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'User profile not found.' }
    }

    const students = await getEnrollmentsForPromotion(
      supabase,
      userData.institution_id,
      academicYearId,
      sectionId,
      targetAcademicYearId
    )
    return { success: true, data: students }
  } catch (error: any) {
    console.error('Error in getPromotionStudentsAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function getElectivesForSectionAction(sectionId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const electives = await getElectiveSubjectsForSection(supabase, sectionId)
    return { success: true, data: electives }
  } catch (error: any) {
    console.error('Error in getElectivesForSectionAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function promoteStudentsAction(params: {
  fromAcademicYearId: string
  toAcademicYearId: string
  promotions: Array<{
    student_id: string
    old_enrollment_id: string
    target_section_id: string
    roll_number: string
    elective_class_subject_ids: string[]
    outcome?: string
  }>
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'User profile not found.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only admins can perform promotions.' }
    }

    const res = await promoteStudents(supabase, {
      institutionId: userData.institution_id,
      fromAcademicYearId: params.fromAcademicYearId,
      toAcademicYearId: params.toAcademicYearId,
      performedBy: user.id,
      promotions: params.promotions
    })

    if (res.success) {
      revalidatePath('/dashboard/promotions')
      revalidatePath('/dashboard/students')
    }

    return res
  } catch (error: any) {
    console.error('Error in promoteStudentsAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
