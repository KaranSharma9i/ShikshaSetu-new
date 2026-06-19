'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getExamTermsAction,
  getSectionsAction,
  getStudentsAction,
  getReportCardDataAction
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

interface SectionItem {
  id: string
  name: string
}

interface StudentItem {
  student_id: string
  roll_number: string
  full_name: string
  profile_photo_url: string | null
}

interface ReportCardSubject {
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
}

interface ReportCardData {
  student: {
    id: string
    student_code: string
    full_name: string
    profile_photo_url: string | null
    guardian_name: string | null
    roll_number: string | null
    class_name: string
    section_name: string
    class_id: string
    section_id: string
  }
  subjects: ReportCardSubject[]
  aggregates: {
    total_obtained: number
    total_max: number
    percentage: number
    overall_grade: string
    is_passed: boolean
  } | null
  rank: {
    position: number | string
    total_students: number
  }
}

interface ReportCardClientProps {
  initialYears: AcademicYear[]
  initialClasses: ClassItem[]
}

export default function ReportCardClient({ initialYears, initialClasses }: ReportCardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Selectors State
  const [selectedYearId, setSelectedYearId] = useState<string>(
    initialYears.find(y => y.is_current)?.id || (initialYears[0]?.id || '')
  )
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClasses[0]?.id || '')
  
  const [terms, setTerms] = useState<ExamTerm[]>([])
  const [selectedTermId, setSelectedTermId] = useState<string>('')
  const [loadingTerms, setLoadingTerms] = useState(false)

  const [sections, setSections] = useState<SectionItem[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [loadingSections, setLoadingSections] = useState(false)

  const [students, setStudents] = useState<StudentItem[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Report Card Detail / Preview State
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null)
  const [loadingReportCard, setLoadingReportCard] = useState(false)

  // Error/Success
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 1. Fetch Terms and Sections when Year or Class changes
  useEffect(() => {
    if (!selectedYearId || !selectedClassId) {
      setTerms([])
      setSelectedTermId('')
      setSections([])
      setSelectedSectionId('')
      return
    }

    async function loadTermsAndSections() {
      setErrorMsg(null)
      setLoadingTerms(true)
      setLoadingSections(true)

      const [termsRes, sectionsRes] = await Promise.all([
        getExamTermsAction(selectedYearId, selectedClassId),
        getSectionsAction(selectedClassId, selectedYearId)
      ])

      setLoadingTerms(false)
      setLoadingSections(false)

      if (termsRes.success && termsRes.data) {
        const termList = termsRes.data as ExamTerm[]
        setTerms(termList)
        if (termList.length > 0) {
          setSelectedTermId(termList[0].id)
        } else {
          setSelectedTermId('legacy') // default fallback to legacy/ungrouped if none
        }
      } else {
        setErrorMsg(termsRes.error || 'Failed to load exam terms.')
      }

      if (sectionsRes.success && sectionsRes.data) {
        const secList = sectionsRes.data as SectionItem[]
        setSections(secList)
        if (secList.length > 0) {
          setSelectedSectionId(secList[0].id)
        } else {
          setSelectedSectionId('')
        }
      } else {
        setErrorMsg(prev => prev || (sectionsRes.error as string) || 'Failed to load sections.')
      }
    }

    loadTermsAndSections()
    setStudents([])
    setSelectedStudentId('')
    setReportCard(null)
  }, [selectedYearId, selectedClassId])

  // 2. Fetch Students when Section changes
  useEffect(() => {
    if (!selectedSectionId || !selectedYearId) {
      setStudents([])
      setSelectedStudentId('')
      return
    }

    async function loadStudents() {
      setLoadingStudents(true)
      setErrorMsg(null)
      const res = await getStudentsAction(selectedSectionId, selectedYearId)
      setLoadingStudents(false)

      if (res.success && res.data) {
        const studentList = res.data as StudentItem[]
        setStudents(studentList)
        if (studentList.length > 0) {
          setSelectedStudentId(studentList[0].student_id)
        } else {
          setSelectedStudentId('')
        }
      } else {
        setErrorMsg(res.error || 'Failed to load students.')
      }
    }

    loadStudents()
    setReportCard(null)
  }, [selectedSectionId, selectedYearId])

  // 3. Fetch Report Card Data when Student or Term changes
  useEffect(() => {
    if (!selectedStudentId || !selectedYearId || !selectedTermId) {
      setReportCard(null)
      return
    }

    if (selectedStudentId === 'section-all') {
      setReportCard(null)
      return
    }

    async function loadReportCard() {
      setLoadingReportCard(true)
      setErrorMsg(null)
      const res = await getReportCardDataAction(
        selectedStudentId,
        selectedYearId,
        selectedTermId === 'legacy' ? null : selectedTermId
      )
      setLoadingReportCard(false)

      if (res.success && res.data) {
        setReportCard(res.data as ReportCardData)
      } else {
        setErrorMsg(res.error || 'Failed to load report card data.')
        setReportCard(null)
      }
    }

    loadReportCard()
  }, [selectedStudentId, selectedYearId, selectedTermId])

  // Handlers for PDF generation
  const handleDownloadSingle = () => {
    if (!selectedStudentId || !selectedYearId || !selectedTermId) return
    const termParam = selectedTermId === 'legacy' ? 'null' : selectedTermId
    window.open(
      `/api/reports/pdf?studentId=${selectedStudentId}&academicYearId=${selectedYearId}&termId=${termParam}`,
      '_blank'
    )
  }

  const handleDownloadSection = () => {
    if (!selectedSectionId || !selectedYearId || !selectedTermId) return
    const termParam = selectedTermId === 'legacy' ? 'null' : selectedTermId
    window.open(
      `/api/reports/pdf?sectionId=${selectedSectionId}&academicYearId=${selectedYearId}&termId=${termParam}`,
      '_blank'
    )
  }

  const selectedStudentObj = students.find(s => s.student_id === selectedStudentId)
  const isAllSelected = selectedStudentId === 'section-all'

  // Extract core vs elective subjects from report card data
  const coreSubjects = reportCard?.subjects.filter(s => !s.is_elective) || []
  const electiveSubjects = reportCard?.subjects.filter(s => s.is_elective) || []

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-sm text-red-700 font-caption">
          {errorMsg}
        </div>
      )}

      {/* Selectors Grid */}
      <div className="p-5 bg-white border border-light-gray/60 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Academic Year */}
        <div>
          <label className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Academic Year</label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full p-2.5 bg-cream/20 border border-light-gray/80 rounded-xl text-charcoal font-body text-sm focus:outline-none focus:border-primary transition-all duration-300"
          >
            {initialYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label} {y.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}
        <div>
          <label className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full p-2.5 bg-cream/20 border border-light-gray/80 rounded-xl text-charcoal font-body text-sm focus:outline-none focus:border-primary transition-all duration-300"
          >
            {initialClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Term */}
        <div>
          <label className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Term</label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            disabled={loadingTerms}
            className="w-full p-2.5 bg-cream/20 border border-light-gray/80 rounded-xl text-charcoal font-body text-sm focus:outline-none focus:border-primary transition-all duration-300 disabled:opacity-50"
          >
            {loadingTerms ? (
              <option>Loading...</option>
            ) : (
              <>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value="legacy">Ungrouped (legacy)</option>
              </>
            )}
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Section</label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={loadingSections}
            className="w-full p-2.5 bg-cream/20 border border-light-gray/80 rounded-xl text-charcoal font-body text-sm focus:outline-none focus:border-primary transition-all duration-300 disabled:opacity-50"
          >
            {loadingSections ? (
              <option>Loading...</option>
            ) : (
              <>
                {sections.length > 0 ? (
                  sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <option value="">No Sections Available</option>
                )}
              </>
            )}
          </select>
        </div>

        {/* Student */}
        <div>
          <label className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Student</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={loadingStudents || !selectedSectionId}
            className="w-full p-2.5 bg-cream/20 border border-light-gray/80 rounded-xl text-charcoal font-body text-sm focus:outline-none focus:border-primary transition-all duration-300 disabled:opacity-50"
          >
            {loadingStudents ? (
              <option>Loading...</option>
            ) : (
              <>
                {students.length > 0 ? (
                  <>
                    <option value="section-all">All Students (Combine PDF)</option>
                    {students.map((s) => (
                      <option key={s.student_id} value={s.student_id}>
                        {s.roll_number ? `[Roll: ${s.roll_number}] ` : ''}{s.full_name}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">No Students Enrolled</option>
                )}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Main Preview and Action Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Summary / Actions Panel */}
        <div className="xl:col-span-1 p-5 bg-white border border-light-gray/60 rounded-2xl shadow-sm space-y-5">
          <h3 className="text-lg font-bold text-charcoal font-heading border-b border-light-gray/40 pb-3">Actions</h3>
          
          {isAllSelected ? (
            <div className="space-y-4">
              <div className="text-sm text-steel-gray leading-relaxed font-body">
                You have selected to generate report cards for the entire section.
                <div className="mt-2 p-3 bg-cream/10 rounded-xl border border-light-gray/40 space-y-1">
                  <p className="text-xs text-charcoal font-bold">Roster Count: <span className="text-primary font-mono">{students.length} students</span></p>
                  <p className="text-[11px] text-steel-gray">This will compile all student records into a single multi-page PDF document.</p>
                </div>
              </div>
              <button
                onClick={handleDownloadSection}
                disabled={students.length === 0}
                className="w-full py-3 px-4 bg-primary text-white hover:bg-primary-alt disabled:opacity-50 disabled:hover:bg-primary rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Section PDF
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-steel-gray leading-relaxed font-body">
                {selectedStudentObj ? (
                  <div className="space-y-3">
                    <p className="font-bold text-charcoal text-base">{selectedStudentObj.full_name}</p>
                    <div className="text-xs text-steel-gray space-y-1.5 font-caption">
                      <p>Roll No: <span className="text-charcoal font-semibold">{selectedStudentObj.roll_number || 'N/A'}</span></p>
                      <p>ID: <span className="text-charcoal font-semibold font-mono">{selectedStudentObj.student_id.slice(0, 8)}...</span></p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs">Select a student from the dropdown to preview and generate their card.</p>
                )}
              </div>
              <button
                onClick={handleDownloadSingle}
                disabled={!selectedStudentId || loadingReportCard || !reportCard}
                className="w-full py-3 px-4 bg-primary text-white hover:bg-primary-alt disabled:opacity-50 disabled:hover:bg-primary rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Report PDF
              </button>
            </div>
          )}

          <div className="border-t border-light-gray/40 pt-4">
            <h4 className="text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Quick Links</h4>
            <div className="space-y-1.5 text-xs text-primary font-medium font-caption">
              <Link href="/dashboard/results" className="block hover:underline">&larr; Back to Results Dashboard</Link>
              <Link href="/dashboard/results/marks-entry" className="block hover:underline">Subject-wise Marks Entry &rarr;</Link>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Report Card Preview */}
        <div className="xl:col-span-3">
          {loadingReportCard ? (
            <div className="p-12 bg-white border border-light-gray/60 rounded-2xl shadow-sm text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-steel-gray text-sm font-caption">Fetching report card data and layout details...</p>
            </div>
          ) : isAllSelected ? (
            <div className="p-8 bg-white border border-light-gray/60 rounded-2xl shadow-sm text-center text-steel-gray font-body space-y-4">
              <div className="w-16 h-16 bg-cream/10 border border-light-gray/40 rounded-full flex items-center justify-center mx-auto text-primary">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-charcoal font-heading">Section-wide Document Compilation</h3>
              <p className="text-sm max-w-lg mx-auto">
                Interactive previews are disabled when all students are selected. 
                Use the **Download Section PDF** button on the left to export the combined multi-page report card roster.
              </p>
            </div>
          ) : reportCard ? (
            /* Premium Report Card Layout Mockup */
            <div className="bg-white border border-light-gray/80 rounded-2xl shadow-md overflow-hidden relative font-body max-w-4xl mx-auto">
              
              {/* Header Design */}
              <div className="p-6 border-b border-light-gray/60 flex flex-col md:flex-row justify-between items-center gap-4 bg-cream/5">
                <div className="flex items-center gap-4">
                  {/* Mock school logo placeholder */}
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center text-primary font-bold text-xl font-heading shadow-sm">
                    SS
                  </div>
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-black text-primary tracking-tight font-heading leading-tight">GURUKUL SHIKSHALAYA</h2>
                    <p className="text-[11px] text-steel-gray font-caption tracking-wider uppercase font-semibold mt-0.5">Sow the seeds of character, reap a harvest of wisdom</p>
                    <p className="text-[10px] text-steel-gray/80 font-caption">Main Campus, Sector 12, Dwarka, New Delhi</p>
                  </div>
                </div>
                <div className="text-center md:text-right border-l md:border-l-0 md:border-r border-light-gray/60 px-4 md:px-0 md:pr-4 py-1">
                  <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg font-caption uppercase tracking-wider">
                    REPORT CARD
                  </span>
                  <p className="text-xs text-charcoal font-bold mt-2 font-heading">{terms.find(t => t.id === selectedTermId)?.name || 'Term 1'}</p>
                  <p className="text-[10px] text-steel-gray font-caption">Session: {initialYears.find(y => y.id === selectedYearId)?.label || '2026-27'}</p>
                </div>
              </div>

              {/* Student info grid */}
              <div className="p-5 bg-cream/10 border-b border-light-gray/40 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-body">
                <div>
                  <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Student Name</p>
                  <p className="font-bold text-charcoal mt-1 text-sm">{reportCard.student.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Roll Number</p>
                  <p className="font-semibold text-charcoal mt-1">{reportCard.student.roll_number || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Class & Section</p>
                  <p className="font-semibold text-charcoal mt-1">{reportCard.student.class_name} - {reportCard.student.section_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Student Code</p>
                  <p className="font-semibold text-charcoal mt-1 font-mono">{reportCard.student.student_code}</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Core subjects table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption border-b border-light-gray/40 pb-1.5">Core Subjects</h3>
                  <div className="overflow-x-auto border border-light-gray/60 rounded-xl">
                    <table className="min-w-full divide-y divide-light-gray/60 text-left text-xs font-body">
                      <thead className="bg-cream/10 text-charcoal font-semibold">
                        <tr>
                          <th scope="col" className="px-4 py-3">Subject</th>
                          <th scope="col" className="px-4 py-3">Code</th>
                          <th scope="col" className="px-4 py-3">Exam Name</th>
                          <th scope="col" className="px-4 py-3 text-center">Max Marks</th>
                          <th scope="col" className="px-4 py-3 text-center">Passing Marks</th>
                          <th scope="col" className="px-4 py-3 text-center">Obtained</th>
                          <th scope="col" className="px-4 py-3 text-center">Grade</th>
                          <th scope="col" className="px-4 py-3 text-center">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-light-gray/40 text-charcoal">
                        {coreSubjects.length > 0 ? (
                          coreSubjects.map((sub, index) => (
                            <tr key={index} className="hover:bg-cream/5 transition-colors">
                              <td className="px-4 py-2.5 font-semibold">{sub.subject_name}</td>
                              <td className="px-4 py-2.5 font-mono">{sub.subject_code || '—'}</td>
                              <td className="px-4 py-2.5 text-steel-gray">{sub.exam_name || '—'}</td>
                              <td className="px-4 py-2.5 text-center font-semibold">{sub.total_marks ?? '—'}</td>
                              <td className="px-4 py-2.5 text-center text-steel-gray">{sub.passing_marks ?? '—'}</td>
                              <td className="px-4 py-2.5 text-center font-bold">
                                {sub.marks_obtained !== null ? sub.marks_obtained : <span className="text-steel-gray/60">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold ${sub.grade === 'F' ? 'text-red-600 bg-red-50' : 'text-charcoal'}`}>
                                  {sub.grade || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {sub.status === 'Pass' && <span className="text-green-600 font-bold font-caption text-[10px] bg-green-50 px-2 py-0.5 rounded-full">PASS</span>}
                                {sub.status === 'Fail' && <span className="text-red-600 font-bold font-caption text-[10px] bg-red-50 px-2 py-0.5 rounded-full">FAIL</span>}
                                {sub.status === 'Pending' && <span className="text-steel-gray font-bold font-caption text-[10px] bg-light-gray/30 px-2 py-0.5 rounded-full">PENDING</span>}
                                {sub.status === 'No Exam' && <span className="text-steel-gray font-bold font-caption text-[10px]">NO EXAM</span>}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-6 text-center text-steel-gray font-caption">No core subjects configured for this section.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Elective subjects table */}
                {electiveSubjects.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption border-b border-light-gray/40 pb-1.5">Elective Subjects</h3>
                    <div className="overflow-x-auto border border-light-gray/60 rounded-xl">
                      <table className="min-w-full divide-y divide-light-gray/60 text-left text-xs font-body">
                        <thead className="bg-cream/10 text-charcoal font-semibold">
                          <tr>
                            <th scope="col" className="px-4 py-3">Subject</th>
                            <th scope="col" className="px-4 py-3">Code</th>
                            <th scope="col" className="px-4 py-3">Exam Name</th>
                            <th scope="col" className="px-4 py-3 text-center">Max Marks</th>
                            <th scope="col" className="px-4 py-3 text-center">Passing Marks</th>
                            <th scope="col" className="px-4 py-3 text-center">Obtained</th>
                            <th scope="col" className="px-4 py-3 text-center">Grade</th>
                            <th scope="col" className="px-4 py-3 text-center">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-light-gray/40 text-charcoal">
                          {electiveSubjects.map((sub, index) => (
                            <tr key={index} className="hover:bg-cream/5 transition-colors">
                              <td className="px-4 py-2.5 font-semibold">{sub.subject_name}</td>
                              <td className="px-4 py-2.5 font-mono">{sub.subject_code || '—'}</td>
                              <td className="px-4 py-2.5 text-steel-gray">{sub.exam_name || '—'}</td>
                              <td className="px-4 py-2.5 text-center font-semibold">{sub.total_marks ?? '—'}</td>
                              <td className="px-4 py-2.5 text-center text-steel-gray">{sub.passing_marks ?? '—'}</td>
                              <td className="px-4 py-2.5 text-center font-bold">
                                {sub.marks_obtained !== null ? sub.marks_obtained : <span className="text-steel-gray/60">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold ${sub.grade === 'F' ? 'text-red-600 bg-red-50' : 'text-charcoal'}`}>
                                  {sub.grade || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {sub.status === 'Pass' && <span className="text-green-600 font-bold font-caption text-[10px] bg-green-50 px-2 py-0.5 rounded-full">PASS</span>}
                                {sub.status === 'Fail' && <span className="text-red-600 font-bold font-caption text-[10px] bg-red-50 px-2 py-0.5 rounded-full">FAIL</span>}
                                {sub.status === 'Pending' && <span className="text-steel-gray font-bold font-caption text-[10px] bg-light-gray/30 px-2 py-0.5 rounded-full">PENDING</span>}
                                {sub.status === 'No Exam' && <span className="text-steel-gray font-bold font-caption text-[10px]">NO EXAM</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Footer summary band */}
                <div className="border border-primary/20 bg-primary/5 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                  <div className="text-center border-r border-light-gray/40 last:border-r-0 py-1">
                    <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Total (Core)</p>
                    <p className="text-base font-bold text-charcoal mt-1">
                      {reportCard.aggregates ? `${reportCard.aggregates.total_obtained} / ${reportCard.aggregates.total_max}` : '—'}
                    </p>
                  </div>
                  <div className="text-center border-r border-light-gray/40 last:border-r-0 py-1">
                    <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Percentage</p>
                    <p className="text-base font-bold text-charcoal mt-1">
                      {reportCard.aggregates ? `${reportCard.aggregates.percentage}%` : '—'}
                    </p>
                  </div>
                  <div className="text-center border-r border-light-gray/40 last:border-r-0 py-1">
                    <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Overall Grade</p>
                    <p className="text-base font-black text-primary mt-1 font-heading">
                      {reportCard.aggregates ? reportCard.aggregates.overall_grade : '—'}
                    </p>
                  </div>
                  <div className="text-center border-r border-light-gray/40 last:border-r-0 py-1">
                    <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Section Rank</p>
                    <p className="text-base font-bold text-charcoal mt-1">
                      {reportCard.rank.position === 'Pending' ? (
                        <span className="text-steel-gray font-medium text-xs font-caption">Rank Pending</span>
                      ) : (
                        `${reportCard.rank.position} / ${reportCard.rank.total_students}`
                      )}
                    </p>
                  </div>
                  <div className="text-center py-1 col-span-2 md:col-span-1">
                    <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Status</p>
                    <div className="mt-1">
                      {reportCard.aggregates ? (
                        reportCard.aggregates.is_passed ? (
                          <span className="inline-block px-4 py-1.5 bg-green-600 text-white text-xs font-black rounded-lg font-caption tracking-wider">PASSED</span>
                        ) : (
                          <span className="inline-block px-4 py-1.5 bg-red-600 text-white text-xs font-black rounded-lg font-caption tracking-wider">FAILED</span>
                        )
                      ) : (
                        <span className="inline-block px-4 py-1.5 bg-light-gray text-steel-gray text-xs font-semibold rounded-lg font-caption">PENDING</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remarks & Signatures */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-light-gray/40 pt-6">
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Class Teacher's Remarks</p>
                    <div className="mt-2 p-3 bg-cream/10 border border-light-gray/60 rounded-xl h-20 text-xs font-body text-charcoal/80 flex items-start">
                      {/* Placeholder text for mockup */}
                      <span>{reportCard.aggregates?.is_passed ? 'Demonstrates a strong understanding of core concepts. Keeps up with coursework and participates actively. Consistent effort shown.' : 'Needs improvement in core subjects. Encouraged to pay closer attention to class assignments and seek help in weaker areas.'}</span>
                    </div>
                  </div>
                  <div className="col-span-1 flex flex-col justify-end space-y-8 font-caption text-xs text-steel-gray text-center font-medium">
                    <div className="space-y-1">
                      <div className="w-full border-b border-light-gray/80 pb-1 h-8"></div>
                      <p>Class Teacher Signature</p>
                    </div>
                    <div className="space-y-1">
                      <div className="w-full border-b border-light-gray/80 pb-1 h-8"></div>
                      <p>Principal Signature</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="p-12 bg-white border border-light-gray/60 rounded-2xl shadow-sm text-center text-steel-gray font-body space-y-4">
              <div className="w-16 h-16 bg-cream/10 border border-light-gray/40 rounded-full flex items-center justify-center mx-auto text-primary">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-charcoal font-heading">Report Card Interactive Preview</h3>
              <p className="text-sm max-w-md mx-auto">
                No student is selected. Choose an Academic Year, Class, Term, Section, and Student from the selectors above to inspect records and preview the printed design.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
