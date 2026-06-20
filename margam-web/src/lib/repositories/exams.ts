import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export interface ExamSummary {
  exam_name: string
  academic_year_id: string
  academic_year_label: string
  class_count: number
  total_slots: number
}

export interface DatesheetRowInput {
  id?: string
  subject_id: string
  exam_date: string
  start_time: string | null
  end_time: string | null
  total_marks: number
  passing_marks: number
  venue?: string | null
  syllabus_file_url?: string | null
}

/**
 * Fetches distinct exams with summary metrics (classes count, slots count)
 * for a given institution and academic year.
 */
export async function getExamsSummary(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string
): Promise<ExamSummary[]> {
  const { data, error } = await (supabase as any)
    .from('exams')
    .select(`
      id,
      exam_name,
      class_id,
      academic_year_id,
      academic_years ( label )
    `)
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .is('deleted_at', null)

  if (error) {
    console.error('Error in getExamsSummary:', error)
    return []
  }

  const groups: Record<string, {
    exam_name: string
    academic_year_id: string
    academic_year_label: string
    classes: Set<string>
    slotsCount: number
  }> = {}

  for (const row of (data || [])) {
    const key = row.exam_name
    if (!groups[key]) {
      groups[key] = {
        exam_name: row.exam_name,
        academic_year_id: row.academic_year_id,
        academic_year_label: (row.academic_years as any)?.label || 'Unknown',
        classes: new Set<string>(),
        slotsCount: 0
      }
    }
    groups[key].classes.add(row.class_id)
    groups[key].slotsCount++
  }

  return Object.values(groups).map(g => ({
    exam_name: g.exam_name,
    academic_year_id: g.academic_year_id,
    academic_year_label: g.academic_year_label,
    class_count: g.classes.size,
    total_slots: g.slotsCount
  })).sort((a, b) => a.exam_name.localeCompare(b.exam_name))
}

/**
 * Fetches the datesheet slots for a specific exam, class, and academic year.
 */
export async function getExamDatesheetForClass(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  examName: string,
  classId: string
) {
  const { data, error } = await (supabase as any)
    .from('exams')
    .select(`
      id,
      class_id,
      subject_id,
      exam_date,
      start_time,
      end_time,
      total_marks,
      passing_marks,
      venue,
      syllabus_file_url,
      is_locked
    `)
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .eq('exam_name', examName)
    .eq('class_id', classId)
    .is('deleted_at', null)
    .order('exam_date', { ascending: true })

  if (error) {
    console.error('Error in getExamDatesheetForClass:', error)
    return []
  }
  return data || []
}

/**
 * Saves/Updates datesheet slots for a given exam, academic year, and class.
 * Supports soft-deleting removed rows and inserting/updating others.
 */
export async function saveExamDatesheetForClass(
  supabase: SupabaseClient<Database>,
  params: {
    institutionId: string
    academicYearId: string
    examName: string
    classId: string
    rows: DatesheetRowInput[]
    deletedRowIds?: string[]
  }
) {
  const { institutionId, academicYearId, examName, classId, rows, deletedRowIds } = params

  // 1. Delete rows if deletedRowIds is provided (Soft delete)
  if (deletedRowIds && deletedRowIds.length > 0) {
    const { error: deleteError } = await (supabase as any)
      .from('exams')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', deletedRowIds)
      .eq('institution_id', institutionId)

    if (deleteError) {
      console.error('Error deleting datesheet rows:', deleteError)
      return { success: false, error: deleteError.message }
    }
  }

  // 2. Separate inserts and updates
  const toInsert = rows.filter(r => !r.id).map(r => ({
    institution_id: institutionId,
    academic_year_id: academicYearId,
    class_id: classId,
    exam_name: examName,
    subject_id: r.subject_id,
    exam_date: r.exam_date,
    start_time: r.start_time,
    end_time: r.end_time,
    total_marks: r.total_marks,
    passing_marks: r.passing_marks,
    venue: r.venue || null,
    syllabus_file_url: r.syllabus_file_url || null
  }))

  const toUpdate = rows.filter(r => r.id)

  // Perform inserts
  if (toInsert.length > 0) {
    const { error: insertError } = await (supabase as any)
      .from('exams')
      .insert(toInsert)

    if (insertError) {
      console.error('Error inserting datesheet rows:', insertError)
      return { success: false, error: insertError.message }
    }
  }

  // Perform updates
  for (const row of toUpdate) {
    const { error: updateError } = await (supabase as any)
      .from('exams')
      .update({
        subject_id: row.subject_id,
        exam_date: row.exam_date,
        start_time: row.start_time,
        end_time: row.end_time,
        total_marks: row.total_marks,
        passing_marks: row.passing_marks,
        venue: row.venue || null,
        syllabus_file_url: row.syllabus_file_url || null
      })
      .eq('id', row.id!)
      .eq('institution_id', institutionId)

    if (updateError) {
      console.error('Error updating datesheet row:', updateError)
      return { success: false, error: updateError.message }
    }
  }

  return { success: true }
}

/**
 * Renames all slots of an exam.
 */
export async function updateExamName(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  oldName: string,
  newName: string
) {
  const { error } = await (supabase as any)
    .from('exams')
    .update({ exam_name: newName })
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .eq('exam_name', oldName)
    .is('deleted_at', null)

  if (error) {
    console.error('Error updating exam name:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Checks if results exist in `exam_results` for any slot under the exam name.
 */
export async function hasExamResults(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  examName: string
): Promise<boolean> {
  const { data: exams, error: examsError } = await (supabase as any)
    .from('exams')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .eq('exam_name', examName)
    .is('deleted_at', null)

  if (examsError || !exams || exams.length === 0) {
    return false
  }

  const examIds = exams.map((e: any) => e.id)

  const { count, error: resultsError } = await (supabase as any)
    .from('exam_results')
    .select('id', { count: 'exact', head: true })
    .in('exam_id', examIds)
    .is('deleted_at', null)

  if (resultsError) {
    console.error('Error checking exam results:', resultsError)
    return false
  }

  return (count || 0) > 0
}

/**
 * Deletes an entire exam by setting its deleted_at.
 * Safe-guards deletion by checking if any marks/results exist first.
 */
export async function deleteExam(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  examName: string
) {
  const resultsExist = await hasExamResults(supabase, institutionId, academicYearId, examName)
  if (resultsExist) {
    return {
      success: false,
      error: 'Cannot delete exam: student marks have already been recorded. Delete the marks first.'
    }
  }

  const { error } = await (supabase as any)
    .from('exams')
    .update({ deleted_at: new Date().toISOString() })
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .eq('exam_name', examName)
    .is('deleted_at', null)

  if (error) {
    console.error('Error deleting exam:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}
