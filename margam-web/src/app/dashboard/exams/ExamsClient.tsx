'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getExamsSummaryAction,
  updateExamNameAction,
  deleteExamAction
} from './actions'

interface ClassItem {
  id: string
  name: string
  grade_number: number
}

interface AcademicYearItem {
  id: string
  label: string
  is_current: boolean
}

interface ExamSummaryItem {
  exam_name: string
  academic_year_id: string
  academic_year_label: string
  class_count: number
  total_slots: number
}

interface ExamsClientProps {
  classes: ClassItem[]
  academicYears: AcademicYearItem[]
  activeAcademicYear: AcademicYearItem | null
  initialExams: ExamSummaryItem[]
  institution: any
  institutionId: string
}

export default function ExamsClient({
  classes,
  academicYears,
  activeAcademicYear,
  initialExams,
  institution,
  institutionId
}: ExamsClientProps) {
  const router = useRouter()

  // Retrieve brand theme colors dynamically
  const theme = institution?.theme as any
  const primaryColor = theme?.colors?.primary ?? '#4F46E5'
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37'
  const charcoalColor = theme?.colors?.charcoal ?? '#333333'
  const whiteColor = theme?.colors?.white ?? '#FFFFFF'

  // State variables
  const [selectedYearId, setSelectedYearId] = useState<string>(activeAcademicYear?.id || '')
  const [exams, setExams] = useState<ExamSummaryItem[]>(initialExams)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newExamName, setNewExamName] = useState('')
  const [createYearId, setCreateYearId] = useState<string>(activeAcademicYear?.id || '')

  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [examToRename, setExamToRename] = useState<ExamSummaryItem | null>(null)
  const [renamedName, setRenamedName] = useState('')

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<ExamSummaryItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Reload exams when selectedYearId changes
  useEffect(() => {
    if (!selectedYearId) return
    const fetchExams = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getExamsSummaryAction(selectedYearId)
        if (res.success && res.data) {
          setExams(res.data)
        } else {
          setError(res.error || 'Failed to load exams.')
        }
      } catch (err: any) {
        console.error(err)
        setError('An unexpected error occurred while loading exams.')
      } finally {
        setLoading(false)
      }
    }
    fetchExams()
  }, [selectedYearId])

  // Filter exams by search query
  const filteredExams = exams.filter(e =>
    e.exam_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Create exam (Redirect to Datesheet Builder)
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExamName.trim()) {
      alert('Please enter a valid exam name.')
      return
    }
    setCreateModalOpen(false)
    const encodedName = encodeURIComponent(newExamName.trim())
    router.push(`/dashboard/exams/manage?name=${encodedName}&year=${createYearId}&new=true`)
  }

  // Rename exam
  const handleRenameExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examToRename || !renamedName.trim()) return
    
    setActionLoading(true)
    setError(null)
    try {
      const res = await updateExamNameAction(
        examToRename.academic_year_id,
        examToRename.exam_name,
        renamedName.trim()
      )

      if (res.success) {
        // Refresh local list
        setExams(prev =>
          prev.map(item =>
            item.exam_name === examToRename.exam_name
              ? { ...item, exam_name: renamedName.trim() }
              : item
          )
        )
        setRenameModalOpen(false)
        setExamToRename(null)
      } else {
        setError(res.error || 'Failed to rename exam.')
      }
    } catch (err: any) {
      console.error(err)
      setError('An unexpected error occurred.')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete exam
  const handleDeleteExam = async () => {
    if (!examToDelete) return
    setActionLoading(true)
    setDeleteError(null)
    try {
      const res = await deleteExamAction(examToDelete.exam_name, examToDelete.academic_year_id)
      if (res.success) {
        setExams(prev => prev.filter(item => item.exam_name !== examToDelete.exam_name))
        setDeleteModalOpen(false)
        setExamToDelete(null)
      } else {
        setDeleteError(res.error || 'Failed to delete exam.')
      }
    } catch (err: any) {
      console.error(err)
      setDeleteError('An unexpected error occurred.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-8 font-body">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-charcoal font-heading" style={{ color: charcoalColor }}>
            Exam Management
          </h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Create exams, view institutional schedules, and configure per-class subject datesheets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Academic Year Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-steel-gray font-caption">Session:</span>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="text-xs font-bold text-charcoal border border-light-gray/80 rounded-xl px-3 py-2 bg-white outline-hidden cursor-pointer"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.label} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setNewExamName('')
              setCreateYearId(selectedYearId)
              setCreateModalOpen(true)}
            }
            className="text-xs font-bold text-white rounded-xl px-5 py-2.5 shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Exam
          </button>
        </div>
      </div>

      {/* Error Message banner */}
      {error && (
        <div className="p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="animate-spin h-10 w-10 text-primary mb-3" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-bold text-steel-gray">Loading scheduled exams...</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white border border-light-gray/60 rounded-2xl py-16 text-center text-steel-gray/60 text-sm font-body max-w-md mx-auto space-y-4 shadow-sm">
          <div className="p-3.5 bg-cream/30 text-steel-gray rounded-full w-fit mx-auto border border-light-gray/40">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-charcoal font-heading">No Exams Scheduled</h3>
          <p className="text-xs text-steel-gray/80 px-6 leading-relaxed">
            There are currently no exams scheduled for this academic session. Create a new exam name to begin building per-class datesheets.
          </p>
          <button
            onClick={() => {
              setNewExamName('')
              setCreateYearId(selectedYearId)
              setCreateModalOpen(true)
            }}
            className="text-xs font-bold text-white rounded-xl px-5 py-2.5 shadow-sm transition-all cursor-pointer active:scale-95"
            style={{ backgroundColor: primaryColor }}
          >
            Create Your First Exam
          </button>
        </div>
      ) : (
        <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="p-5 border-b border-light-gray/60 bg-cream/5 flex items-center justify-between">
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold text-charcoal pl-9 pr-4 py-2.5 border border-light-gray/80 rounded-xl outline-hidden focus:border-steel-gray/50 transition-colors"
              />
              <svg className="w-4 h-4 text-steel-gray absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-steel-gray">
              Showing {filteredExams.length} of {exams.length} exams
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-light-gray/10 text-steel-gray font-bold text-xs uppercase tracking-wider border-b border-light-gray/60 font-heading">
                  <th className="py-4 px-6">Exam Name</th>
                  <th className="py-4 px-6">Academic Session</th>
                  <th className="py-4 px-6 text-center">Classes Scheduled</th>
                  <th className="py-4 px-6 text-center">Subjects/Slots</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray/50 text-charcoal font-body">
                {filteredExams.map((exam) => (
                  <tr key={exam.exam_name} className="hover:bg-light-gray/5 transition-colors">
                    <td className="py-4.5 px-6 font-bold text-charcoal">{exam.exam_name}</td>
                    <td className="py-4.5 px-6 font-semibold text-steel-gray text-xs">{exam.academic_year_label}</td>
                    <td className="py-4.5 px-6 text-center font-bold text-xs">
                      <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-full" style={{ color: primaryColor, backgroundColor: primaryColor + '0d' }}>
                        {exam.class_count} {exam.class_count === 1 ? 'Class' : 'Classes'}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-center font-bold text-xs">
                      <span className="px-2.5 py-1 bg-amber-500/5 text-amber-800 rounded-full">
                        {exam.total_slots} {exam.total_slots === 1 ? 'Slot' : 'Slots'}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/exams/manage?name=${encodeURIComponent(exam.exam_name)}&year=${exam.academic_year_id}`)}
                          className="text-xs font-bold text-white rounded-xl px-4 py-2 hover:opacity-90 transition-all cursor-pointer"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Manage Datesheets
                        </button>
                        <button
                          onClick={() => {
                            setExamToRename(exam)
                            setRenamedName(exam.exam_name)
                            setRenameModalOpen(true)
                          }}
                          className="text-xs font-bold text-steel-gray hover:text-charcoal border border-light-gray/80 hover:border-steel-gray/50 rounded-xl px-3.5 py-2 bg-white transition-all cursor-pointer"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => {
                            setExamToDelete(exam)
                            setDeleteError(null)
                            setDeleteModalOpen(true)
                          }}
                          className="text-xs font-bold text-danger hover:text-red-700 border border-danger/25 hover:border-danger/55 rounded-xl px-3.5 py-2 bg-white transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-body animate-in fade-in duration-100">
          <form
            onSubmit={handleCreateExam}
            className="bg-white rounded-2xl max-w-md w-full border border-light-gray/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-charcoal font-heading">Schedule New Exam</h3>
              <p className="text-xs text-steel-gray mt-1 leading-relaxed">
                Provide a name and academic session for this exam. You will be redirected to map class-wise subject datesheets immediately.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-steel-gray uppercase tracking-wider">Exam Name</label>
                <input
                  type="text"
                  placeholder="e.g. Unit Test 1, Final Exam"
                  required
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  className="w-full text-xs font-semibold text-charcoal px-3 py-2.5 border border-light-gray/80 rounded-xl outline-hidden focus:border-steel-gray/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-steel-gray uppercase tracking-wider">Academic Session</label>
                <select
                  value={createYearId}
                  onChange={(e) => setCreateYearId(e.target.value)}
                  className="w-full text-xs font-semibold text-charcoal px-3 py-2.5 border border-light-gray/80 rounded-xl bg-white outline-hidden cursor-pointer"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label} {ay.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs font-bold text-steel-gray hover:text-charcoal border border-light-gray/80 hover:border-steel-gray/50 rounded-xl px-4 py-2.5 bg-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs font-bold text-white rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                Continue to Datesheet &rarr;
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RENAME EXAM MODAL */}
      {renameModalOpen && examToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-body animate-in fade-in duration-100">
          <form
            onSubmit={handleRenameExam}
            className="bg-white rounded-2xl max-w-md w-full border border-light-gray/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-charcoal font-heading">Rename Exam</h3>
              <p className="text-xs text-steel-gray mt-1 leading-relaxed">
                Rename <strong className="text-charcoal font-semibold">&ldquo;{examToRename.exam_name}&rdquo;</strong>. This will rename all slots associated with this exam name across all classes.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-steel-gray uppercase tracking-wider">New Exam Name</label>
              <input
                type="text"
                required
                value={renamedName}
                onChange={(e) => setRenamedName(e.target.value)}
                className="w-full text-xs font-semibold text-charcoal px-3 py-2.5 border border-light-gray/80 rounded-xl outline-hidden focus:border-steel-gray/50 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRenameModalOpen(false)}
                className="text-xs font-bold text-steel-gray hover:text-charcoal border border-light-gray/80 hover:border-steel-gray/50 rounded-xl px-4 py-2.5 bg-white transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="text-xs font-bold text-white rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                style={{ backgroundColor: primaryColor }}
              >
                {actionLoading && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE EXAM MODAL WITH SAFEGUARD */}
      {deleteModalOpen && examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-body animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full border border-light-gray/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-danger/10 text-danger rounded-full border border-danger/20 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-charcoal font-heading">Delete Exam?</h3>
                <p className="text-sm text-steel-gray leading-relaxed font-body">
                  Are you sure you want to delete <strong className="text-charcoal font-semibold">&ldquo;{examToDelete.exam_name}&rdquo;</strong>? This will remove all subject exam schedule slots for all classes under this exam name.
                </p>
                <p className="text-xs text-red-500 font-semibold font-body leading-relaxed">
                  Important: If any student marks are already recorded for this exam, the deletion will be blocked to prevent loss of academic records.
                </p>
              </div>
            </div>

            {/* Safeguard delete error */}
            {deleteError && (
              <div className="p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-xs font-bold leading-normal flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setDeleteModalOpen(false)}
                className="text-xs font-bold text-steel-gray hover:text-charcoal border border-light-gray/80 hover:border-steel-gray/50 rounded-xl px-4 py-2.5 bg-white transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteExam}
                className="text-xs font-bold text-white bg-danger hover:bg-red-700 rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
