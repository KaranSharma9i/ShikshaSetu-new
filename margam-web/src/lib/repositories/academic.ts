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
  return data as any
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
  return (data || []) as any[]
}

export async function getAcademicYearClonePreview(
  supabase: SupabaseClient<Database>,
  currentYearId: string
) {
  const { count: sectionsCount, error: sectionsError } = await supabase
    .from('sections')
    .select('id', { count: 'exact', head: true })
    .eq('academic_year_id', currentYearId)
    .is('deleted_at', null)

  if (sectionsError) {
    console.error('Error counting sections for preview:', sectionsError)
    throw new Error(`Failed to count sections: ${sectionsError.message}`)
  }

  const { count: subjectsCount, error: subjectsError } = await supabase
    .from('class_subjects')
    .select('id', { count: 'exact', head: true })
    .eq('academic_year_id', currentYearId)
    .is('deleted_at', null)

  if (subjectsError) {
    console.error('Error counting class subjects for preview:', subjectsError)
    throw new Error(`Failed to count subject assignments: ${subjectsError.message}`)
  }

  return {
    sectionsCount: sectionsCount || 0,
    subjectsCount: subjectsCount || 0,
  }
}

export async function setupNextAcademicYear(
  supabase: SupabaseClient<Database>,
  params: {
    institutionId: string
    label: string
    startsOn: string
    endsOn: string
    fromYearId: string | null
  }
) {
  const { data, error } = await (supabase as any).rpc('setup_next_academic_year', {
    p_institution_id: params.institutionId,
    p_label: params.label,
    p_starts_on: params.startsOn,
    p_ends_on: params.endsOn,
    p_from_academic_year_id: params.fromYearId
  })

  if (error) {
    console.error('Error calling setup_next_academic_year RPC:', error)
    return { success: false, error: error.message }
  }

  const result = (Array.isArray(data) ? data[0] : data) as any
  return {
    success: true,
    data: {
      newAcademicYearId: result?.new_academic_year_id,
      sectionsCloned: result?.sections_cloned || 0,
      subjectsCloned: result?.subjects_cloned || 0
    }
  }
}

export async function getSectionsByClassAndYear(
  supabase: SupabaseClient<Database>,
  classId: string,
  academicYearId: string
) {
  const { data, error } = await supabase
    .from('sections')
    .select('id, name, class_id')
    .eq('class_id', classId)
    .eq('academic_year_id', academicYearId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error in getSectionsByClassAndYear:', error)
    return []
  }
  return data || []
}

export async function getElectiveSubjectsForSection(
  supabase: SupabaseClient<Database>,
  sectionId: string
) {
  const { data, error } = await (supabase
    .from('class_subjects')
    .select(`
      id,
      subject_id,
      subject:subjects!inner (
        id,
        name,
        code
      )
    `)
    .eq('section_id', sectionId)
    .eq('is_elective', true)
    .is('deleted_at', null) as any)

  if (error) {
    console.error('Error in getElectiveSubjectsForSection:', error)
    return []
  }
  return (data || []).map((cs: any) => ({
    class_subject_id: cs.id,
    subject_id: cs.subject_id,
    name: cs.subject?.name || '',
    code: cs.subject?.code || ''
  }))
}





