'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getExamTermsAction,
  createExamTermAction,
  assignExamsToTermAction
} from '../actions'

interface LegacyExam {
  academic_year_id: string
  academic_year_label: string
  class_id: string
  class_name: string
  exam_name: string
  matching_exams_count: number
}

interface ExamTerm {
  id: string
  name: string
  term_type: string | null
}

interface LegacyAssignFormProps {
  initialExams: LegacyExam[]
}

export default function LegacyAssignForm({ initialExams }: LegacyAssignFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [legacyExams, setLegacyExams] = useState<LegacyExam[]>(initialExams)
  
  // Modal states
  const [activeExam, setActiveExam] = useState<LegacyExam | null>(null)
  const [existingTerms, setExistingTerms] = useState<ExamTerm[]>([])
  const [loadingTerms, setLoadingTerms] = useState(false)
  
  // Selection/Input states
  const [selectedTermId, setSelectedTermId] = useState<string>('')
  const [newTermName, setNewTermName] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Fetch terms when a legacy exam is selected
  useEffect(() => {
    if (!activeExam) {
      setExistingTerms([])
      setSelectedTermId('')
      setNewTermName('')
      setErrorMsg(null)
      return
    }

    async function loadTerms() {
      if (!activeExam) return
      setLoadingTerms(true)
      setErrorMsg(null)
      
      const res = await getExamTermsAction(activeExam.academic_year_id, activeExam.class_id)
      
      setLoadingTerms(false)
      if (res.success && res.data) {
        const termsList = res.data as ExamTerm[]
        setExistingTerms(termsList)
        if (termsList.length > 0) {
          setSelectedTermId(termsList[0].id)
        }
      } else {
        setErrorMsg(res.error || 'Failed to load existing terms.')
      }
    }

    loadTerms()
  }, [activeExam])

  const handleAssign = () => {
    if (!activeExam) return
    setErrorMsg(null)
    setSuccessMsg(null)

    const finalTermName = newTermName.trim()
    
    if (!selectedTermId && !finalTermName) {
      setErrorMsg('Please select an existing term or type a new term name.')
      return
    }

    startTransition(async () => {
      let termId = selectedTermId

      // 1. Create term if a new term name is supplied
      if (finalTermName) {
        const createRes = await createExamTermAction({
          academicYearId: activeExam.academic_year_id,
          classId: activeExam.class_id,
          name: finalTermName
        })

        const createResData = createRes.data as any
        if (!createRes.success || !createResData?.id) {
          setErrorMsg(createRes.error || 'Failed to create new term.')
          return
        }
        termId = createResData.id
      }

      // 2. Assign exams to term
      const assignRes = await assignExamsToTermAction({
        academicYearId: activeExam.academic_year_id,
        classId: activeExam.class_id,
        examName: activeExam.exam_name,
        examTermId: termId
      })

      if (!assignRes.success) {
        setErrorMsg(assignRes.error || 'Failed to assign exams to term.')
        return
      }

      // 3. Update local state
      setLegacyExams(prev => prev.filter(item => 
        !(item.academic_year_id === activeExam.academic_year_id &&
          item.class_id === activeExam.class_id &&
          item.exam_name === activeExam.exam_name)
      ))

      setSuccessMsg(`Successfully assigned ${assignRes.count} exam rows to term.`)
      setActiveExam(null)
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMsg(null)
      }, 5000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/results"
          className="inline-flex items-center text-xs font-bold text-steel-gray hover:text-primary transition-colors gap-1.5"
        >
          &larr; Back to Results Dashboard
        </Link>
      </div>

      {/* Info Card */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-base font-bold text-charcoal font-heading">Assign Legacy Exams to Terms</h4>
          <p className="text-xs text-steel-gray font-caption mt-1 leading-relaxed max-w-3xl">
            In previous versions, exams were grouped loosely by matching their text names. We are moving to explicit <strong>Exam Terms</strong>. 
            Use this tool to assign older ungrouped exams to structured terms. Grouped exams will then appear correctly in subject marks entry grids and report cards.
          </p>
        </div>
      </div>

      {/* Toast Alert */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs font-bold text-emerald-600 flex items-center gap-2 animate-fadeIn">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Main List */}
      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-light-gray/60 bg-cream/5 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-charcoal font-heading">Ungrouped Legacy Exams</h3>
            <p className="text-xs text-steel-gray font-caption mt-0.5">List of distinct exam combinations currently lacking a term linkage.</p>
          </div>
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full font-body">
            {legacyExams.length} Combinations Found
          </span>
        </div>

        {legacyExams.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto space-y-4">
            <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-full w-fit mx-auto border border-emerald-500/20">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-charcoal font-heading">All Clean!</h4>
              <p className="text-xs text-steel-gray font-caption leading-relaxed">
                There are no ungrouped legacy exams. All exams have been successfully linked to structured exam terms.
              </p>
            </div>
            <Link
              href="/dashboard/results"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all"
            >
              Go to Results Hub
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-light-gray/60 bg-cream/15">
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Academic Year</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Class</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Exam Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Matching Rows</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray/40">
                {legacyExams.map((exam, idx) => (
                  <tr key={`${exam.academic_year_id}_${exam.class_id}_${exam.exam_name}_${idx}`} className="hover:bg-cream/10 transition-colors">
                    <td className="py-4 px-6 font-bold text-charcoal font-heading text-sm">
                      {exam.academic_year_label}
                    </td>
                    <td className="py-4 px-6 text-sm text-steel-gray font-body font-semibold">
                      {exam.class_name}
                    </td>
                    <td className="py-4 px-6 text-sm text-charcoal font-body font-medium">
                      {exam.exam_name}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/5 text-primary">
                        {exam.matching_exams_count} subject-exams
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setActiveExam(exam)}
                        className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Assign Term
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {activeExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-light-gray/60 rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden">
            <div>
              <h3 className="text-xl font-bold text-charcoal font-heading">
                Assign Legacy Exam to Term
              </h3>
              <p className="text-xs text-steel-gray font-caption mt-1">
                Grouping exam <strong className="text-charcoal">"{activeExam.exam_name}"</strong> ({activeExam.class_name}, {activeExam.academic_year_label})
              </p>
            </div>

            {errorMsg && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-xs font-semibold text-danger">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Option A: Select Existing Term */}
              <div>
                <label className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider mb-2">
                  Select Existing Term
                </label>
                {loadingTerms ? (
                  <div className="text-xs text-steel-gray py-2.5">Loading terms...</div>
                ) : existingTerms.length === 0 ? (
                  <div className="text-xs text-steel-gray/60 py-2 italic bg-cream/10 border border-dashed border-light-gray rounded-xl px-4">
                    No terms exist yet for this class & year. Add a new term below.
                  </div>
                ) : (
                  <select
                    value={selectedTermId}
                    onChange={(e) => {
                      setSelectedTermId(e.target.value)
                      setNewTermName('') // clear new term text when selecting existing
                    }}
                    disabled={isPending}
                    className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal"
                  >
                    {existingTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name} {term.term_type ? `(${term.term_type})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Separator */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-light-gray/40"></div>
                <span className="flex-shrink mx-4 text-steel-gray text-[10px] font-bold uppercase tracking-wider font-caption">OR</span>
                <div className="flex-grow border-t border-light-gray/40"></div>
              </div>

              {/* Option B: Create New Term */}
              <div>
                <label htmlFor="newTermName" className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider mb-2">
                  Create & Link a New Term
                </label>
                <input
                  type="text"
                  id="newTermName"
                  value={newTermName}
                  onChange={(e) => {
                    setNewTermName(e.target.value)
                    if (e.target.value.trim()) {
                      setSelectedTermId('') // deselect existing when user starts typing new
                    } else if (existingTerms.length > 0) {
                      setSelectedTermId(existingTerms[0].id)
                    }
                  }}
                  disabled={isPending}
                  placeholder="e.g. First Term, Term I, Final Exam"
                  className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body placeholder:text-steel-gray/50 text-charcoal"
                />
                <p className="text-[10px] text-steel-gray/80 font-caption mt-1.5">
                  Type a name to register a new term for this class. It will be created and then linked to this exam group.
                </p>
              </div>
            </div>

            {/* Preview Banner */}
            <div className="bg-cream/40 border border-light-gray/50 rounded-xl p-4 text-xs space-y-1">
              <span className="block font-bold text-primary font-heading">Assignment Preview</span>
              <span className="block text-steel-gray font-body leading-relaxed">
                This will update <strong className="text-charcoal">{activeExam.matching_exams_count} subject-exam</strong> rows
                matching <strong className="text-charcoal">"{activeExam.exam_name}"</strong> to link to term 
                <strong> {newTermName.trim() ? `"${newTermName.trim()}" (New Term)` : `"${existingTerms.find(t => t.id === selectedTermId)?.name || 'Selected Term'}"`}</strong>.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveExam(null)}
                disabled={isPending}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={isPending}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? 'Assigning...' : 'Assign Term'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
