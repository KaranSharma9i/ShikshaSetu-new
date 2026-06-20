'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getSectionsForClassAction,
  getPromotionStudentsAction,
  getElectivesForSectionAction,
  promoteStudentsAction,
} from './actions'

interface ClassItem {
  id: string
  name: string
  grade_number: number
}

interface SectionItem {
  id: string
  name: string
  class_id: string
}

interface AcademicYearItem {
  id: string
  label: string
  starts_on: string;
  ends_on: string;
  is_current: boolean;
}

interface StudentPromoItem {
  enrollment_id: string
  roll_number: string
  student_id: string
  student_code: string
  full_name: string
  profile_photo_url: string | null
  is_already_enrolled_target: boolean
  target_info: string | null
}

interface ElectiveItem {
  class_subject_id: string
  subject_id: string
  name: string
  code: string | null
}

interface PromoteFormProps {
  classes: ClassItem[]
  academicYears: AcademicYearItem[]
  currentYear: AcademicYearItem
  institutionId: string
}

export default function PromoteForm({
  classes,
  academicYears,
  currentYear,
  institutionId,
}: PromoteFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Steps: 1 = Selection & Students, 2 = Preview, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Selection states
  const [sourceAcademicYearId, setSourceAcademicYearId] = useState(currentYear.id)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [sourceSectionId, setSourceSectionId] = useState('')

  const [targetAcademicYearId, setTargetAcademicYearId] = useState('')
  const [targetClassId, setTargetClassId] = useState('')
  const [targetSectionId, setTargetSectionId] = useState('')

  // Data states
  const [sourceSections, setSourceSections] = useState<SectionItem[]>([])
  const [targetSections, setTargetSections] = useState<SectionItem[]>([])
  const [students, setStudents] = useState<StudentPromoItem[]>([])
  const [electives, setElectives] = useState<ElectiveItem[]>([])

  // Student specific selections
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set()) // old_enrollment_ids
  const [rollNumbers, setRollNumbers] = useState<Record<string, string>>({}) // student_id -> new_roll_number
  const [studentElectives, setStudentElectives] = useState<Record<string, string[]>>({}) // student_id -> class_subject_ids[]
  const [studentOutcomes, setStudentOutcomes] = useState<Record<string, 'PROMOTED' | 'RETAINED' | 'WITHDRAWN' | 'GRADUATED'>>({}) // student_id -> outcome

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoadingSourceSections, setIsLoadingSourceSections] = useState(false)
  const [isLoadingTargetSections, setIsLoadingTargetSections] = useState(false)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isLoadingElectives, setIsLoadingElectives] = useState(false)
  const [successCount, setSuccessCount] = useState(0)

  // Fetch source sections when source class/year changes
  useEffect(() => {
    if (!selectedClassId || !sourceAcademicYearId) {
      setSourceSections([])
      setSourceSectionId('')
      setStudents([])
      setSelectedStudentIds(new Set())
      return
    }

    const fetchSourceSections = async () => {
      setIsLoadingSourceSections(true)
      setErrorMsg(null)
      const res = await getSectionsForClassAction(selectedClassId, sourceAcademicYearId) as any
      if (res.success && res.data) {
        setSourceSections(res.data)
      } else {
        setErrorMsg(res.error || 'Failed to load source sections.')
      }
      setIsLoadingSourceSections(false)
    }

    fetchSourceSections()
  }, [selectedClassId, sourceAcademicYearId])

  // Auto-suggest target class when source class changes
  useEffect(() => {
    if (selectedClassId) {
      const sourceClass = classes.find((c) => c.id === selectedClassId)
      if (sourceClass) {
        const nextGradeNumber = sourceClass.grade_number + 1
        const suggestedClass = classes.find((c) => c.grade_number === nextGradeNumber)
        if (suggestedClass) {
          setTargetClassId(suggestedClass.id)
        } else {
          setTargetClassId('')
        }
      }
    } else {
      setTargetClassId('')
    }
  }, [selectedClassId, classes])

  // Fetch target sections when target class/year changes
  useEffect(() => {
    if (!targetClassId || !targetAcademicYearId) {
      setTargetSections([])
      setTargetSectionId('')
      return
    }

    const fetchTargetSections = async () => {
      setIsLoadingTargetSections(true)
      setErrorMsg(null)
      const res = await getSectionsForClassAction(targetClassId, targetAcademicYearId) as any
      if (res.success && res.data) {
        setTargetSections(res.data)
        // Auto-select first target section if available
        if (res.data.length > 0) {
          setTargetSectionId(res.data[0].id)
        } else {
          setTargetSectionId('')
        }
      } else {
        setErrorMsg(res.error || 'Failed to load target sections.')
      }
      setIsLoadingTargetSections(false)
    }

    fetchTargetSections()
  }, [targetClassId, targetAcademicYearId])

  // Fetch students when source section / target academic year changes
  useEffect(() => {
    if (!sourceAcademicYearId || !sourceSectionId) {
      setStudents([])
      setSelectedStudentIds(new Set())
      return
    }

    const fetchStudents = async () => {
      setIsLoadingStudents(true)
      setErrorMsg(null)
      const res = await getPromotionStudentsAction(
        sourceAcademicYearId,
        sourceSectionId,
        targetAcademicYearId || undefined
      ) as any
      if (res.success && res.data) {
        const studentData = res.data as StudentPromoItem[]
        setStudents(studentData)
        // Auto-select all students who are NOT already promoted
        const activeEnrollments = studentData
          .filter((s) => !s.is_already_enrolled_target)
          .map((s) => s.enrollment_id)
        setSelectedStudentIds(new Set(activeEnrollments))

        // Prefill roll numbers
        const initialRolls: Record<string, string> = {}
        studentData.forEach((s) => {
          initialRolls[s.student_id] = s.roll_number || ''
        })
        setRollNumbers(initialRolls)
      } else {
        setErrorMsg(res.error || 'Failed to load students.')
      }
      setIsLoadingStudents(false)
    }

    fetchStudents()
  }, [sourceAcademicYearId, sourceSectionId, targetAcademicYearId])

  // Fetch electives when target section changes
  useEffect(() => {
    if (!targetSectionId) {
      setElectives([])
      setStudentElectives({})
      return
    }

    const fetchElectives = async () => {
      setIsLoadingElectives(true)
      setErrorMsg(null)
      const res = await getElectivesForSectionAction(targetSectionId) as any
      if (res.success && res.data) {
        setElectives(res.data)
        // Reset electives for all students to empty array
        setStudentElectives({})
      } else {
        setErrorMsg(res.error || 'Failed to load elective subjects.')
      }
      setIsLoadingElectives(false)
    }

    fetchElectives()
  }, [targetSectionId])

  // Handle student select/deselect toggle
  const toggleStudentSelection = (enrollmentId: string, isAlreadyEnrolled: boolean) => {
    if (isAlreadyEnrolled) return // Prevent selecting already promoted students
    const nextSet = new Set(selectedStudentIds)
    if (nextSet.has(enrollmentId)) {
      nextSet.delete(enrollmentId)
    } else {
      nextSet.add(enrollmentId)
    }
    setSelectedStudentIds(nextSet)
  }

  // Handle select/deselect all (ignoring already promoted)
  const toggleSelectAll = () => {
    const selectable = filteredStudents.filter((s) => !s.is_already_enrolled_target)
    const allSelected = selectable.every((s) => selectedStudentIds.has(s.enrollment_id))

    const nextSet = new Set(selectedStudentIds)
    if (allSelected) {
      selectable.forEach((s) => nextSet.delete(s.enrollment_id))
    } else {
      selectable.forEach((s) => nextSet.add(s.enrollment_id))
    }
    setSelectedStudentIds(nextSet)
  }

  // Toggle elective for a specific student
  const toggleStudentElective = (studentId: string, classSubjectId: string) => {
    const currentList = studentElectives[studentId] || []
    let nextList: string[]
    if (currentList.includes(classSubjectId)) {
      nextList = currentList.filter((id) => id !== classSubjectId)
    } else {
      nextList = [...currentList, classSubjectId]
    }
    setStudentElectives({
      ...studentElectives,
      [studentId]: nextList,
    })
  }

  // Handle roll number change
  const handleRollNumberChange = (studentId: string, value: string) => {
    setRollNumbers({
      ...rollNumbers,
      [studentId]: value,
    })
  }

  // Filter students based on search query
  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.roll_number && s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name || ''
  const sourceSectionName = sourceSections.find((s) => s.id === sourceSectionId)?.name || ''
  const targetClassName = classes.find((c) => c.id === targetClassId)?.name || ''
  const targetSectionName = targetSections.find((s) => s.id === targetSectionId)?.name || ''

  const sourceYearLabel = academicYears.find((y) => y.id === sourceAcademicYearId)?.label || ''
  const targetYearLabel = academicYears.find((y) => y.id === targetAcademicYearId)?.label || ''

  const handleGoToPreview = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!sourceAcademicYearId || !selectedClassId || !sourceSectionId) {
      setErrorMsg('Please select Source Academic Year, Class, and Section.')
      return
    }

    if (!targetAcademicYearId || !targetClassId || !targetSectionId) {
      setErrorMsg('Please select Target Academic Year, Class, and Section.')
      return
    }

    if (sourceAcademicYearId === targetAcademicYearId) {
      setErrorMsg('Target Academic Year must be different from Source Academic Year.')
      return
    }

    if (selectedStudentIds.size === 0) {
      setErrorMsg('Please select at least one student to promote.')
      return
    }

    setStep(2)
  }

  const handleConfirmPromotion = () => {
    setErrorMsg(null)

    const promotionsPayload = students
      .filter((s) => selectedStudentIds.has(s.enrollment_id))
      .map((s) => ({
        student_id: s.student_id,
        old_enrollment_id: s.enrollment_id,
        target_section_id: targetSectionId,
        roll_number: rollNumbers[s.student_id] || '',
        elective_class_subject_ids: studentElectives[s.student_id] || [],
        outcome: studentOutcomes[s.student_id] || 'PROMOTED',
      }))

    startTransition(async () => {
      const res = await promoteStudentsAction({
        fromAcademicYearId: sourceAcademicYearId,
        toAcademicYearId: targetAcademicYearId,
        promotions: promotionsPayload,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to promote students.')
        return
      }

      setSuccessCount(selectedStudentIds.size)
      setStep(3)
    })
  }

  // Render Step 3: Success Screen
  if (step === 3) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-light-gray/60 rounded-2xl p-8 shadow-sm text-center space-y-6 animate-fadeIn font-body">
        <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-full w-fit mx-auto border border-emerald-500/20">
          <svg className="w-12 h-12 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-charcoal font-heading">Promotion Completed Successfully!</h2>
          <p className="text-xs text-steel-gray font-caption max-w-sm mx-auto leading-relaxed">
            Successfully promoted <strong>{successCount}</strong> students into the new academic year <strong>{targetYearLabel}</strong>.
          </p>
        </div>

        <div className="bg-cream/35 border border-light-gray/40 rounded-xl p-5 text-left text-xs font-semibold text-charcoal space-y-3">
          <div className="flex justify-between">
            <span className="text-steel-gray">From Year:</span>
            <span>{sourceYearLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">To Year:</span>
            <span className="text-emerald-600 font-bold">{targetYearLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">Source Class & Section:</span>
            <span>{selectedClassName} - {sourceSectionName}</span>
          </div>
          <div className="flex justify-between border-t border-light-gray/40 pt-3">
            <span className="text-steel-gray">Target Class & Section:</span>
            <span className="text-emerald-600 font-bold">{targetClassName} - {targetSectionName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">Total Promoted:</span>
            <span className="text-primary font-bold">{successCount} students</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setSelectedClassId('')
              setSourceSectionId('')
              setTargetClassId('')
              setTargetSectionId('')
              setStudents([])
              setSelectedStudentIds(new Set())
              setStep(1)
            }}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl transition-all cursor-pointer"
          >
            Promote More Students
          </button>
          <Link
            href="/dashboard/promotions"
            className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-bold text-white bg-primary hover:bg-primary-alt rounded-xl shadow transition-all active:scale-[0.98]"
          >
            Go to Promotions
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-body">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/promotions"
          className="inline-flex items-center text-xs font-bold text-steel-gray hover:text-primary transition-colors gap-1.5"
        >
          &larr; Back to Promotions
        </Link>
      </div>

      {/* Wizard Header */}
      <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-heading">
            {step === 1 ? 'Promote Students to Next Class' : 'Preview Promotion Batch'}
          </h1>
          <p className="text-steel-gray text-xs mt-1 font-caption">
            {step === 1
              ? 'Bulk promote students into a new academic year, assign target sections, and register optional electives.'
              : 'Verify the promotion roster, target sections, and selected electives before finalizing.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold font-caption uppercase tracking-wider text-steel-gray">
          <span className={`px-2.5 py-1 rounded-md border ${step === 1 ? 'bg-primary text-white border-primary' : 'bg-cream/35 border-light-gray/60'}`}>
            1. Configure & Roster
          </span>
          <span className="text-light-gray/80">&rarr;</span>
          <span className={`px-2.5 py-1 rounded-md border ${step === 2 ? 'bg-primary text-white border-primary' : 'bg-cream/35 border-light-gray/60'}`}>
            2. Preview & Confirm
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-xs font-semibold text-danger">
          {errorMsg}
        </div>
      )}

      {step === 1 ? (
        /* STEP 1 SETUP FORM */
        <form onSubmit={handleGoToPreview} className="space-y-6">
          {/* Source/Target configuration card */}
          <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-light-gray/40">
              
              {/* Left Column: Source Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider font-caption flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Source Configuration
                </h3>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  {/* Academic Year */}
                  <div>
                    <label htmlFor="sourceYear" className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider mb-2">
                      Source Academic Year
                    </label>
                    <select
                      id="sourceYear"
                      value={sourceAcademicYearId}
                      onChange={(e) => {
                        setSourceAcademicYearId(e.target.value)
                        setStudents([])
                        setSelectedStudentIds(new Set())
                      }}
                      className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal"
                      required
                    >
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.label} {y.is_current ? '(Current Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Class */}
                  <div>
                    <label htmlFor="sourceClass" className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider mb-2">
                      Source Class (Grade)
                    </label>
                    <select
                      id="sourceClass"
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value)
                        setSourceSectionId('')
                        setStudents([])
                        setSelectedStudentIds(new Set())
                      }}
                      className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal"
                      required
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section */}
                  <div>
                    <label htmlFor="sourceSection" className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider mb-2">
                      Source Section
                    </label>
                    <select
                      id="sourceSection"
                      value={sourceSectionId}
                      onChange={(e) => setSourceSectionId(e.target.value)}
                      disabled={!selectedClassId || isLoadingSourceSections}
                      className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal disabled:opacity-50"
                      required
                    >
                      <option value="">
                        {isLoadingSourceSections ? 'Loading...' : '-- Choose Section --'}
                      </option>
                      {sourceSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column: Target Selection */}
              <div className="space-y-4 pt-6 md:pt-0 md:pl-8">
                <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider font-caption flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  Target Promotion Destination
                </h3>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  {/* Target Academic Year */}
                  <div>
                    <label htmlFor="targetYear" className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider mb-2">
                      Target Academic Year (Must be different)
                    </label>
                    <select
                      id="targetYear"
                      value={targetAcademicYearId}
                      onChange={(e) => setTargetAcademicYearId(e.target.value)}
                      className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal"
                      required
                    >
                      <option value="">-- Choose Target Year --</option>
                      {academicYears
                        .filter((y) => y.id !== sourceAcademicYearId)
                        .map((y) => (
                          <option key={y.id} value={y.id}>
                            {y.label}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Target Class */}
                  <div>
                    <label htmlFor="targetClass" className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider mb-2">
                      Target Class
                    </label>
                    <select
                      id="targetClass"
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal"
                      required
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Section */}
                  <div>
                    <label htmlFor="targetSection" className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider mb-2">
                      Target Section
                    </label>
                    <select
                      id="targetSection"
                      value={targetSectionId}
                      onChange={(e) => setTargetSectionId(e.target.value)}
                      disabled={!targetClassId || !targetAcademicYearId || isLoadingTargetSections}
                      className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal disabled:opacity-50"
                      required
                    >
                      <option value="">
                        {isLoadingTargetSections ? 'Loading...' : '-- Choose Target Section --'}
                      </option>
                      {targetSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Students Roster table card */}
          {sourceSectionId && (
            <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
              
              {/* Card Header & Search */}
              <div className="px-6 py-5 border-b border-light-gray/60 bg-cream/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-charcoal font-heading">
                     Roster: {selectedClassName} - Section {sourceSectionName}
                  </h3>
                  <p className="text-xs text-steel-gray font-caption mt-0.5">
                    Select students to promote and pick their electives for target Section {targetSectionName || '?'}.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-steel-gray/60">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name, roll, or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-cream/10 border border-light-gray rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary transition-all font-body placeholder:text-steel-gray/50"
                  />
                </div>
              </div>

              {isLoadingStudents ? (
                <div className="py-20 text-center text-steel-gray text-sm font-body">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                  <p>Loading active student rosters...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-20 text-center text-steel-gray/60 text-sm font-body">
                  No students found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-light-gray/60 bg-cream/15 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                        <th className="py-4 px-6 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredStudents.filter((s) => !s.is_already_enrolled_target).length > 0 &&
                              filteredStudents
                                .filter((s) => !s.is_already_enrolled_target)
                                .every((s) => selectedStudentIds.has(s.enrollment_id))
                            }
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded text-primary focus:ring-primary border-light-gray"
                          />
                        </th>
                        <th className="py-4 px-6">Current Roll No</th>
                        <th className="py-4 px-6">Student Info</th>
                        <th className="py-4 px-6">Outcome</th>
                        <th className="py-4 px-6">New Roll No</th>
                        {electives.length > 0 && <th className="py-4 px-6">Elective Subjects</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/40 text-sm font-body text-charcoal">
                      {filteredStudents.map((stu) => {
                        const isSelected = selectedStudentIds.has(stu.enrollment_id)
                        const isAlreadyPromoted = stu.is_already_enrolled_target
                        const chosenElectives = studentElectives[stu.student_id] || []
                        const outcome = studentOutcomes[stu.student_id] || 'PROMOTED'

                        // Visual highlight class
                        let rowClass = 'hover:bg-cream/10 transition-colors'
                        if (isAlreadyPromoted) {
                          rowClass = 'opacity-60 bg-light-gray/5'
                        } else if (isSelected) {
                          if (outcome === 'PROMOTED') {
                            rowClass = 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] border-l-4 border-l-emerald-500 transition-colors'
                          } else if (outcome === 'RETAINED') {
                            rowClass = 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06] border-l-4 border-l-amber-500 transition-colors'
                          } else if (outcome === 'WITHDRAWN') {
                            rowClass = 'bg-rose-500/[0.03] hover:bg-rose-500/[0.06] border-l-4 border-l-rose-500 transition-colors'
                          } else if (outcome === 'GRADUATED') {
                            rowClass = 'bg-blue-500/[0.03] hover:bg-blue-500/[0.06] border-l-4 border-l-blue-500 transition-colors'
                          }
                        }

                        return (
                          <tr
                            key={stu.enrollment_id}
                            className={`${rowClass} ${!isAlreadyPromoted ? 'cursor-pointer' : ''}`}
                            onClick={() => toggleStudentSelection(stu.enrollment_id, isAlreadyPromoted)}
                          >
                            {/* Checkbox */}
                            <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isAlreadyPromoted}
                                onChange={() => toggleStudentSelection(stu.enrollment_id, isAlreadyPromoted)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary border-light-gray disabled:opacity-50"
                              />
                            </td>

                            {/* Roll Number */}
                            <td className="py-4 px-6 font-semibold">{stu.roll_number || 'N/A'}</td>

                            {/* Info */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {stu.profile_photo_url ? (
                                  <img
                                    src={stu.profile_photo_url}
                                    alt={stu.full_name}
                                    className="w-8 h-8 rounded-full object-cover border border-light-gray"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                    {stu.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold flex items-center gap-2">
                                    {stu.full_name}
                                    {isAlreadyPromoted && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 font-caption">
                                        Enrolled: {stu.target_info}
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono text-[10px] text-steel-gray mt-0.5">
                                    {stu.student_code}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Outcome select dropdown */}
                            <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={outcome}
                                disabled={!isSelected || isAlreadyPromoted}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setStudentOutcomes({
                                    ...studentOutcomes,
                                    [stu.student_id]: val
                                  });
                                }}
                                className="bg-white border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary rounded-lg px-2.5 py-1 text-xs focus:outline-none transition-all font-semibold text-charcoal outline-none cursor-pointer disabled:opacity-40 disabled:bg-light-gray/10"
                              >
                                <option value="PROMOTED">Promote</option>
                                <option value="RETAINED">Retain</option>
                                <option value="WITHDRAWN">Withdraw</option>
                                <option value="GRADUATED">Graduate</option>
                              </select>
                            </td>

                            {/* Target Roll Number input */}
                            <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={outcome === 'WITHDRAWN' || outcome === 'GRADUATED' ? '' : (rollNumbers[stu.student_id] || '')}
                                disabled={!isSelected || isAlreadyPromoted || outcome === 'WITHDRAWN' || outcome === 'GRADUATED'}
                                onChange={(e) => handleRollNumberChange(stu.student_id, e.target.value)}
                                placeholder={outcome === 'WITHDRAWN' || outcome === 'GRADUATED' ? 'N/A' : 'New Roll No'}
                                className="w-24 bg-cream/10 border border-light-gray rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary disabled:opacity-40 text-charcoal font-semibold disabled:bg-cream/5"
                              />
                            </td>

                            {/* Electives checklist */}
                            {electives.length > 0 && (
                              <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                {outcome === 'PROMOTED' ? (
                                  <div className="flex flex-wrap gap-3">
                                    {electives.map((el) => {
                                      const isElectiveChecked = chosenElectives.includes(el.class_subject_id)
                                      return (
                                        <label
                                          key={el.class_subject_id}
                                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all select-none ${
                                            !isSelected || isAlreadyPromoted
                                              ? 'opacity-40 cursor-not-allowed border-light-gray/60 bg-cream/5'
                                              : isElectiveChecked
                                              ? 'border-secondary/40 bg-secondary/10 text-primary font-bold cursor-pointer'
                                              : 'border-light-gray hover:bg-cream/30 text-charcoal cursor-pointer'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isElectiveChecked}
                                            disabled={!isSelected || isAlreadyPromoted}
                                            onChange={() => toggleStudentElective(stu.student_id, el.class_subject_id)}
                                            className="sr-only"
                                          />
                                          <span>{el.name}</span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                ) : outcome === 'RETAINED' ? (
                                  <span className="inline-flex items-center text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-lg font-caption uppercase">
                                    Electives Carried Forward
                                  </span>
                                ) : (
                                  <span className="text-xs text-steel-gray/40 italic">N/A</span>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Selection Summary footer */}
              {!isLoadingStudents && students.length > 0 && (
                <div className="bg-cream/10 border-t border-light-gray/60 px-6 py-4 flex items-center justify-between text-xs text-steel-gray font-caption">
                  <span>
                    Selected <strong className="text-charcoal">{selectedStudentIds.size}</strong> out of{' '}
                    <strong className="text-charcoal">{filteredStudents.filter((s) => !s.is_already_enrolled_target).length}</strong> eligible students.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Wizard Actions Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-light-gray/50 pt-6">
            <Link
              href="/dashboard/promotions"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoadingStudents || selectedStudentIds.size === 0 || !targetSectionId}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              Continue to Preview &rarr;
            </button>
          </div>
        </form>
      ) : (
        /* STEP 2 PREVIEW CHANGES */
        <div className="space-y-6">
          <div className="bg-white border border-light-gray/60 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-charcoal font-heading">Verify Student Promotions</h3>
              <p className="text-xs text-steel-gray font-caption mt-1">
                Please double-check the promotion roster details and target year settings before final confirmation.
              </p>
            </div>

            {/* Summary boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center">
                <span className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider">Promoted</span>
                <span className="text-xl font-bold text-emerald-600 font-heading">
                  {students.filter(s => selectedStudentIds.has(s.enrollment_id) && (studentOutcomes[s.student_id] || 'PROMOTED') === 'PROMOTED').length}
                </span>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
                <span className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider">Retained</span>
                <span className="text-xl font-bold text-amber-600 font-heading">
                  {students.filter(s => selectedStudentIds.has(s.enrollment_id) && (studentOutcomes[s.student_id] || 'PROMOTED') === 'RETAINED').length}
                </span>
              </div>
              <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl text-center">
                <span className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider">Withdrawn</span>
                <span className="text-xl font-bold text-rose-600 font-heading">
                  {students.filter(s => selectedStudentIds.has(s.enrollment_id) && (studentOutcomes[s.student_id] || 'PROMOTED') === 'WITHDRAWN').length}
                </span>
              </div>
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
                <span className="block text-[10px] font-bold text-steel-gray font-caption uppercase tracking-wider">Graduated</span>
                <span className="text-xl font-bold text-blue-600 font-heading">
                  {students.filter(s => selectedStudentIds.has(s.enrollment_id) && (studentOutcomes[s.student_id] || 'PROMOTED') === 'GRADUATED').length}
                </span>
              </div>
            </div>

            {/* Overview highlight box */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3 font-caption">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Year-End Promotion Specifications
              </h4>
              <div className="text-[11px] text-steel-gray leading-relaxed space-y-1.5">
                <p>
                  You are performing a year-end promotion run for <strong>{selectedStudentIds.size} students</strong>.
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Old academic year: <strong className="text-charcoal">{sourceYearLabel}</strong> &rarr; New academic year:{' '}
                    <strong className="text-emerald-600 font-bold">{targetYearLabel}</strong>.
                  </li>
                  <li>
                    A new record will be inserted in <strong>promotion_batches</strong>.
                  </li>
                  <li>
                    If the promotion fails for any student, all modifications in this batch will be completely rolled back.
                  </li>
                </ul>
              </div>
            </div>

            {/* Student Roster Comparison view */}
            <div className="border border-light-gray/50 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-light-gray/60 bg-cream/15 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                    <th className="py-3 px-5">Code</th>
                    <th className="py-3 px-5">Student Name</th>
                    <th className="py-3 px-5">Outcome</th>
                    <th className="py-3 px-5">New Roll No</th>
                    {electives.length > 0 && <th className="py-3 px-5">Assigned Electives</th>}
                    <th className="py-3 px-5 text-center">Transition Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray/40 text-xs font-body text-charcoal">
                  {students
                    .filter((stu) => selectedStudentIds.has(stu.enrollment_id))
                    .map((stu) => {
                      const studentElectiveIds = studentElectives[stu.student_id] || []
                      const chosenElectiveNames = electives
                        .filter((el) => studentElectiveIds.includes(el.class_subject_id))
                        .map((el) => el.name)
                      const outcome = studentOutcomes[stu.student_id] || 'PROMOTED'

                      let outcomeBadge = null
                      let rowClass = 'hover:bg-cream/10 transition-colors'
                      let pathColumn = null

                      if (outcome === 'PROMOTED') {
                        outcomeBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase">
                            Promoted
                          </span>
                        )
                        rowClass = 'bg-emerald-500/[0.01] hover:bg-emerald-500/[0.03] transition-colors border-l-2 border-l-emerald-500'
                        pathColumn = (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-light-gray/20 text-steel-gray">
                              Section {sourceSectionName}
                            </span>
                            <span className="mx-2 text-primary font-bold">&rarr;</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                              Section {targetSectionName}
                            </span>
                          </>
                        )
                      } else if (outcome === 'RETAINED') {
                        outcomeBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase">
                            Retained
                          </span>
                        )
                        rowClass = 'bg-amber-500/[0.01] hover:bg-amber-500/[0.03] transition-colors border-l-2 border-l-amber-500'
                        pathColumn = (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-light-gray/20 text-steel-gray">
                              Section {sourceSectionName}
                            </span>
                            <span className="mx-2 text-amber-600 font-bold">&rarr;</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                              Section {sourceSectionName} (Cloned)
                            </span>
                          </>
                        )
                      } else if (outcome === 'WITHDRAWN') {
                        outcomeBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 uppercase">
                            Withdrawn
                          </span>
                        )
                        rowClass = 'bg-rose-500/[0.01] hover:bg-rose-500/[0.03] transition-colors border-l-2 border-l-rose-500'
                        pathColumn = (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold uppercase">
                            Will Withdraw
                          </span>
                        )
                      } else if (outcome === 'GRADUATED') {
                        outcomeBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase">
                            Graduated
                          </span>
                        )
                        rowClass = 'bg-blue-500/[0.01] hover:bg-blue-500/[0.03] transition-colors border-l-2 border-l-blue-500'
                        pathColumn = (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold uppercase">
                            Will Graduate
                          </span>
                        )
                      }

                      return (
                        <tr key={stu.enrollment_id} className={rowClass}>
                          <td className="py-3 px-5 font-mono text-[11px] text-steel-gray">{stu.student_code}</td>
                          <td className="py-3 px-5 font-bold">{stu.full_name}</td>
                          <td className="py-3 px-5">{outcomeBadge}</td>
                          <td className="py-3 px-5 font-semibold text-primary">
                            {outcome === 'WITHDRAWN' || outcome === 'GRADUATED' ? (
                              <span className="text-steel-gray/40 italic">N/A</span>
                            ) : (
                              rollNumbers[stu.student_id] || stu.roll_number || 'N/A'
                            )}
                          </td>
                          {electives.length > 0 && (
                            <td className="py-3 px-5">
                              {outcome === 'PROMOTED' ? (
                                chosenElectiveNames.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {chosenElectiveNames.map((name) => (
                                      <span key={name} className="px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-primary font-semibold text-[10px]">
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-steel-gray/60 italic">None selected</span>
                                )
                              ) : outcome === 'RETAINED' ? (
                                <span className="text-amber-600 font-semibold italic bg-amber-500/5 border border-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                  Carrying forward existing
                                </span>
                              ) : (
                                <span className="text-steel-gray/40 italic">N/A</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-5 text-center">{pathColumn}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-light-gray/50 pt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isPending}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                &larr; Back to Config
              </button>
              <button
                type="button"
                onClick={handleConfirmPromotion}
                disabled={isPending}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Executing Promotions...' : 'Confirm & Execute Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
