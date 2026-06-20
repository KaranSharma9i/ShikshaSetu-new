'use server'

import { createClient } from '@/utils/supabase/server'
import {
  getExamTermsByClassAndYear,
  createExamTerm,
  assignExamsToTerm,
  getSubjectsWithExams,
  getExamsForSelection,
  getClassStudentsForResults,
  getExamResults,
  saveExamResults,
  lockExam,
  unlockExam,
  getReportCardData,
  getSectionSummaryData,
  getExamsLockDetails,
  bulkLockExams,
  bulkUnlockExams
} from '@/lib/repositories/results'
import { getSectionsByClassAndYear } from '@/lib/repositories/academic'
import { getEnrollmentsForSectionMove } from '@/lib/repositories/student'
import { revalidatePath } from 'next/cache'

/**
 * Server action to get exam terms for a specific academic year and class
 */
export async function getExamTermsAction(academicYearId: string, classId: string) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const institutionId = userData.institution_id

    // 3. Fetch exam terms
    const terms = await getExamTermsByClassAndYear(supabase, institutionId, academicYearId, classId)
    return { success: true, data: terms }
  } catch (error: any) {
    console.error('Error in getExamTermsAction:', error)
    return { success: false, error: error.message || 'Failed to fetch exam terms.' }
  }
}

/**
 * Server action to create a new exam term on-the-fly
 */
export async function createExamTermAction(params: {
  academicYearId: string
  classId: string
  name: string
}) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only admins can manage exam terms.' }
    }

    const institutionId = userData.institution_id
    const termName = (params.name || '').trim()

    if (!termName) {
      return { success: false, error: 'Term name cannot be empty.' }
    }

    // 3. Create term
    const res = await createExamTerm(supabase, {
      institution_id: institutionId,
      academic_year_id: params.academicYearId,
      class_id: params.classId,
      name: termName,
    })

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to create exam term.' }
    }

    return { success: true, data: res.data }
  } catch (error: any) {
    console.error('Error in createExamTermAction:', error)
    return { success: false, error: error.message || 'Failed to create exam term.' }
  }
}

/**
 * Server action to assign legacy exams to an exam term
 */
export async function assignExamsToTermAction(params: {
  academicYearId: string
  classId: string
  examName: string
  examTermId: string
}) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only admins can assign exams.' }
    }

    const institutionId = userData.institution_id

    // 3. Assign exams
    const res = await assignExamsToTerm(supabase, {
      institutionId,
      academicYearId: params.academicYearId,
      classId: params.classId,
      examName: params.examName,
      examTermId: params.examTermId,
    })

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to assign exams.' }
    }

    // 4. Revalidate pages
    revalidatePath('/dashboard/results')
    revalidatePath('/dashboard/results/legacy-assign')

    return { success: true, count: res.count }
  } catch (error: any) {
    console.error('Error in assignExamsToTermAction:', error)
    return { success: false, error: error.message || 'Failed to assign exams.' }
  }
}

/**
 * Server action to get subjects that have exams for a class and term
 */
export async function getSubjectsWithExamsAction(
  academicYearId: string,
  classId: string,
  examTermId: string | null
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const subjects = await getSubjectsWithExams(
      supabase,
      userData.institution_id,
      academicYearId,
      classId,
      examTermId
    )

    return { success: true, data: subjects }
  } catch (error: any) {
    console.error('Error in getSubjectsWithExamsAction:', error)
    return { success: false, error: error.message || 'Failed to fetch subjects.' }
  }
}

/**
 * Server action to get exams for a specific subject, class, and term
 */
export async function getExamsForSelectionAction(
  academicYearId: string,
  classId: string,
  examTermId: string | null,
  subjectId: string
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const exams = await getExamsForSelection(
      supabase,
      userData.institution_id,
      academicYearId,
      classId,
      examTermId,
      subjectId
    )

    return { success: true, data: exams }
  } catch (error: any) {
    console.error('Error in getExamsForSelectionAction:', error)
    return { success: false, error: error.message || 'Failed to fetch exams.' }
  }
}

/**
 * Server action to fetch student roster, existing results, and exam metadata
 */
export async function getMarksEntryDataAction(
  examId: string,
  classId: string,
  academicYearId: string
) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const institutionId = userData.institution_id

    // 3. Fetch exam metadata and check institution isolation
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select(`
        id,
        institution_id,
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
      .eq('id', examId)
      .single()

    if (examError || !examData) {
      return { success: false, error: 'Exam record not found.' }
    }

    if (examData.institution_id !== institutionId) {
      return { success: false, error: 'Unauthorized: Exam belongs to another institution.' }
    }

    const formattedExam = {
      id: examData.id,
      exam_name: examData.exam_name,
      exam_date: examData.exam_date,
      total_marks: examData.total_marks,
      passing_marks: examData.passing_marks,
      is_locked: examData.is_locked,
      locked_at: examData.locked_at,
      locked_by: examData.locked_by,
      locked_by_name: (examData.locked_by_user as any)?.full_name || null
    }

    // 4. Fetch class student roster
    const students = await getClassStudentsForResults(supabase, classId, academicYearId)

    // 5. Fetch existing results
    const results = await getExamResults(supabase, examId)

    return {
      success: true,
      data: {
        exam: formattedExam,
        students,
        results
      }
    }
  } catch (error: any) {
    console.error('Error in getMarksEntryDataAction:', error)
    return { success: false, error: error.message || 'Failed to fetch marks entry data.' }
  }
}

/**
 * Helper to compute grade based on marks
 */
function computeGrade(marksObtained: number, totalMarks: number): string {
  if (!totalMarks || totalMarks <= 0) return 'F'
  const percentage = (marksObtained / totalMarks) * 100
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B+'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C+'
  if (percentage >= 40) return 'C'
  if (percentage >= 33) return 'D'
  return 'F'
}

/**
 * Server action to save marks
 */
export async function saveExamResultsAction(
  examId: string,
  results: Array<{
    studentId: string
    marksObtained: number | null
    remarks?: string | null
  }>
) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const institutionId = userData.institution_id

    // 3. Fetch exam to verify ownership, get total_marks, and verify lock state early
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('institution_id, is_locked, total_marks')
      .eq('id', examId)
      .single()

    if (examError || !examData) {
      return { success: false, error: 'Exam record not found.' }
    }

    if (examData.institution_id !== institutionId) {
      return { success: false, error: 'Unauthorized: Exam belongs to another institution.' }
    }

    if (examData.is_locked) {
      return { success: false, error: 'This exam is locked. Marks cannot be modified.' }
    }

    const totalMarks = Number(examData.total_marks || 100)

    // 4. Format payload for upsert, computing grade client/server side
    const payload = results.map(r => {
      const marksObtained = r.marksObtained !== null && r.marksObtained !== undefined ? Number(r.marksObtained) : null
      const grade = marksObtained !== null ? computeGrade(marksObtained, totalMarks) : null
      
      return {
        exam_id: examId,
        student_id: r.studentId,
        marks_obtained: marksObtained,
        grade: grade,
        remarks: r.remarks || null
      }
    })

    // 5. Save results using the repository helper
    const saveRes = await saveExamResults(supabase, payload)

    if (!saveRes.success) {
      // Catch locked exam error from trigger exception
      if (saveRes.error && saveRes.error.includes('is locked')) {
        return { success: false, error: 'This exam is locked. Marks cannot be modified.' }
      }
      return { success: false, error: saveRes.error || 'Failed to save marks.' }
    }

    revalidatePath('/dashboard/results/marks-entry')
    return { success: true, count: saveRes.count }
  } catch (error: any) {
    console.error('Error in saveExamResultsAction:', error)
    if (error.message && error.message.includes('is locked')) {
      return { success: false, error: 'This exam is locked. Marks cannot be modified.' }
    }
    return { success: false, error: error.message || 'Failed to save marks.' }
  }
}

/**
 * Server action to lock an exam
 */
export async function lockExamAction(examId: string) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const institutionId = userData.institution_id

    // 3. Fetch exam to verify ownership
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('institution_id')
      .eq('id', examId)
      .single()

    if (examError || !examData) {
      return { success: false, error: 'Exam record not found.' }
    }

    if (examData.institution_id !== institutionId) {
      return { success: false, error: 'Unauthorized: Exam belongs to another institution.' }
    }

    // 4. Lock exam
    const res = await lockExam(supabase, examId, user.id)
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to lock exam.' }
    }

    revalidatePath('/dashboard/results/marks-entry')
    return { success: true }
  } catch (error: any) {
    console.error('Error in lockExamAction:', error)
    return { success: false, error: error.message || 'Failed to lock exam.' }
  }
}

/**
 * Server action to unlock an exam
 */
export async function unlockExamAction(examId: string) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const institutionId = userData.institution_id

    // 3. Fetch exam to verify ownership
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('institution_id')
      .eq('id', examId)
      .single()

    if (examError || !examData) {
      return { success: false, error: 'Exam record not found.' }
    }

    if (examData.institution_id !== institutionId) {
      return { success: false, error: 'Unauthorized: Exam belongs to another institution.' }
    }

    // 4. Unlock exam
    const res = await unlockExam(supabase, examId)
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to unlock exam.' }
    }

    revalidatePath('/dashboard/results/marks-entry')
    return { success: true }
  } catch (error: any) {
    console.error('Error in unlockExamAction:', error)
    return { success: false, error: error.message || 'Failed to unlock exam.' }
  }
}

/**
 * Server action to get sections for a specific class and year
 */
export async function getSectionsAction(classId: string, academicYearId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const sections = await getSectionsByClassAndYear(supabase, classId, academicYearId)
    return { success: true, data: sections }
  } catch (error: any) {
    console.error('Error in getSectionsAction:', error)
    return { success: false, error: error.message || 'Failed to fetch sections.' }
  }
}

/**
 * Server action to get students for a specific section and year
 */
export async function getStudentsAction(sectionId: string, academicYearId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const students = await getEnrollmentsForSectionMove(supabase, userData.institution_id, academicYearId, sectionId)
    return { success: true, data: students }
  } catch (error: any) {
    console.error('Error in getStudentsAction:', error)
    return { success: false, error: error.message || 'Failed to fetch students.' }
  }
}

/**
 * Server action to get report card data for a student
 */
export async function getReportCardDataAction(
  studentId: string,
  academicYearId: string,
  examTermId: string | null
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const termParam = examTermId === 'all' || examTermId === 'legacy' ? null : examTermId

    const reportCard = await getReportCardData(
      supabase,
      userData.institution_id,
      studentId,
      academicYearId,
      termParam
    )

    if (!reportCard) {
      return { success: false, error: 'Failed to generate report card data.' }
    }

    return { success: true, data: reportCard }
  } catch (error: any) {
    console.error('Error in getReportCardDataAction:', error)
    return { success: false, error: error.message || 'Failed to fetch report card data.' }
  }
}

/**
 * Server action to get class summary data for a section
 */
export async function getSectionSummaryAction(
  academicYearId: string,
  examTermId: string | null,
  sectionId: string
) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const termParam = examTermId === 'all' || examTermId === 'legacy' ? null : examTermId

    const summary = await getSectionSummaryData(
      supabase,
      userData.institution_id,
      academicYearId,
      termParam,
      sectionId
    )

    if (!summary) {
      return { success: false, error: 'Failed to generate summary data.' }
    }

    return { success: true, data: summary }
  } catch (error: any) {
    console.error('Error in getSectionSummaryAction:', error)
    return { success: false, error: error.message || 'Failed to fetch section summary data.' }
  }
}

/**
 * Server action to fetch exam lock details for bulk locking dashboard
 */
export async function getExamsLockDetailsAction(
  academicYearId: string,
  classId: string,
  examTermId: string | null
) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    const institutionId = userData.institution_id
    const termParam = examTermId === 'all' || examTermId === '' ? 'all' : examTermId === 'legacy' ? 'legacy' : examTermId

    const data = await getExamsLockDetails(
      supabase,
      institutionId,
      academicYearId,
      classId,
      termParam
    )

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getExamsLockDetailsAction:', error)
    return { success: false, error: error.message || 'Failed to fetch exam lock details.' }
  }
}

/**
 * Server action to bulk lock exams
 */
export async function bulkLockExamsAction(examIds: string[]) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only admins can manage exam locks.' }
    }

    const institutionId = userData.institution_id

    // 3. Verify that all examIds belong to the same institution
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('institution_id')
      .in('id', examIds)

    if (examError || !examData) {
      return { success: false, error: 'Failed to verify exam records.' }
    }

    const unauthorizedExams = examData.filter(e => e.institution_id !== institutionId)
    if (unauthorizedExams.length > 0) {
      return { success: false, error: 'Unauthorized: Some exams belong to another institution.' }
    }

    // 4. Perform bulk lock
    const res = await bulkLockExams(supabase, examIds, user.id)
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to lock exams.' }
    }

    revalidatePath('/dashboard/results/locks')
    return { success: true, count: res.count }
  } catch (error: any) {
    console.error('Error in bulkLockExamsAction:', error)
    return { success: false, error: error.message || 'Failed to lock exams.' }
  }
}

/**
 * Server action to bulk unlock exams
 */
export async function bulkUnlockExamsAction(examIds: string[]) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: No active session.' }
    }

    // 2. Retrieve user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return { success: false, error: 'Unauthorized: Invalid user profile.' }
    }

    if (userData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized: Only admins can manage exam locks.' }
    }

    const institutionId = userData.institution_id

    // 3. Verify that all examIds belong to the same institution
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('institution_id')
      .in('id', examIds)

    if (examError || !examData) {
      return { success: false, error: 'Failed to verify exam records.' }
    }

    const unauthorizedExams = examData.filter(e => e.institution_id !== institutionId)
    if (unauthorizedExams.length > 0) {
      return { success: false, error: 'Unauthorized: Some exams belong to another institution.' }
    }

    // 4. Perform bulk unlock
    const res = await bulkUnlockExams(supabase, examIds)
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to unlock exams.' }
    }

    revalidatePath('/dashboard/results/locks')
    return { success: true, count: res.count }
  } catch (error: any) {
    console.error('Error in bulkUnlockExamsAction:', error)
    return { success: false, error: error.message || 'Failed to unlock exams.' }
  }
}

