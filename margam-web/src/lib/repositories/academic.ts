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

export async function getClasses(
  supabase: SupabaseClient<Database>,
  institutionId: string
) {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, grade_number')
    .eq('institution_id', institutionId)
    .order('grade_number', { ascending: true })

  if (error) {
    console.error('Error in getClasses:', error)
    return []
  }
  return data || []
}

export async function getSections(
  supabase: SupabaseClient<Database>,
  classId: string
) {
  const { data, error } = await supabase
    .from('sections')
    .select('id, name, class_id')
    .eq('class_id', classId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error in getSections:', error)
    return []
  }
  return data || []
}

export async function getAllSectionsForInstitution(
  supabase: SupabaseClient<Database>,
  institutionId: string
) {
  const { data, error } = await supabase
    .from('sections')
    .select(`
      id,
      name,
      class_id,
      class:classes!inner (
        id,
        name,
        institution_id
      )
    `)
    .eq('class.institution_id', institutionId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error in getAllSectionsForInstitution:', error)
    return []
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    class_id: s.class_id,
    class_name: s.class?.name || ''
  }))
}

export async function getAcademicYears(
  supabase: SupabaseClient<Database>,
  institutionId: string
) {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, label, is_current, starts_on, ends_on')
    .eq('institution_id', institutionId)
    .order('starts_on', { ascending: false })

  if (error) {
    console.error('Error in getAcademicYears:', error)
    return []
  }
  return data || []
}


