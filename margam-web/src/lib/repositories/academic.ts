import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export async function getCurrentAcademicYear(
  supabase: SupabaseClient<Database>,
  institutionId: string
) {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, label, starts_on, ends_on')
    .eq('institution_id', institutionId)
    .eq('is_current', true)
    .maybeSingle()

  if (error) {
    console.error('Error in getCurrentAcademicYear:', error)
    return null
  }
  return data
}
