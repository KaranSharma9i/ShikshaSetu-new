import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export async function getTeachersCount(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('institution_id', institutionId)

  if (error) {
    console.error('Error in getTeachersCount:', error)
    return 0
  }
  return count || 0
}
