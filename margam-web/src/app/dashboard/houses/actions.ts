'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getHousesByInstitution,
  updateHouseName as updateHouseNameInRepo,
  House
} from '@/lib/repositories/houses'

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
 * Fetches all houses for the authenticated institution.
 */
export async function getHouses(): Promise<House[]> {
  try {
    const { supabase, institutionId } = await getAuthorizedInstitutionContext()
    return await getHousesByInstitution(supabase, institutionId)
  } catch (error: any) {
    console.error('Error in getHouses action:', error)
    return []
  }
}

/**
 * Updates the name of a specific house.
 */
export async function updateHouseName(
  houseId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newName || !newName.trim()) {
      return { success: false, error: 'House name cannot be empty.' }
    }

    const { supabase, institutionId } = await getAuthorizedInstitutionContext()
    
    const updated = await updateHouseNameInRepo(supabase, houseId, newName.trim(), institutionId)
    if (!updated) {
      return { success: false, error: 'Failed to update house name. Verify it exists and belongs to your institution.' }
    }

    revalidatePath('/dashboard/houses')
    revalidatePath('/dashboard/id-cards')
    return { success: true }
  } catch (error: any) {
    console.error('Error in updateHouseName action:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
