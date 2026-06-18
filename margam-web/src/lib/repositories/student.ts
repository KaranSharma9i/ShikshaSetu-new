import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export async function getStudentsCount(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('institution_id', institutionId)

  if (error) {
    console.error('Error in getStudentsCount:', error)
    return 0
  }
  return count || 0
}
