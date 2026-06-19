import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export interface LegacyExamCombination {
  academic_year_id: string
  academic_year_label: string
  class_id: string
  class_name: string
  exam_name: string
  matching_exams_count: number
}

/**
 * Fetches distinct combinations of academic_year_id, class_id, and exam_name
 * for exams that do not have an exam_term_id assigned.
 */
export async function getLegacyExams(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<LegacyExamCombination[]> {
  const { data, error } = await (supabase as any)
    .from('exams')
    .select(`
      id,
      academic_year_id,
      class_id,
      exam_name,
      academic_years ( label ),
      classes ( name )
    `)
    .eq('institution_id', institutionId)
    .is('exam_term_id', null)
    .is('deleted_at', null)

  if (error) {
    console.error('Error fetching legacy exams:', error)
    return []
  }

  const groups: Record<string, {
    academic_year_id: string
    academic_year_label: string
    class_id: string
    class_name: string
    exam_name: string
    count: number
  }> = {}

  for (const exam of (data || [])) {
    const key = `${exam.academic_year_id}_${exam.class_id}_${exam.exam_name}`
    if (!groups[key]) {
      groups[key] = {
        academic_year_id: exam.academic_year_id,
        academic_year_label: (exam.academic_years as any)?.label || 'Unknown',
        class_id: exam.class_id,
        class_name: (exam.classes as any)?.name || 'Unknown',
        exam_name: exam.exam_name,
        count: 0
      }
    }
    groups[key].count++
  }

  return Object.values(groups).map(g => ({
    academic_year_id: g.academic_year_id,
    academic_year_label: g.academic_year_label,
    class_id: g.class_id,
    class_name: g.class_name,
    exam_name: g.exam_name,
    matching_exams_count: g.count
  }))
}

/**
 * Fetches exam terms for a specific academic year and class.
 */
export async function getExamTermsByClassAndYear(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  classId: string
) {
  const { data, error } = await (supabase as any)
    .from('exam_terms')
    .select('id, name, term_type, starts_on, ends_on')
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .eq('class_id', classId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching exam terms:', error)
    return []
  }
  return data || []
}

/**
 * Creates a new exam term.
 */
export async function createExamTerm(
  supabase: SupabaseClient<Database>,
  term: {
    institution_id: string
    academic_year_id: string
    class_id: string
    name: string
    term_type?: string
    starts_on?: string
    ends_on?: string
  }
) {
  const { data, error } = await (supabase as any)
    .from('exam_terms')
    .insert([term])
    .select('id, name')
    .single()

  if (error) {
    console.error('Error creating exam term:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

/**
 * Assigns all legacy exams matching the academic year, class, and exam name
 * to the specified exam term.
 */
export async function assignExamsToTerm(
  supabase: SupabaseClient<Database>,
  params: {
    institutionId: string
    academicYearId: string
    classId: string
    examName: string
    examTermId: string
  }
) {
  const { data, error } = await (supabase as any)
    .from('exams')
    .update({ exam_term_id: params.examTermId })
    .eq('institution_id', params.institutionId)
    .eq('academic_year_id', params.academicYearId)
    .eq('class_id', params.classId)
    .eq('exam_name', params.examName)
    .is('exam_term_id', null)
    .is('deleted_at', null)
    .select('id')

  if (error) {
    console.error('Error assigning exams to term:', error)
    return { success: false, error: error.message }
  }
  return { success: true, count: data?.length || 0 }
}
