'use server'

import { createClient } from '@/utils/supabase/server'
import { getSectionsByClassAndYear } from '@/lib/repositories/academic'
import { getEnrollmentsForSectionMove, moveEnrollmentsSection } from '@/lib/repositories/student'
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

export async function getSectionMoveStudentsAction(
  academicYearId: string,
  sectionId: string
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

    const students = await getEnrollmentsForSectionMove(
      supabase,
      userData.institution_id,
      academicYearId,
      sectionId
    )
    return { success: true, data: students }
  } catch (error: any) {
    console.error('Error in getSectionMoveStudentsAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function moveSectionStudentsAction(params: {
  enrollmentIds: string[]
  targetSectionId: string
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
      return { success: false, error: 'Unauthorized: Only admins can perform section moves.' }
    }

    const res = await moveEnrollmentsSection(
      supabase,
      userData.institution_id,
      params.enrollmentIds,
      params.targetSectionId
    )

    if (res.success) {
      revalidatePath('/dashboard/promotions')
      revalidatePath('/dashboard/students')
    }

    return res
  } catch (error: any) {
    console.error('Error in moveSectionStudentsAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
