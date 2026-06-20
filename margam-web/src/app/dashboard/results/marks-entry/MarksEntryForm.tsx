'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getExamTermsAction,
  getSubjectsWithExamsAction,
  getExamsForSelectionAction,
  getMarksEntryDataAction,
  saveExamResultsAction,
  lockExamAction,
  unlockExamAction
} from '../actions'

interface AcademicYear {
  id: string
  label: string
  is_current: boolean
}

interface ClassItem {
  id: string
  name: string
}

interface ExamTerm {
  id: string
  name: string
  term_type: string | null
}

interface SubjectItem {
  id: string
  name: string
  code: string
}

interface ExamItem {
  id: string
  exam_name: string
  exam_date: string
  total_marks: number
  passing_marks: number
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
  locked_by_name: string | null
}

interface StudentRow {
  student_id: string
  roll_number: string
  student_name: string
  section_id: string
  section_name: string
}

interface ResultRow {
  id: string
  student_id: string
  marks_obtained: number | null
  grade: string | null
  remarks: string | null
}

interface MarksEntryFormProps {
  initialYears: AcademicYear[]
  initialClasses: ClassItem[]
}

// Client-side grade helper
function computeGrade(marksObtained: number | null, totalMarks: number): string {
  if (marksObtained === null || marksObtained === undefined || isNaN(marksObtained)) return '—'
  if (totalMarks <= 0) return 'F'
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

export default function MarksEntryForm({ initialYears, initialClasses }: MarksEntryFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Selectors State
  const [selectedYearId, setSelectedYearId] = useState<string>(
    initialYears.find(y => y.is_current)?.id || (initialYears[0]?.id || '')
  )
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClasses[0]?.id || '')
  
  const [terms, setTerms] = useState<ExamTerm[]>([])
  const [selectedTermId, setSelectedTermId] = useState<string>('all') // 'all' means all terms or 'legacy' for null
  const [loadingTerms, setLoadingTerms] = useState(false)

  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  const [exams, setExams] = useState<ExamItem[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string>('')
  const [loadingExams, setLoadingExams] = useState(false)

  // Marks Grid State
  const [examDetail, setExamDetail] = useState<ExamItem | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [marks, setMarks] = useState<Record<string, { marks_obtained: string; remarks: string }>>({}) // student_id -> details
  const [loadingGrid, setLoadingGrid] = useState(false)

  // Search & Filter State
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'roll' | 'section'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Notification Banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 1. Fetch Terms when Year or Class changes
  useEffect(() => {
    if (!selectedYearId || !selectedClassId) {
      setTerms([])
      setSelectedTermId('all')
      return
    }

    async function loadTerms() {
      setLoadingTerms(true)
      setErrorMsg(null)
      const res = await getExamTermsAction(selectedYearId, selectedClassId)
      setLoadingTerms(false)
      if (res.success && res.data) {
        setTerms(res.data as ExamTerm[])
      } else {
        setErrorMsg(res.error || 'Failed to load exam terms.')
      }
    }

    loadTerms()
    // Reset subordinate dropdowns
    setSubjects([])
    setSelectedSubjectId('')
    setExams([])
    setSelectedExamId('')
    setExamDetail(null)
    setStudents([])
    setMarks({})
  }, [selectedYearId, selectedClassId])

  // 2. Fetch Subjects when Term changes (or Year/Class changes)
  useEffect(() => {
    if (!selectedYearId || !selectedClassId) {
      setSubjects([])
      setSelectedSubjectId('')
      return
    }

    async function loadSubjects() {
      setLoadingSubjects(true)
      setErrorMsg(null)
      const termParam = selectedTermId === 'all' ? null : selectedTermId === 'legacy' ? null : selectedTermId
      const res = await getSubjectsWithExamsAction(selectedYearId, selectedClassId, termParam)
      setLoadingSubjects(false)
      if (res.success && res.data) {
        const subs = res.data as SubjectItem[]
        setSubjects(subs)
        if (subs.length > 0) {
          setSelectedSubjectId(subs[0].id)
        } else {
          setSelectedSubjectId('')
        }
      } else {
        setErrorMsg(res.error || 'Failed to load subjects with exams.')
      }
    }

    loadSubjects()
    // Reset subordinate dropdowns
    setExams([])
    setSelectedExamId('')
    setExamDetail(null)
    setStudents([])
    setMarks({})
  }, [selectedYearId, selectedClassId, selectedTermId])

  // 3. Fetch Exams when Subject changes
  useEffect(() => {
    if (!selectedYearId || !selectedClassId || !selectedSubjectId) {
      setExams([])
      setSelectedExamId('')
      return
    }

    async function loadExams() {
      setLoadingExams(true)
      setErrorMsg(null)
      const termParam = selectedTermId === 'all' ? null : selectedTermId === 'legacy' ? null : selectedTermId
      const res = await getExamsForSelectionAction(
        selectedYearId,
        selectedClassId,
        termParam,
        selectedSubjectId
      )
      setLoadingExams(false)
      if (res.success && res.data) {
        const examList = res.data as ExamItem[]
        setExams(examList)
        if (examList.length > 0) {
          setSelectedExamId(examList[0].id)
        } else {
          setSelectedExamId('')
        }
      } else {
        setErrorMsg(res.error || 'Failed to load exams.')
      }
    }

    loadExams()
    // Reset subordinate grid
    setExamDetail(null)
    setStudents([])
    setMarks({})
  }, [selectedYearId, selectedClassId, selectedTermId, selectedSubjectId])

  // 4. Fetch Grid Data when Exam changes
  useEffect(() => {
    if (!selectedExamId) {
      setExamDetail(null)
      setStudents([])
      setMarks({})
      return
    }

    async function loadGridData() {
      setLoadingGrid(true)
      setErrorMsg(null)
      const res = await getMarksEntryDataAction(selectedExamId, selectedClassId, selectedYearId)
      setLoadingGrid(false)
      if (res.success && res.data) {
        const { exam, students: studentList, results } = res.data as {
          exam: ExamItem
          students: StudentRow[]
          results: ResultRow[]
        }

        setExamDetail(exam)
        setStudents(studentList)

        // Initialize marks map from results
        const marksMap: Record<string, { marks_obtained: string; remarks: string }> = {}
        studentList.forEach(s => {
          const match = results.find(r => r.student_id === s.student_id)
          marksMap[s.student_id] = {
            marks_obtained: match?.marks_obtained !== null && match?.marks_obtained !== undefined ? String(match.marks_obtained) : '',
            remarks: match?.remarks || ''
          }
        })
        setMarks(marksMap)
      } else {
        setErrorMsg(res.error || 'Failed to load student list or existing results.')
      }
    }

    loadGridData()
  }, [selectedExamId, selectedClassId, selectedYearId])

  // Get unique list of sections for filter dropdown
  const sections = Array.from(new Set(students.map(s => s.section_name))).sort()

  // Handle Marks Input Change
  const handleMarkChange = (studentId: string, value: string) => {
    if (examDetail?.is_locked) return

    // Allow only numeric input with decimals, or empty string
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return
    }

    // Validate against max total marks if it is a completed number
    const num = parseFloat(value)
    if (!isNaN(num) && examDetail && num > examDetail.total_marks) {
      return // Don't allow typing values above max marks
    }

    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks_obtained: value
      }
    }))
  };

  // Handle Remarks Input Change
  const handleRemarkChange = (studentId: string, value: string) => {
    if (examDetail?.is_locked) return
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: value
      }
    }))
  };

  // Sorting logic
  const handleSort = (field: 'name' | 'roll' | 'section') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // Filter & Sort student list on client side
  const filteredStudents = students
    .filter(s => {
      const matchSection = sectionFilter === 'all' || s.section_name === sectionFilter
      const matchSearch =
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
      return matchSection && matchSearch
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.student_name.localeCompare(b.student_name)
      } else if (sortBy === 'roll') {
        comparison = a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true })
      } else if (sortBy === 'section') {
        comparison = a.section_name.localeCompare(b.section_name)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Save Action
  const handleSave = async (silent = false) => {
    if (!examDetail || examDetail.is_locked) return
    setSaving(true)
    setErrorMsg(null)
    if (!silent) setSuccessMsg(null)

    const payload = Object.entries(marks).map(([studentId, data]) => ({
      studentId,
      marksObtained: data.marks_obtained === '' ? null : parseFloat(data.marks_obtained),
      remarks: data.remarks
    }))

    const res = await saveExamResultsAction(examDetail.id, payload)
    setSaving(false)

    if (res.success) {
      if (!silent) {
        setSuccessMsg(`Marks successfully saved for ${res.count} students.`)
        // Auto-scroll to top to see success message
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setTimeout(() => setSuccessMsg(null), 5000)
      }
      return true
    } else {
      setErrorMsg(res.error || 'Failed to save marks.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return false
    }
  }

  // Lock Action
  const handleLock = async () => {
    if (!examDetail || examDetail.is_locked) return
    const confirmLock = window.confirm(
      'Are you sure you want to FINALIZED and LOCK this exam? Once locked, teachers and administrators will not be able to edit any marks for this exam. You can unlock it later if needed.'
    )
    if (!confirmLock) return

    // Save current changes first
    const saveSuccess = await handleSave(true)
    if (!saveSuccess) return

    startTransition(async () => {
      setErrorMsg(null)
      setSuccessMsg(null)
      const res = await lockExamAction(examDetail.id)
      if (res.success) {
        setSuccessMsg('Exam finalized and locked successfully.')
        setExamDetail(prev => prev ? { ...prev, is_locked: true, locked_by_name: 'You' } : null)
        setTimeout(() => setSuccessMsg(null), 5000)
      } else {
        setErrorMsg(res.error || 'Failed to lock exam.')
      }
    })
  }

  // Unlock Action
  const handleUnlock = async () => {
    if (!examDetail || !examDetail.is_locked) return
    const confirmUnlock = window.confirm(
      'Are you sure you want to UNLOCK this exam? This will allow modifications to marks again.'
    )
    if (!confirmUnlock) return

    startTransition(async () => {
      setErrorMsg(null)
      setSuccessMsg(null)
      const res = await unlockExamAction(examDetail.id)
      if (res.success) {
        setSuccessMsg('Exam unlocked successfully. You can now edit marks.')
        setExamDetail(prev => prev ? { ...prev, is_locked: false, locked_by_name: null } : null)
        setTimeout(() => setSuccessMsg(null), 5000)
      } else {
        setErrorMsg(res.error || 'Failed to unlock exam.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/results"
          className="inline-flex items-center text-xs font-bold text-steel-gray hover:text-primary transition-colors gap-1.5"
        >
          &larr; Back to Results Dashboard
        </Link>
      </div>

      {/* Message Banners */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs font-bold text-emerald-600 flex items-center gap-2 animate-fadeIn shadow-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs font-bold text-red-600 flex items-center gap-2 animate-fadeIn shadow-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Lock Banner */}
      {examDetail?.is_locked && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/15 text-amber-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-charcoal font-heading">Exam finalized & locked</h4>
              <p className="text-xs text-steel-gray font-caption mt-0.5">
                Locked by <strong className="text-charcoal">{examDetail.locked_by_name || 'Admin'}</strong> on{' '}
                {examDetail.locked_at ? new Date(examDetail.locked_at).toLocaleString() : 'N/A'}. Marks are in read-only mode.
              </p>
            </div>
          </div>
          <button
            onClick={handleUnlock}
            disabled={isPending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Unlock Exam
          </button>
        </div>
      )}

      {/* Selectors Panel */}
      <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-charcoal font-heading mb-4">Select Exam</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          
          {/* Year */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-steel-gray uppercase font-caption">Academic Year</label>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="w-full bg-cream/5 border border-light-gray/60 hover:border-primary/20 rounded-xl px-3.5 py-2.5 text-xs text-charcoal font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            >
              {initialYears.map(y => (
                <option key={y.id} value={y.id}>
                  {y.label} {y.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-steel-gray uppercase font-caption">Class</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full bg-cream/5 border border-light-gray/60 hover:border-primary/20 rounded-xl px-3.5 py-2.5 text-xs text-charcoal font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            >
              {initialClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Term */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-steel-gray uppercase font-caption flex items-center gap-1">
              Term {loadingTerms && <span className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
            </label>
            <select
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value)}
              className="w-full bg-cream/5 border border-light-gray/60 hover:border-primary/20 rounded-xl px-3.5 py-2.5 text-xs text-charcoal font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            >
              <option value="all">All Terms</option>
              <option value="legacy">Ungrouped (legacy)</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-steel-gray uppercase font-caption flex items-center gap-1">
              Subject {loadingSubjects && <span className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              disabled={subjects.length === 0}
              className="w-full bg-cream/5 border border-light-gray/60 hover:border-primary/20 rounded-xl px-3.5 py-2.5 text-xs text-charcoal font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subjects.length === 0 ? (
                <option value="">No Subjects with Exams</option>
              ) : (
                subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Exam Row */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-steel-gray uppercase font-caption flex items-center gap-1">
              Exam Row {loadingExams && <span className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
            </label>
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              disabled={exams.length === 0}
              className="w-full bg-cream/5 border border-light-gray/60 hover:border-primary/20 rounded-xl px-3.5 py-2.5 text-xs text-charcoal font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exams.length === 0 ? (
                <option value="">No Exams Found</option>
              ) : (
                exams.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.exam_name} ({ex.exam_date})
                  </option>
                ))
              )}
            </select>
          </div>

        </div>
      </div>

      {/* Grid Section */}
      {selectedExamId ? (
        loadingGrid ? (
          <div className="bg-white border border-light-gray/60 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs text-steel-gray font-caption">Loading student roster and results...</p>
          </div>
        ) : examDetail ? (
          <div className="space-y-6">
            
            {/* Exam Metadata Summary Card */}
            <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 shrink-0 md:grow max-w-4xl">
                <div>
                  <h5 className="text-[10px] font-bold text-steel-gray uppercase font-caption">Exam Name</h5>
                  <p className="text-sm font-bold text-charcoal font-heading mt-0.5">{examDetail.exam_name}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-steel-gray uppercase font-caption">Date</h5>
                  <p className="text-sm font-bold text-charcoal font-heading mt-0.5">{examDetail.exam_date}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-steel-gray uppercase font-caption">Max Marks</h5>
                  <p className="text-sm font-bold text-charcoal font-heading mt-0.5">{examDetail.total_marks}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-steel-gray uppercase font-caption">Passing Marks</h5>
                  <p className="text-sm font-bold text-charcoal font-heading mt-0.5">{examDetail.passing_marks}</p>
                </div>
              </div>

              {/* Action buttons (only if unlocked) */}
              {!examDetail.is_locked && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {saving ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    )}
                    Save Marks
                  </button>
                  <button
                    onClick={handleLock}
                    disabled={saving || isPending}
                    className="px-5 py-2.5 bg-charcoal hover:bg-charcoal/90 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Finalize & Lock
                  </button>
                </div>
              )}
            </div>

            {/* Grid Filters & Search */}
            <div className="bg-white border border-light-gray/60 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:grow max-w-xl">
                {/* Search */}
                <div className="relative md:grow">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-steel-gray/60">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by student name or roll no..."
                    className="w-full bg-cream/5 border border-light-gray/60 hover:border-primary/20 focus:border-primary rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-charcoal outline-none transition-all focus:ring-1 focus:ring-primary/20 placeholder:text-steel-gray/50"
                  />
                </div>

                {/* Section filter */}
                <select
                  value={sectionFilter}
                  onChange={e => setSectionFilter(e.target.value)}
                  className="bg-cream/5 border border-light-gray/60 hover:border-primary/20 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-charcoal font-medium outline-none transition-all focus:ring-1 focus:ring-primary/20"
                >
                  <option value="all">All Sections</option>
                  {sections.map(sec => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status pill counts */}
              <div className="flex items-center gap-4 text-xs font-semibold text-steel-gray">
                <div>
                  Students Listed:{' '}
                  <span className="text-charcoal font-bold">{filteredStudents.length}</span>
                </div>
                <div className="h-4 w-px bg-light-gray/60" />
                <div>
                  Marks Entered:{' '}
                  <span className="text-emerald-600 font-bold">
                    {Object.values(marks).filter(m => m.marks_obtained !== '').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-cream/10 border-b border-light-gray/60">
                      <th
                        onClick={() => handleSort('roll')}
                        className="px-6 py-4 text-[10px] font-bold text-steel-gray uppercase font-caption tracking-wider cursor-pointer hover:bg-cream/20 transition-colors select-none w-32"
                      >
                        <div className="flex items-center gap-1">
                          Roll No
                          {sortBy === 'roll' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('name')}
                        className="px-6 py-4 text-[10px] font-bold text-steel-gray uppercase font-caption tracking-wider cursor-pointer hover:bg-cream/20 transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          Student Name
                          {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('section')}
                        className="px-6 py-4 text-[10px] font-bold text-steel-gray uppercase font-caption tracking-wider cursor-pointer hover:bg-cream/20 transition-colors select-none w-28"
                      >
                        <div className="flex items-center gap-1">
                          Section
                          {sortBy === 'section' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-steel-gray uppercase font-caption tracking-wider w-40">
                        Marks Obtained
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-steel-gray uppercase font-caption tracking-wider w-28">
                        Percentage
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-steel-gray uppercase font-caption tracking-wider w-24">
                        Grade
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-steel-gray uppercase font-caption tracking-wider min-w-[200px]">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray/40">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-xs text-steel-gray/60 font-caption">
                          No students found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(student => {
                        const scoreStr = marks[student.student_id]?.marks_obtained || ''
                        const score = scoreStr !== '' ? parseFloat(scoreStr) : null
                        const pct = score !== null ? ((score / examDetail.total_marks) * 100).toFixed(1) + '%' : '—'
                        const grade = computeGrade(score, examDetail.total_marks)
                        
                        // Flag if entered mark is below passing marks
                        const isFailed = score !== null && score < examDetail.passing_marks

                        return (
                          <tr
                            key={student.student_id}
                            className={`group transition-all ${
                              isFailed
                                ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                : 'hover:bg-cream/5'
                            }`}
                          >
                            <td className="px-6 py-4 text-xs font-bold text-charcoal font-caption">
                              {student.roll_number || '—'}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-charcoal font-heading">
                              {student.student_name}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-steel-gray">
                              {student.section_name}
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-1.5 max-w-[120px]">
                                <input
                                  type="text"
                                  value={scoreStr}
                                  disabled={examDetail.is_locked}
                                  onChange={e => handleMarkChange(student.student_id, e.target.value)}
                                  placeholder="—"
                                  className={`w-full bg-cream/5 border rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none transition-all focus:ring-1 text-center ${
                                    examDetail.is_locked
                                      ? 'border-light-gray/40 bg-light-gray/5 text-steel-gray cursor-not-allowed'
                                      : isFailed
                                      ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20 text-amber-700 bg-amber-500/5'
                                      : 'border-light-gray/60 hover:border-primary/20 focus:border-primary focus:ring-primary/20 text-charcoal'
                                  }`}
                                />
                                <span className="text-[10px] text-steel-gray font-caption">
                                  / {examDetail.total_marks}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-steel-gray">
                              {pct}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-body ${
                                  grade === 'A+' || grade === 'A'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : grade === 'B+' || grade === 'B'
                                    ? 'bg-primary/10 text-primary'
                                    : grade === 'C+' || grade === 'C'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : grade === 'D'
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : grade === 'F'
                                    ? 'bg-red-500/10 text-red-600'
                                    : 'text-steel-gray'
                                }`}
                              >
                                {grade}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <input
                                type="text"
                                value={marks[student.student_id]?.remarks || ''}
                                disabled={examDetail.is_locked}
                                onChange={e => handleRemarkChange(student.student_id, e.target.value)}
                                placeholder="Add optional remarks..."
                                className={`w-full bg-cream/5 border rounded-lg px-3 py-1.5 text-xs outline-none transition-all focus:ring-1 ${
                                  examDetail.is_locked
                                    ? 'border-light-gray/40 bg-light-gray/5 text-steel-gray cursor-not-allowed'
                                    : 'border-light-gray/60 hover:border-primary/20 focus:border-primary focus:ring-primary/20 text-charcoal'
                                }`}
                              />
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom save bar (only if unlocked) */}
            {!examDetail.is_locked && (
              <div className="flex justify-end items-center gap-3">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  )}
                  Save Marks
                </button>
                <button
                  onClick={handleLock}
                  disabled={saving || isPending}
                  className="px-6 py-3 bg-charcoal hover:bg-charcoal/90 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Finalize & Lock
                </button>
              </div>
            )}

          </div>
        ) : (
          <div className="bg-white border border-light-gray/60 rounded-2xl p-16 text-center shadow-sm text-steel-gray/60 font-caption">
            Failed to parse exam details.
          </div>
        )
      ) : (
        <div className="bg-white border border-light-gray/60 rounded-2xl p-16 text-center shadow-sm">
          <div className="p-4 bg-primary/5 text-primary rounded-full w-fit mx-auto border border-primary/10">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <h4 className="text-base font-bold text-charcoal font-heading mt-4">Select an Exam</h4>
          <p className="text-xs text-steel-gray font-caption mt-1 max-w-sm mx-auto">
            Choose an academic year, class, term, subject, and specific exam row to load the students roster and start entering marks.
          </p>
        </div>
      )}

    </div>
  )
}
