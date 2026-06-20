'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getSectionsForClassAction,
  getSectionMoveStudentsAction,
  moveSectionStudentsAction,
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

interface StudentMoveItem {
  enrollment_id: string
  roll_number: string
  student_id: string
  student_code: string
  full_name: string
  profile_photo_url: string | null
}

interface MoveSectionFormProps {
  classes: ClassItem[]
  currentYear: {
    id: string
    label: string
    starts_on: string
    ends_on: string
  }
  institutionId: string
}

export default function MoveSectionForm({
  classes,
  currentYear,
  institutionId,
}: MoveSectionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Steps: 1 = Selection & Students, 2 = Preview, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState('')
  const [sourceSectionId, setSourceSectionId] = useState('')
  const [targetSectionId, setTargetSectionId] = useState('')

  // Data states
  const [sections, setSections] = useState<SectionItem[]>([])
  const [students, setStudents] = useState<StudentMoveItem[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoadingSections, setIsLoadingSections] = useState(false)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [successCount, setSuccessCount] = useState(0)

  // Fetch sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([])
      setSourceSectionId('')
      setTargetSectionId('')
      setStudents([])
      setSelectedStudentIds(new Set())
      return
    }

    const fetchSections = async () => {
      setIsLoadingSections(true)
      setErrorMsg(null)
      const res = await getSectionsForClassAction(selectedClassId, currentYear.id)
      if (res.success && res.data) {
        setSections(res.data)
      } else {
        setErrorMsg(res.error || 'Failed to load sections.')
      }
      setIsLoadingSections(false)
    }

    fetchSections()
  }, [selectedClassId, currentYear.id])

  // Fetch students when source section changes
  useEffect(() => {
    if (!sourceSectionId) {
      setStudents([])
      setSelectedStudentIds(new Set())
      return
    }

    const fetchStudents = async () => {
      setIsLoadingStudents(true)
      setErrorMsg(null)
      const res = await getSectionMoveStudentsAction(currentYear.id, sourceSectionId)
      if (res.success && res.data) {
        setStudents(res.data)
        // Auto-select all by default
        setSelectedStudentIds(new Set(res.data.map((s) => s.enrollment_id)))
      } else {
        setErrorMsg(res.error || 'Failed to load students.')
      }
      setIsLoadingStudents(false)
    }

    fetchStudents()
  }, [sourceSectionId, currentYear.id])

  // Reset target section if it matches source section
  useEffect(() => {
    if (targetSectionId && targetSectionId === sourceSectionId) {
      setTargetSectionId('')
      setErrorMsg('Target section must be different from source section.')
    } else {
      setErrorMsg(null)
    }
  }, [targetSectionId, sourceSectionId])

  // Handle student select/deselect toggle
  const toggleStudentSelection = (enrollmentId: string) => {
    const nextSet = new Set(selectedStudentIds)
    if (nextSet.has(enrollmentId)) {
      nextSet.delete(enrollmentId)
    } else {
      nextSet.add(enrollmentId)
    }
    setSelectedStudentIds(nextSet)
  }

  // Handle select/deselect all
  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.enrollment_id)))
    }
  }

  // Filter students based on search query
  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name || ''
  const sourceSectionName = sections.find((s) => s.id === sourceSectionId)?.name || ''
  const targetSectionName = sections.find((s) => s.id === targetSectionId)?.name || ''

  const handleGoToPreview = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedClassId || !sourceSectionId || !targetSectionId) {
      setErrorMsg('Please select Class, Source Section, and Target Section.')
      return
    }

    if (sourceSectionId === targetSectionId) {
      setErrorMsg('Source and Target sections must be different.')
      return
    }

    if (selectedStudentIds.size === 0) {
      setErrorMsg('Please select at least one student to move.')
      return
    }

    setStep(2)
  }

  const handleConfirmMove = () => {
    setErrorMsg(null)

    startTransition(async () => {
      const res = await moveSectionStudentsAction({
        enrollmentIds: Array.from(selectedStudentIds),
        targetSectionId,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to reassign student sections.')
        return
      }

      setSuccessCount(selectedStudentIds.size)
      setStep(3)
    })
  }

  // Render Step 3: Success Screen
  if (step === 3) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-light-gray/60 rounded-2xl p-8 shadow-sm text-center space-y-6 animate-fadeIn">
        <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-full w-fit mx-auto border border-emerald-500/20">
          <svg className="w-12 h-12 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-charcoal font-heading">Reassignment Successful!</h2>
          <p className="text-sm text-steel-gray font-caption max-w-sm mx-auto">
            Successfully moved <strong>{successCount}</strong> students within the academic year <strong>{currentYear.label}</strong>.
          </p>
        </div>

        <div className="bg-cream/35 border border-light-gray/40 rounded-xl p-5 text-left text-xs font-semibold text-charcoal space-y-3">
          <div className="flex justify-between">
            <span className="text-steel-gray">Academic Year:</span>
            <span>{currentYear.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">Class Grade:</span>
            <span>{selectedClassName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">Old Section:</span>
            <span className="text-danger font-bold">{sourceSectionName}</span>
          </div>
          <div className="flex justify-between border-t border-light-gray/40 pt-3">
            <span className="text-steel-gray">New Section:</span>
            <span className="text-emerald-600 font-bold">{targetSectionName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">Students Moved:</span>
            <span className="text-primary font-bold">{successCount} students</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              // Reset state to run another move
              setSelectedClassId('')
              setSourceSectionId('')
              setTargetSectionId('')
              setStudents([])
              setSelectedStudentIds(new Set())
              setStep(1)
            }}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl transition-all cursor-pointer"
          >
            Move More Students
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button link */}
      <div>
        <Link
          href="/dashboard/promotions"
          className="inline-flex items-center text-xs font-bold text-steel-gray hover:text-primary transition-colors gap-1.5"
        >
          &larr; Back to Promotions
        </Link>
      </div>

      {/* Progress Steps Header */}
      <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-heading">
            {step === 1 ? 'Move Student Section' : 'Preview Reassignments'}
          </h1>
          <p className="text-steel-gray text-xs mt-1 font-caption">
            Reassign students between sections of the same class for academic year <strong className="text-charcoal">{currentYear.label}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold font-caption uppercase tracking-wider text-steel-gray">
          <span className={`px-2.5 py-1 rounded-md border ${step === 1 ? 'bg-primary text-white border-primary' : 'bg-cream/35 border-light-gray/60'}`}>
            1. Select & Filter
          </span>
          <span className="text-light-gray/80">&rarr;</span>
          <span className={`px-2.5 py-1 rounded-md border ${step === 2 ? 'bg-primary text-white border-primary' : 'bg-cream/35 border-light-gray/60'}`}>
            2. Preview
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-xs font-semibold text-danger">
          {errorMsg}
        </div>
      )}

      {step === 1 ? (
        /* STEP 1 FORM & SELECTION */
        <form onSubmit={handleGoToPreview} className="space-y-6">
          {/* Filters Card */}
          <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider font-caption border-b border-light-gray/40 pb-3">
              Section Setup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Select Class */}
              <div>
                <label htmlFor="classId" className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider mb-2">
                  Select Class
                </label>
                <select
                  id="classId"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal"
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Section */}
              <div>
                <label htmlFor="sourceSection" className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider mb-2">
                  Source Section
                </label>
                <select
                  id="sourceSection"
                  value={sourceSectionId}
                  onChange={(e) => setSourceSectionId(e.target.value)}
                  disabled={!selectedClassId || isLoadingSections}
                  className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal disabled:opacity-50"
                  required
                >
                  <option value="">
                    {isLoadingSections ? 'Loading...' : '-- Choose Source Section --'}
                  </option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Section */}
              <div>
                <label htmlFor="targetSection" className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider mb-2">
                  Target Section
                </label>
                <select
                  id="targetSection"
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  disabled={!selectedClassId || isLoadingSections}
                  className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal disabled:opacity-50"
                  required
                >
                  <option value="">
                    {isLoadingSections ? 'Loading...' : '-- Choose Target Section --'}
                  </option>
                  {sections
                    .filter((sec) => sec.id !== sourceSectionId)
                    .map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Students List Card */}
          {sourceSectionId && (
            <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
              <div className="px-6 py-5 border-b border-light-gray/60 bg-cream/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-charcoal font-heading">
                    Students enrolled in {selectedClassName} - {sourceSectionName}
                  </h3>
                  <p className="text-xs text-steel-gray font-caption mt-0.5">
                    Select the students you want to move to Section {targetSectionName || '?'}.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-steel-gray/60">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search by code or name..."
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
                            checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded text-primary focus:ring-primary border-light-gray"
                          />
                        </th>
                        <th className="py-4 px-6">Roll No</th>
                        <th className="py-4 px-6">Student Code</th>
                        <th className="py-4 px-6">Full Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/40 text-sm font-body text-charcoal">
                      {filteredStudents.map((stu) => {
                        const isSelected = selectedStudentIds.has(stu.enrollment_id)
                        return (
                          <tr
                            key={stu.enrollment_id}
                            className={`hover:bg-cream/10 transition-colors cursor-pointer ${
                              isSelected ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => toggleStudentSelection(stu.enrollment_id)}
                          >
                            <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudentSelection(stu.enrollment_id)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary border-light-gray"
                              />
                            </td>
                            <td className="py-4 px-6 font-semibold">{stu.roll_number}</td>
                            <td className="py-4 px-6 font-mono text-xs text-steel-gray">{stu.student_code}</td>
                            <td className="py-4 px-6 font-bold flex items-center gap-3">
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
                              {stu.full_name}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Selected summary in list footer */}
              {!isLoadingStudents && students.length > 0 && (
                <div className="bg-cream/10 border-t border-light-gray/60 px-6 py-4 flex items-center justify-between text-xs text-steel-gray font-caption">
                  <span>
                    Selected <strong className="text-charcoal">{selectedStudentIds.size}</strong> out of{' '}
                    <strong className="text-charcoal">{filteredStudents.length}</strong> students.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Form Submissions Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-light-gray/50 pt-6">
            <Link
              href="/dashboard/promotions"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoadingStudents || selectedStudentIds.size === 0}
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
              <h3 className="text-lg font-bold text-charcoal font-heading">Verify Student Reassignment</h3>
              <p className="text-xs text-steel-gray font-caption mt-1">
                Please double-check the reassignment roster details before final confirmation.
              </p>
            </div>

            {/* Overview highlight box */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider font-caption flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Mid-Year Moving Constraints
              </h4>
              <p className="text-[11px] text-steel-gray font-caption leading-relaxed">
                You are about to reassign <strong>{selectedStudentIds.size} students</strong> from Class{' '}
                <strong>{selectedClassName} - Section {sourceSectionName}</strong> to{' '}
                <strong>Section {targetSectionName}</strong> within the academic year{' '}
                <strong>{currentYear.label}</strong>.
              </p>
              <p className="text-[11px] text-steel-gray font-caption font-bold">
                * This will update the section_id of their active enrollments directly. This does NOT change their Academic Year, and does NOT record a promotion batch audit trail.
              </p>
            </div>

            {/* Comparison view of selected students */}
            <div className="border border-light-gray/50 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-light-gray/60 bg-cream/15 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                    <th className="py-3 px-5">Student Code</th>
                    <th className="py-3 px-5">Full Name</th>
                    <th className="py-3 px-5 text-center">Transition Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray/40 text-xs font-body text-charcoal">
                  {students
                    .filter((stu) => selectedStudentIds.has(stu.enrollment_id))
                    .map((stu) => (
                      <tr key={stu.enrollment_id} className="hover:bg-cream/10 transition-colors">
                        <td className="py-3 px-5 font-mono text-[11px] text-steel-gray">{stu.student_code}</td>
                        <td className="py-3 px-5 font-bold">{stu.full_name}</td>
                        <td className="py-3 px-5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-light-gray/20 text-steel-gray">
                            Section {sourceSectionName}
                          </span>
                          <span className="mx-2 text-primary font-bold">&rarr;</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                            Section {targetSectionName}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Submitting Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-light-gray/50 pt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isPending}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                &larr; Back to Roster
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                disabled={isPending}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Reassigning Students...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
