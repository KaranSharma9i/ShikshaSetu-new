'use server'

import { createClient } from '@/utils/supabase/server'
import { setupNextAcademicYear } from '@/lib/repositories/academic'
import { undoPromotionBatch } from '@/lib/repositories/student'
import { revalidatePath } from 'next/cache'

export async function setupNextAcademicYearAction(params: {
  label: string
  startsOn: string
  endsOn: string
  fromYearId: string | null
}) {
  try {
    const supabase = await createClient()

    // 1. Retrieve session user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile to check role and get institution_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Profile not found or invalid.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only institution admins can set up academic years.' }
    }

    const institutionId = userData.institution_id

    // 3. Validation
    const label = (params.label || '').trim()
    const startsOn = (params.startsOn || '').trim()
    const endsOn = (params.endsOn || '').trim()

    if (!/^\d{4}-\d{2}$/.test(label)) {
      return { success: false, error: 'Invalid label format. Must be YYYY-YY (e.g. 2026-27).' }
    }

    if (!startsOn || isNaN(Date.parse(startsOn))) {
      return { success: false, error: 'Invalid start date.' }
    }

    if (!endsOn || isNaN(Date.parse(endsOn))) {
      return { success: false, error: 'Invalid end date.' }
    }

    if (new Date(startsOn) >= new Date(endsOn)) {
      return { success: false, error: 'Start date must be before the end date.' }
    }

    // 4. Check if academic year label already exists for this institution
    const { data: existingYears, error: queryError } = await supabase
      .from('academic_years')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('label', label)
      .is('deleted_at', null)

    if (queryError) {
      console.error('Error checking existing academic years:', queryError)
    }

    if (existingYears && existingYears.length > 0) {
      return { success: false, error: `Academic year with label "${label}" already exists.` }
    }

    // 5. Call repository function
    const res = await setupNextAcademicYear(supabase, {
      institutionId,
      label,
      startsOn,
      endsOn,
      fromYearId: params.fromYearId,
    })

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to set up academic year.' }
    }

    // 6. Revalidate cache
    revalidatePath('/dashboard/promotions')
    
    return {
      success: true,
      data: res.data
    }
  } catch (error: any) {
    console.error('Error in setupNextAcademicYearAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function undoPromotionBatchAction(batchId: string) {
  try {
    const supabase = await createClient()

    // 1. Retrieve session user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile to check role and get institution_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Profile not found or invalid.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only institution admins can undo promotions.' }
    }

    // 3. Call repository function
    const res = await undoPromotionBatch(supabase, batchId, user.id)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to undo promotion batch.' }
    }

    // 4. Revalidate cache
    revalidatePath('/dashboard/promotions')
    revalidatePath('/dashboard/students')

    return { success: true }
  } catch (error: any) {
    console.error('Error in undoPromotionBatchAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
