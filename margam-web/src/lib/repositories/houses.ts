import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

// Types
export type HouseColor = 'red' | 'green' | 'yellow' | 'blue';

export type House = {
  id: string;
  institution_id: string;
  name: string;
  color: HouseColor;
  display_order: number;
};

// Fetch all 4 houses for an institution, ordered by display_order
export async function getHousesByInstitution(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<House[]> {
  const { data, error } = await (supabase
    .from('houses') as any)
    .select('*')
    .eq('institution_id', institutionId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error in getHousesByInstitution:', error)
    return []
  }
  return data || []
}

// Update only the name of a house (color is immutable — never expose an update for it)
// Must verify the house belongs to the given institutionId before updating
export async function updateHouseName(
  supabase: SupabaseClient<Database>,
  houseId: string,
  newName: string,
  institutionId: string
): Promise<House | null> {
  // 1. Verify that the house belongs to the given institutionId
  const { data: checkData, error: checkError } = await (supabase
    .from('houses') as any)
    .select('id')
    .eq('id', houseId)
    .eq('institution_id', institutionId)
    .maybeSingle()

  if (checkError || !checkData) {
    console.error('House not found or tenant mismatch in updateHouseName:', checkError)
    return null
  }

  // 2. Perform the update
  const { data, error } = await (supabase
    .from('houses') as any)
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', houseId)
    .eq('institution_id', institutionId)
    .select()
    .single()

  if (error) {
    console.error('Error in updateHouseName:', error)
    return null
  }

  return data
}
