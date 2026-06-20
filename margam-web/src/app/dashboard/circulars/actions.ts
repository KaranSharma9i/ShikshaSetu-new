'use server'

import { createClient } from '@/utils/supabase/server'
import { createCircular, deleteCircular } from '@/lib/repositories/circular'
import { revalidatePath } from 'next/cache'

export async function createCircularAction(
  institutionId: string,
  params: {
    title: string
    content: string
    category: string
    targetRoles: string[]
    targetClassId: string | null
    expiryDate: string | null
  }
) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User is not logged in.' }
    }

    // 2. Fetch admin user profile to enforce tenant boundaries
    const { data: adminData, error: adminErr } = await supabase
      .from('users')
      .select('role, institution_id')
      .eq('id', user.id)
      .single()

    if (adminErr || !adminData || adminData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized. Only institution admins can broadcast circulars.' }
    }

    if (adminData.institution_id !== institutionId) {
      return { success: false, error: 'Tenant boundary violation: Institution mismatch.' }
    }

    // Validation
    if (!params.title.trim()) {
      return { success: false, error: 'Title is required.' }
    }
    if (!params.content.trim()) {
      return { success: false, error: 'Content is required.' }
    }
    if (!params.category) {
      return { success: false, error: 'Category is required.' }
    }
    if (!params.targetRoles || params.targetRoles.length === 0) {
      return { success: false, error: 'At least one target role is required.' }
    }

    // Today's date (YYYY-MM-DD)
    const todayStr = new Date().toISOString().slice(0, 10)

    // 3. Create circular
    const result = await createCircular(supabase, {
      institution_id: institutionId,
      title: params.title.trim(),
      content: params.content.trim(),
      publish_date: todayStr,
      expiry_date: params.expiryDate || null,
      created_by: user.id,
      category: params.category,
      target_roles: params.targetRoles,
      target_class_id: params.targetClassId || null
    })

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to create circular.' }
    }

    // 4. Revalidate cache
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/circulars')

    return { success: true, id: result.id }
  } catch (error: any) {
    console.error('Error in createCircularAction:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}

export async function deleteCircularAction(id: string, institutionId: string) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User is not logged in.' }
    }

    // 2. Fetch admin user profile to enforce tenant boundaries
    const { data: adminData, error: adminErr } = await supabase
      .from('users')
      .select('role, institution_id')
      .eq('id', user.id)
      .single()

    if (adminErr || !adminData || adminData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized. Only institution admins can delete circulars.' }
    }

    if (adminData.institution_id !== institutionId) {
      return { success: false, error: 'Tenant boundary violation: Institution mismatch.' }
    }

    // 3. Delete circular
    const result = await deleteCircular(supabase, id, institutionId)

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to delete circular.' }
    }

    // 4. Revalidate cache
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/circulars')

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteCircularAction:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}
