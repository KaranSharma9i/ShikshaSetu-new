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

/**
 * Fetches distinct subjects that have exams in a specific class, academic year, and term.
 */
export async function getSubjectsWithExams(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  classId: string,
  examTermId: string | null
) {
  let query = (supabase as any)
    .from('exams')
    .select(`
      subject_id,
      subject:subjects!inner ( id, name, code )
    `)
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .eq('class_id', classId)
    .is('deleted_at', null)

  if (examTermId === null) {
    query = query.is('exam_term_id', null)
  } else {
    query = query.eq('exam_term_id', examTermId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching subjects with exams:', error)
    return []
  }

  // Deduplicate subjects in memory
  const uniqueSubjects: Record<string, { id: string; name: string; code: string }> = {}
  for (const item of (data || [])) {
    const sub = item.subject
    if (sub && !uniqueSubjects[sub.id]) {
      uniqueSubjects[sub.id] = {
        id: sub.id,
        name: sub.name,
        code: sub.code || ''
      }
    }
  }

  return Object.values(uniqueSubjects)
}

/**
 * Fetches exams for a specific academic year, class, term, and subject.
 */
export async function getExamsForSelection(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  classId: string,
  examTermId: string | null,
  subjectId: string
) {
  let query = (supabase as any)
    .from('exams')
    .select(`
      id,
      exam_name,
      exam_date,
      total_marks,
      passing_marks,
      is_locked,
      locked_at,
      locked_by,
      locked_by_user:users!exams_locked_by_fkey (
        full_name
      )
    `)
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .eq('class_id', classId)
    .eq('subject_id', subjectId)
    .is('deleted_at', null)

  if (examTermId === null) {
    query = query.is('exam_term_id', null)
  } else {
    query = query.eq('exam_term_id', examTermId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching exams for selection:', error)
    return []
  }

  return (data || []).map((exam: any) => ({
    id: exam.id,
    exam_name: exam.exam_name,
    exam_date: exam.exam_date,
    total_marks: exam.total_marks,
    passing_marks: exam.passing_marks,
    is_locked: exam.is_locked,
    locked_at: exam.locked_at,
    locked_by: exam.locked_by,
    locked_by_name: exam.locked_by_user?.full_name || null
  }))
}

/**
 * Fetches all active student enrollments for a class in an academic year.
 */
export async function getClassStudentsForResults(
  supabase: SupabaseClient<Database>,
  classId: string,
  academicYearId: string
) {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      roll_number,
      student_id,
      student:students!inner (
        id,
        user:users!inner (
          full_name
        )
      ),
      section:sections!inner (
        id,
        name
      )
    `)
    .eq('section.class_id', classId)
    .eq('academic_year_id', academicYearId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (error) {
    console.error('Error fetching class students for results:', error)
    return []
  }

  return (data || []).map((e: any) => ({
    student_id: e.student_id,
    roll_number: e.roll_number,
    student_name: e.student?.user?.full_name || 'Unknown Student',
    section_id: e.section?.id,
    section_name: e.section?.name || 'Unknown Section'
  }))
}

/**
 * Fetches exam results for a specific exam.
 */
export async function getExamResults(
  supabase: SupabaseClient<Database>,
  examId: string
) {
  const { data, error } = await supabase
    .from('exam_results')
    .select('id, student_id, marks_obtained, grade, remarks')
    .eq('exam_id', examId)
    .is('deleted_at', null)

  if (error) {
    console.error('Error fetching exam results:', error)
    return []
  }

  return data || []
}

/**
 * Upserts exam results.
 */
export async function saveExamResults(
  supabase: SupabaseClient<Database>,
  results: {
    exam_id: string
    student_id: string
    marks_obtained: number | null
    grade: string | null
    remarks?: string | null
  }[]
) {
  const { data, error } = await (supabase as any)
    .from('exam_results')
    .upsert(
      results,
      { onConflict: 'exam_id,student_id' }
    )
    .select('id')

  if (error) {
    console.error('Error saving exam results:', error)
    return { success: false, error: error.message, code: error.code }
  }

  return { success: true, count: data?.length || 0 }
}

/**
 * Locks an exam.
 */
export async function lockExam(
  supabase: SupabaseClient<Database>,
  examId: string,
  userId: string
) {
  const { data, error } = await (supabase as any)
    .from('exams')
    .update({
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: userId
    })
    .eq('id', examId)
    .select('id')

  if (error) {
    console.error('Error locking exam:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Unlocks an exam.
 */
export async function unlockExam(
  supabase: SupabaseClient<Database>,
  examId: string
) {
  const { data, error } = await (supabase as any)
    .from('exams')
    .update({
      is_locked: false,
      locked_at: null,
      locked_by: null
    })
    .eq('id', examId)
    .select('id')

  if (error) {
    console.error('Error unlocking exam:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Fetches all details required for a student's report card.
 * Calculates aggregates (core only) and section-wide ranking.
 */
export async function getReportCardData(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  studentId: string,
  academicYearId: string,
  examTermId: string | null
) {
  // 1. Fetch enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      id,
      roll_number,
      student_id,
      student:students!inner (
        id,
        student_code,
        guardian_name,
        date_of_birth,
        institution_id,
        user:users!inner (
          full_name,
          profile_photo_url
        )
      ),
      section:sections!inner (
        id,
        name,
        class:classes!inner (
          id,
          name
        )
      )
    `)
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (enrollError || !enrollment) {
    console.error('Error fetching enrollment:', enrollError)
    return null
  }

  const enrollObj = enrollment as any
  const studentObj = enrollObj.student
  if (studentObj?.institution_id !== institutionId) {
    console.error('Unauthorized: Student belongs to another institution')
    return null
  }

  const sectionObj = enrollObj.section
  const classObj = sectionObj?.class
  const sectionId = sectionObj?.id
  const classId = classObj?.id

  // 2. Fetch core class subjects
  const { data: coreSubjects, error: coreError } = await supabase
    .from('class_subjects')
    .select(`
      id,
      subject_id,
      is_elective,
      subject:subjects!inner (
        id,
        name,
        code
      )
    `)
    .eq('section_id', sectionId)
    .eq('academic_year_id', academicYearId)
    .eq('is_elective', false)
    .is('deleted_at', null)

  if (coreError) {
    console.error('Error fetching core subjects:', coreError)
    return null
  }

  // 3. Fetch student electives
  const { data: electives, error: electivesError } = await supabase
    .from('student_electives')
    .select(`
      class_subject:class_subjects!inner (
        id,
        subject_id,
        is_elective,
        subject:subjects!inner (
          id,
          name,
          code
        )
      )
    `)
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)

  if (electivesError) {
    console.error('Error fetching electives:', electivesError)
    return null
  }

  // Map subjects
  const mappedSubjects: Array<{
    class_subject_id: string
    subject_id: string
    name: string
    code: string
    is_elective: boolean
  }> = []

  if (coreSubjects) {
    for (const cs of (coreSubjects as any[])) {
      const sub = cs.subject
      if (sub) {
        mappedSubjects.push({
          class_subject_id: cs.id,
          subject_id: cs.subject_id,
          name: sub.name,
          code: sub.code || '',
          is_elective: false
        })
      }
    }
  }

  if (electives) {
    for (const se of (electives as any[])) {
      const cs = se.class_subject
      const sub = cs?.subject
      if (sub) {
        mappedSubjects.push({
          class_subject_id: cs.id,
          subject_id: cs.subject_id,
          name: sub.name,
          code: sub.code || '',
          is_elective: true
        })
      }
    }
  }

  // 4. Fetch exams for this class, academic year, and term
  let examsQuery = supabase
    .from('exams')
    .select('id, subject_id, exam_name, exam_date, total_marks, passing_marks')
    .eq('class_id', classId)
    .eq('academic_year_id', academicYearId)
    .is('deleted_at', null)

  if (examTermId === null || examTermId === 'legacy') {
    examsQuery = examsQuery.is('exam_term_id', null)
  } else {
    examsQuery = examsQuery.eq('exam_term_id', examTermId)
  }

  const { data: rawExams, error: examsError } = await examsQuery
  if (examsError) {
    console.error('Error fetching exams:', examsError)
    return null
  }
  const exams = rawExams as any[] | null

  const examIds = (exams || []).map(e => e.id)

  // 5. Fetch student's exam results
  let studentResults: any[] = []
  if (examIds.length > 0) {
    const { data: resData, error: resError } = await supabase
      .from('exam_results')
      .select('id, exam_id, marks_obtained, grade, remarks')
      .eq('student_id', studentId)
      .in('exam_id', examIds)
      .is('deleted_at', null)
    if (resError) {
      console.error('Error fetching exam results:', resError)
    } else {
      studentResults = resData || []
    }
  }

  // 6. Map exams & results to subjects
  const subjectExamsList: Array<{
    subject_id: string
    subject_name: string
    subject_code: string
    is_elective: boolean
    exam_id: string | null
    exam_name: string | null
    exam_date: string | null
    total_marks: number | null
    passing_marks: number | null
    marks_obtained: number | null
    grade: string | null
    remarks: string | null
    status: 'Pass' | 'Fail' | 'Pending' | 'No Exam'
  }> = []

  for (const sub of mappedSubjects) {
    const subExams = (exams || []).filter(e => e.subject_id === sub.subject_id)
    if (subExams.length === 0) {
      subjectExamsList.push({
        subject_id: sub.subject_id,
        subject_name: sub.name,
        subject_code: sub.code,
        is_elective: sub.is_elective,
        exam_id: null,
        exam_name: null,
        exam_date: null,
        total_marks: null,
        passing_marks: null,
        marks_obtained: null,
        grade: null,
        remarks: null,
        status: 'No Exam'
      })
    } else {
      for (const ex of subExams) {
        const result = studentResults.find(r => r.exam_id === ex.id)
        let status: 'Pass' | 'Fail' | 'Pending' = 'Pending'
        if (result && result.marks_obtained !== null) {
          const passMarks = Number(ex.passing_marks ?? 40)
          status = Number(result.marks_obtained) >= passMarks ? 'Pass' : 'Fail'
        }

        subjectExamsList.push({
          subject_id: sub.subject_id,
          subject_name: sub.name,
          subject_code: sub.code,
          is_elective: sub.is_elective,
          exam_id: ex.id,
          exam_name: ex.exam_name,
          exam_date: ex.exam_date,
          total_marks: ex.total_marks ? Number(ex.total_marks) : null,
          passing_marks: ex.passing_marks ? Number(ex.passing_marks) : null,
          marks_obtained: result && result.marks_obtained !== null ? Number(result.marks_obtained) : null,
          grade: result?.grade || null,
          remarks: result?.remarks || null,
          status
        })
      }
    }
  }

  // 7. Calculate core aggregates
  const coreExams = (exams || []).filter(ex => mappedSubjects.some(sub => !sub.is_elective && sub.subject_id === ex.subject_id))
  const coreResults = studentResults.filter(r => coreExams.some(ce => ce.id === r.exam_id))

  const hasMissingCore = coreExams.some(ce => {
    const res = coreResults.find(cr => cr.exam_id === ce.id)
    return !res || res.marks_obtained === null
  })

  let aggregates: {
    total_obtained: number
    total_max: number
    percentage: number
    overall_grade: string
    is_passed: boolean
  } | null = null

  if (coreExams.length > 0 && !hasMissingCore) {
    let totalObtained = 0
    let totalMax = 0
    let totalPassing = 0
    
    for (const ce of coreExams) {
      const res = coreResults.find(cr => cr.exam_id === ce.id)
      totalObtained += Number(res.marks_obtained)
      totalMax += Number(ce.total_marks || 100)
      totalPassing += Number(ce.passing_marks || 40)
    }

    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
    
    // Overall grade calculation
    let overall_grade = 'F'
    if (percentage >= 90) overall_grade = 'A+'
    else if (percentage >= 80) overall_grade = 'A'
    else if (percentage >= 70) overall_grade = 'B+'
    else if (percentage >= 60) overall_grade = 'B'
    else if (percentage >= 50) overall_grade = 'C+'
    else if (percentage >= 40) overall_grade = 'C'
    else if (percentage >= 33) overall_grade = 'D'

    aggregates = {
      total_obtained: totalObtained,
      total_max: totalMax,
      percentage: Number(percentage.toFixed(2)),
      overall_grade,
      is_passed: totalObtained >= totalPassing
    }
  }

  // 8. Fetch section-wide enrollments and marks for ranking
  const { data: rawSectionEnrollments, error: sectionErr } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('section_id', sectionId)
    .eq('academic_year_id', academicYearId)
    .eq('is_active', true)
    .is('deleted_at', null)

  const sectionEnrollments = rawSectionEnrollments as any[] | null

  let rankPosition: number | string = 'Pending'
  const totalStudents = sectionEnrollments?.length || 0

  if (sectionEnrollments && sectionEnrollments.length > 0 && coreExams.length > 0) {
    const studentIds = sectionEnrollments.map(se => se.student_id)
    const { data: rawSectionResults, error: sectionResErr } = await supabase
      .from('exam_results')
      .select('student_id, exam_id, marks_obtained')
      .in('student_id', studentIds)
      .in('exam_id', coreExams.map(ce => ce.id))
      .is('deleted_at', null)

    const sectionResults = rawSectionResults as any[] | null

    if (!sectionResErr && sectionResults) {
      // Calculate scores for all students in section
      const studentScores: Array<{ student_id: string; total: number; is_incomplete: boolean }> = []

      for (const sid of studentIds) {
        let total = 0
        let is_incomplete = false

        for (const ce of coreExams) {
          const res = sectionResults.find(sr => sr.student_id === sid && sr.exam_id === ce.id)
          if (!res || res.marks_obtained === null) {
            is_incomplete = true
            break
          }
          total += Number(res.marks_obtained)
        }

        studentScores.push({ student_id: sid, total, is_incomplete })
      }

      // Check if ANY student has an incomplete result in core subjects
      const anyIncomplete = studentScores.some(s => s.is_incomplete)
      if (!anyIncomplete) {
        // Sort students descending by total
        studentScores.sort((a, b) => b.total - a.total)

        // Calculate standard competition ranking
        let currentRank = 1
        const ranks: Record<string, number> = {}

        for (let i = 0; i < studentScores.length; i++) {
          if (i > 0 && studentScores[i].total < studentScores[i - 1].total) {
            currentRank = i + 1
          }
          ranks[studentScores[i].student_id] = currentRank
        }

        rankPosition = ranks[studentId] || 'Pending'
      }
    }
  }

  return {
    student: {
      id: studentObj.id,
      student_code: studentObj.student_code,
      full_name: (studentObj as any).user?.full_name || 'Unknown Student',
      profile_photo_url: (studentObj as any).user?.profile_photo_url || null,
      guardian_name: studentObj.guardian_name,
      roll_number: (enrollment as any).roll_number,
      class_name: classObj.name,
      section_name: sectionObj.name,
      class_id: classId,
      section_id: sectionId
    },
    subjects: subjectExamsList,
    aggregates,
    rank: {
      position: rankPosition,
      total_students: totalStudents
    }
  }
}

/**
 * Fetches all details required for a class/section summary sheet.
 * Calculates aggregates (core only) for all students and section-wide ranking.
 */
export async function getSectionSummaryData(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  examTermId: string | null,
  sectionId: string
) {
  // 1. Fetch section and class details
  const { data: sectionData, error: sectionErr } = await supabase
    .from('sections')
    .select(`
      id,
      name,
      class:classes!inner (
        id,
        name,
        institution_id
      )
    `)
    .eq('id', sectionId)
    .single()

  const secData = sectionData as any
  if (sectionErr || !secData || secData.class?.institution_id !== institutionId) {
    console.error('Section not found or access denied:', sectionErr)
    return null
  }

  const sectionName = secData.name
  const classObj = secData.class
  const className = classObj?.name || ''
  const classId = classObj?.id

  // 2. Fetch academic year label
  const { data: yearData } = await supabase
    .from('academic_years')
    .select('label')
    .eq('id', academicYearId)
    .single()
  const academicYearLabel = (yearData as any)?.label || 'Unknown Session'

  // 3. Fetch term name
  let termName = 'Ungrouped (legacy)'
  if (examTermId) {
    const { data: termData } = await supabase
      .from('exam_terms')
      .select('name')
      .eq('id', examTermId)
      .single()
    termName = (termData as any)?.name || termName
  }

  // 4. Fetch core class subjects
  const { data: coreSubjects, error: coreError } = await supabase
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
    .eq('academic_year_id', academicYearId)
    .eq('is_elective', false)
    .is('deleted_at', null)

  if (coreError) {
    console.error('Error fetching core subjects:', coreError)
    return null
  }
  const coreSubjectIds = (coreSubjects || []).map((cs: any) => cs.subject_id)

  // 5. Fetch core exams for this class, academic year, and term
  let examsQuery = supabase
    .from('exams')
    .select('id, subject_id, total_marks, passing_marks')
    .eq('class_id', classId)
    .eq('academic_year_id', academicYearId)
    .in('subject_id', coreSubjectIds)
    .is('deleted_at', null)

  if (examTermId === null) {
    examsQuery = examsQuery.is('exam_term_id', null)
  } else {
    examsQuery = examsQuery.eq('exam_term_id', examTermId)
  }

  const { data: rawExams, error: examsError } = await examsQuery
  if (examsError) {
    console.error('Error fetching exams:', examsError)
    return null
  }
  const coreExams = (rawExams || []) as any[]

  // 6. Fetch all active student enrollments for the section
  const { data: rawEnrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      roll_number,
      student_id,
      student:students!inner (
        id,
        student_code,
        user:users!inner (
          full_name
        )
      )
    `)
    .eq('section_id', sectionId)
    .eq('academic_year_id', academicYearId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('roll_number', { ascending: true })

  if (enrollError) {
    console.error('Error fetching enrollments:', enrollError)
    return null
  }
  const enrollments = (rawEnrollments || []) as any[]

  // 7. Fetch exam results for all students in the section for the core exams
  const studentIds = enrollments.map(e => e.student_id)
  const coreExamIds = coreExams.map(ex => ex.id)
  let sectionResults: any[] = []

  if (studentIds.length > 0 && coreExamIds.length > 0) {
    const { data: rawResults, error: resError } = await supabase
      .from('exam_results')
      .select('student_id, exam_id, marks_obtained')
      .in('student_id', studentIds)
      .in('exam_id', coreExamIds)
      .is('deleted_at', null)
    if (resError) {
      console.error('Error fetching results:', resError)
    } else {
      sectionResults = rawResults || []
    }
  }

  // 8. Calculate summaries for each student
  const studentSummaries = enrollments.map((enroll: any) => {
    const sId = enroll.student_id
    const sObj = enroll.student
    const fullName = sObj?.user?.full_name || 'Unknown Student'
    const studentCode = sObj?.student_code || ''

    let totalObtained = 0
    let totalMax = 0
    let totalPassing = 0
    let is_incomplete = false

    if (coreExams.length === 0) {
      is_incomplete = true
    } else {
      for (const ce of coreExams) {
        const res = sectionResults.find(r => r.student_id === sId && r.exam_id === ce.id)
        if (!res || res.marks_obtained === null) {
          is_incomplete = true
          break
        }
        totalObtained += Number(res.marks_obtained)
        totalMax += Number(ce.total_marks || 100)
        totalPassing += Number(ce.passing_marks || 40)
      }
    }

    let percentage = null
    let overall_grade = null
    let is_passed = null

    if (!is_incomplete) {
      percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0
      
      // Calculate grade
      overall_grade = 'F'
      if (percentage >= 90) overall_grade = 'A+'
      else if (percentage >= 80) overall_grade = 'A'
      else if (percentage >= 70) overall_grade = 'B+'
      else if (percentage >= 60) overall_grade = 'B'
      else if (percentage >= 50) overall_grade = 'C+'
      else if (percentage >= 40) overall_grade = 'C'
      else if (percentage >= 33) overall_grade = 'D'

      is_passed = totalObtained >= totalPassing
    }

    return {
      student_id: sId,
      roll_number: enroll.roll_number,
      full_name: fullName,
      student_code: studentCode,
      total_obtained: is_incomplete ? null : totalObtained,
      total_max: is_incomplete ? null : totalMax,
      percentage,
      overall_grade,
      is_passed,
      is_incomplete,
      rank: 'Pending' as number | string
    }
  })

  // 9. Determine section ranks
  const isRankFinalized = studentSummaries.length > 0 && !studentSummaries.some(s => s.is_incomplete)

  if (isRankFinalized) {
    // Sort students descending by total_obtained
    const sorted = [...studentSummaries].sort((a, b) => (b.total_obtained || 0) - (a.total_obtained || 0))
    let currentRank = 1
    const ranks: Record<string, number> = {}

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && (sorted[i].total_obtained || 0) < (sorted[i - 1].total_obtained || 0)) {
        currentRank = i + 1
      }
      ranks[sorted[i].student_id] = currentRank
    }

    for (const s of studentSummaries) {
      s.rank = ranks[s.student_id] || 'Pending'
    }
  }

  return {
    sectionName,
    className,
    academicYearLabel,
    termName,
    examsCount: coreExams.length,
    isRankFinalized,
    students: studentSummaries
  }
}

/**
 * Fetches lock status and info for all exams of a class.
 */
export async function getExamsLockDetails(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  classId: string,
  examTermId: string | null
) {
  let query = (supabase as any)
    .from('exams')
    .select(`
      id,
      exam_name,
      exam_date,
      is_locked,
      locked_at,
      locked_by,
      locked_by_user:users!exams_locked_by_fkey (
        full_name
      ),
      subject:subjects!inner (
        id,
        name,
        code
      )
    `)
    .eq('institution_id', institutionId)
    .eq('academic_year_id', academicYearId)
    .eq('class_id', classId)
    .is('deleted_at', null)

  if (examTermId && examTermId !== 'all') {
    if (examTermId === 'legacy') {
      query = query.is('exam_term_id', null)
    } else {
      query = query.eq('exam_term_id', examTermId)
    }
  }

  const { data: exams, error: examsError } = await query
  if (examsError) {
    console.error('Error fetching exams for lock management:', examsError)
    return []
  }

  if (!exams || exams.length === 0) return []

  const examIds = exams.map((e: any) => e.id)

  // Fetch count of entered results for each exam
  const { data: results, error: resultsError } = await supabase
    .from('exam_results')
    .select('exam_id')
    .in('exam_id', examIds)
    .is('deleted_at', null)

  if (resultsError) {
    console.error('Error fetching exam results for lock management:', resultsError)
  }

  const resultsByExam: Record<string, number> = {}
  for (const r of (results || []) as any[]) {
    resultsByExam[r.exam_id] = (resultsByExam[r.exam_id] || 0) + 1
  }

  // Fetch student enrollment count for this class and academic year
  const enrollments = await getClassStudentsForResults(supabase, classId, academicYearId)
  const enrolledCount = enrollments.length

  return exams.map((exam: any) => ({
    id: exam.id,
    exam_name: exam.exam_name,
    exam_date: exam.exam_date,
    is_locked: exam.is_locked,
    locked_at: exam.locked_at,
    locked_by: exam.locked_by,
    locked_by_name: exam.locked_by_user?.full_name || null,
    subject_name: exam.subject?.name || 'Unknown Subject',
    subject_code: exam.subject?.code || '',
    entered_results_count: resultsByExam[exam.id] || 0,
    enrolled_students_count: enrolledCount
  }))
}

/**
 * Bulk locks multiple exams.
 */
export async function bulkLockExams(
  supabase: SupabaseClient<Database>,
  examIds: string[],
  userId: string
) {
  const { data, error } = await (supabase as any)
    .from('exams')
    .update({
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: userId
    })
    .in('id', examIds)
    .select('id')

  if (error) {
    console.error('Error bulk locking exams:', error)
    return { success: false, error: error.message }
  }

  return { success: true, count: data?.length || 0 }
}

/**
 * Bulk unlocks multiple exams.
 */
export async function bulkUnlockExams(
  supabase: SupabaseClient<Database>,
  examIds: string[]
) {
  const { data, error } = await (supabase as any)
    .from('exams')
    .update({
      is_locked: false,
      locked_at: null,
      locked_by: null
    })
    .in('id', examIds)
    .select('id')

  if (error) {
    console.error('Error bulk unlocking exams:', error)
    return { success: false, error: error.message }
  }

  return { success: true, count: data?.length || 0 }
}


