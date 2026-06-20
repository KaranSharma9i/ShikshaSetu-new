'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getExamTermsAction,
  getSectionsAction,
  getSectionSummaryAction
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

interface StudentSummary {
  student_id: string
  roll_number: string | number | null
  full_name: string
  student_code: string
  total_obtained: number | null
  total_max: number | null
  percentage: number | null
  overall_grade: string | null
  is_passed: boolean | null
  is_incomplete: boolean
  rank: number | string
}

interface SectionSummaryData {
  sectionName: string
  className: string
  academicYearLabel: string
  termName: string
  examsCount: number
  isRankFinalized: boolean
  students: StudentSummary[]
}

interface ClassSummaryClientProps {
  initialYears: AcademicYear[]
  initialClasses: ClassItem[]
}

type SortField = 'roll' | 'name' | 'rank'
type SortOrder = 'asc' | 'desc'

export default function ClassSummaryClient({ initialYears, initialClasses }: ClassSummaryClientProps) {
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

  // Roster / Table State
  const [summaryData, setSummaryData] = useState<SectionSummaryData | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

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
          setSelectedTermId('legacy') // fallback to legacy/ungrouped if none
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
    setSummaryData(null)
  }, [selectedYearId, selectedClassId])

  // 2. Fetch Summary Data when Section or Term changes
  useEffect(() => {
    if (!selectedSectionId || !selectedYearId || !selectedTermId) {
      setSummaryData(null)
      return
    }

    async function loadSummaryData() {
      setLoadingSummary(true)
      setErrorMsg(null)
      const res = await getSectionSummaryAction(
        selectedYearId,
        selectedTermId === 'legacy' ? null : selectedTermId,
        selectedSectionId
      )
      setLoadingSummary(false)

      if (res.success && res.data) {
        setSummaryData(res.data as SectionSummaryData)
        // Default sort should be by rank if finalized, otherwise fallback to roll
        const isFinalized = (res.data as SectionSummaryData).isRankFinalized
        setSortField(isFinalized ? 'rank' : 'roll')
        setSortOrder('asc')
      } else {
        setErrorMsg(res.error || 'Failed to load class summary data.')
        setSummaryData(null)
      }
    }

    loadSummaryData()
  }, [selectedSectionId, selectedYearId, selectedTermId])

  // Handlers for PDF generation
  const handleDownloadPDF = () => {
    if (!selectedSectionId || !selectedYearId || !selectedTermId) return
    const termParam = selectedTermId === 'legacy' ? 'null' : selectedTermId
    window.open(
      `/api/reports/class-summary?sectionId=${selectedSectionId}&academicYearId=${selectedYearId}&termId=${termParam}`,
      '_blank'
    )
  }

  // Sorting Logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getSortedStudents = () => {
    if (!summaryData) return []
    const students = [...summaryData.students]

    return students.sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      if (sortField === 'roll') {
        valA = Number(a.roll_number) || 999999
        valB = Number(b.roll_number) || 999999
      } else if (sortField === 'name') {
        valA = a.full_name.toLowerCase()
        valB = b.full_name.toLowerCase()
      } else if (sortField === 'rank') {
        const isAFinal = typeof a.rank === 'number'
        const isBFinal = typeof b.rank === 'number'
        if (isAFinal && isBFinal) {
          valA = a.rank
          valB = b.rank
        } else if (isAFinal) {
          return -1 // A comes first
        } else if (isBFinal) {
          return 1 // B comes first
        } else {
          // Fallback to roll number if both are pending
          valA = Number(a.roll_number) || 999999
          valB = Number(b.roll_number) || 999999
        }
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const sortedStudents = getSortedStudents()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 bg-white border border-light-gray/60 p-5 rounded-2xl shadow-sm space-y-5 h-fit">
        <h3 className="text-base font-bold text-charcoal font-heading flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h3>

        {/* Academic Year */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption">Academic Year</label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full text-xs font-semibold p-2.5 bg-cream/10 border border-light-gray/80 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none text-charcoal"
          >
            {initialYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label} {y.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Class Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full text-xs font-semibold p-2.5 bg-cream/10 border border-light-gray/80 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none text-charcoal"
          >
            {initialClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Term Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption flex items-center justify-between">
            <span>Exam Term</span>
            {loadingTerms && <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full"></span>}
          </label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            disabled={loadingTerms}
            className="w-full text-xs font-semibold p-2.5 bg-cream/10 border border-light-gray/80 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none text-charcoal disabled:opacity-50"
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="legacy">Ungrouped (legacy)</option>
          </select>
        </div>

        {/* Section Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption flex items-center justify-between">
            <span>Section</span>
            {loadingSections && <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full"></span>}
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={loadingSections || sections.length === 0}
            className="w-full text-xs font-semibold p-2.5 bg-cream/10 border border-light-gray/80 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none text-charcoal disabled:opacity-50"
          >
            {sections.length === 0 ? (
              <option value="">No Sections Available</option>
            ) : (
              sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <button
            onClick={handleDownloadPDF}
            disabled={loadingSummary || !summaryData || summaryData.students.length === 0}
            className="w-full flex items-center justify-center gap-2 p-3 bg-primary hover:bg-primary/95 disabled:bg-steel-gray/30 text-white disabled:text-steel-gray/60 font-bold text-xs font-caption tracking-wider rounded-xl transition-all duration-300 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Summary PDF
          </button>
        </div>

        <div className="border-t border-light-gray/40 pt-4 flex flex-col gap-2">
          <Link
            href="/dashboard/results"
            className="text-center text-xs font-bold text-steel-gray hover:text-charcoal transition-colors py-2 bg-light-gray/20 hover:bg-light-gray/30 rounded-xl"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3 space-y-6">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold">{errorMsg}</p>
          </div>
        )}

        {/* Loader State */}
        {loadingSummary ? (
          <div className="bg-white border border-light-gray/60 p-8 rounded-2xl shadow-sm text-center py-20 space-y-4">
            <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full inline-block"></span>
            <p className="text-xs text-steel-gray font-semibold font-caption">Fetching section results and compiling sheet...</p>
          </div>
        ) : summaryData ? (
          <div className="space-y-6">
            {/* Header info card */}
            <div className="bg-white border border-light-gray/60 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-charcoal font-heading leading-tight">
                  Class {summaryData.className} — Section {summaryData.sectionName}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-steel-gray font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-primary/20 rounded-full inline-block"></span>
                    Term: {summaryData.termName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-primary/20 rounded-full inline-block"></span>
                    Session: {summaryData.academicYearLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-primary/20 rounded-full inline-block"></span>
                    Exams Tracked: {summaryData.examsCount} core
                  </span>
                </div>
              </div>

              <div className="px-4 py-2 border border-primary/20 bg-primary/5 rounded-xl text-center">
                <p className="text-[10px] text-steel-gray uppercase font-bold tracking-wider font-caption">Total Students</p>
                <p className="text-2xl font-black text-primary font-heading mt-0.5">{summaryData.students.length}</p>
              </div>
            </div>

            {/* Rank finalized notice */}
            {!summaryData.isRankFinalized && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-bold text-amber-900">Rank Calculation Pending</h4>
                  <p className="mt-1 leading-relaxed text-amber-800/90 font-medium">
                    Section ranks are currently hidden and marked as **Pending** because one or more students have missing results in core subjects. Enter all marks in **Subject-wise Marks Entry** to unlock ranking.
                  </p>
                </div>
              </div>
            )}

            {/* Roster Table */}
            <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-light-gray/60 text-left text-xs font-body">
                  <thead className="bg-cream/10 text-charcoal font-bold select-none">
                    <tr>
                      <th
                        onClick={() => handleSort('roll')}
                        scope="col"
                        className="px-6 py-4 cursor-pointer hover:bg-cream/20 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Roll No
                          {sortField === 'roll' ? (
                            sortOrder === 'asc' ? '↑' : '↓'
                          ) : (
                            <span className="text-steel-gray/30 font-normal">⇅</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('name')}
                        scope="col"
                        className="px-6 py-4 cursor-pointer hover:bg-cream/20 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Student Name
                          {sortField === 'name' ? (
                            sortOrder === 'asc' ? '↑' : '↓'
                          ) : (
                            <span className="text-steel-gray/30 font-normal">⇅</span>
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4">Student Code</th>
                      <th scope="col" className="px-6 py-4 text-center">Total (Core)</th>
                      <th scope="col" className="px-6 py-4 text-center">Max Marks</th>
                      <th scope="col" className="px-6 py-4 text-center">Percentage</th>
                      <th scope="col" className="px-6 py-4 text-center">Grade</th>
                      <th
                        onClick={() => handleSort('rank')}
                        scope="col"
                        className="px-6 py-4 text-center cursor-pointer hover:bg-cream/20 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Rank
                          {sortField === 'rank' ? (
                            sortOrder === 'asc' ? '↑' : '↓'
                          ) : (
                            <span className="text-steel-gray/30 font-normal">⇅</span>
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray/40 text-charcoal">
                    {sortedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-steel-gray font-caption font-semibold">
                          No students enrolled in this section for the selected session.
                        </td>
                      </tr>
                    ) : (
                      sortedStudents.map((st) => (
                        <tr
                          key={st.student_id}
                          className={`hover:bg-cream/5 transition-colors ${st.is_incomplete ? 'bg-amber-50/30' : ''}`}
                        >
                          <td className="px-6 py-3.5 font-semibold">{st.roll_number || '—'}</td>
                          <td className="px-6 py-3.5 font-bold">
                            <div>
                              <p className="text-charcoal">{st.full_name}</p>
                              {st.is_incomplete && (
                                <span className="inline-block mt-0.5 text-[9px] text-amber-700 bg-amber-100/50 px-1.5 py-0.5 rounded font-medium uppercase font-caption">
                                  Marks Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 font-mono text-steel-gray">{st.student_code}</td>
                          <td className="px-6 py-3.5 text-center font-semibold">
                            {st.total_obtained !== null ? st.total_obtained : '—'}
                          </td>
                          <td className="px-6 py-3.5 text-center text-steel-gray">
                            {st.total_max !== null ? st.total_max : '—'}
                          </td>
                          <td className="px-6 py-3.5 text-center font-bold">
                            {st.percentage !== null ? `${st.percentage}%` : '—'}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            {st.overall_grade ? (
                              <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold ${st.overall_grade === 'F' ? 'text-red-600 bg-red-50' : 'text-charcoal'}`}>
                                {st.overall_grade}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-3.5 text-center font-bold">
                            {st.rank === 'Pending' ? (
                              <span className="text-[10px] text-steel-gray font-semibold font-caption px-2 py-0.5 bg-light-gray/30 rounded-full">
                                PENDING
                              </span>
                            ) : (
                              st.rank
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            {st.is_incomplete ? (
                              <span className="text-steel-gray font-bold font-caption text-[10px] bg-light-gray/30 px-2.5 py-0.5 rounded-full">
                                PENDING
                              </span>
                            ) : st.is_passed ? (
                              <span className="text-green-600 font-bold font-caption text-[10px] bg-green-50 px-2.5 py-0.5 rounded-full">
                                PASS
                              </span>
                            ) : (
                              <span className="text-red-600 font-bold font-caption text-[10px] bg-red-50 px-2.5 py-0.5 rounded-full">
                                FAIL
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-light-gray/60 p-12 rounded-2xl shadow-sm text-center py-20 space-y-3">
            <svg className="w-12 h-12 text-steel-gray/40 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-base font-bold text-charcoal font-heading">No Section Selected</h3>
            <p className="text-xs text-steel-gray font-semibold font-caption max-w-sm mx-auto leading-relaxed">
              Use the sidebar filters on the left to select an academic year, class, term, and section to populate the result summary sheet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
