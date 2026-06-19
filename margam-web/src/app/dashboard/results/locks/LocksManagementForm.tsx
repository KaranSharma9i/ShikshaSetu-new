'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  getExamTermsAction,
  getExamsLockDetailsAction,
  bulkLockExamsAction,
  bulkUnlockExamsAction
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

interface ExamLockDetail {
  id: string
  exam_name: string
  exam_date: string
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
  locked_by_name: string | null
  subject_name: string
  subject_code: string
  entered_results_count: number
  enrolled_students_count: number
}

interface LocksManagementFormProps {
  initialYears: AcademicYear[]
  initialClasses: ClassItem[]
}

export default function LocksManagementForm({ initialYears, initialClasses }: LocksManagementFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Selectors State
  const [selectedYearId, setSelectedYearId] = useState<string>(
    initialYears.find(y => y.is_current)?.id || (initialYears[0]?.id || '')
  )
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClasses[0]?.id || '')
  
  const [terms, setTerms] = useState<ExamTerm[]>([])
  const [selectedTermId, setSelectedTermId] = useState<string>('all')
  const [loadingTerms, setLoadingTerms] = useState(false)

  const [exams, setExams] = useState<ExamLockDetail[]>([])
  const [loadingExams, setLoadingExams] = useState(false)

  // Selection & Search State
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'locked' | 'open'>('all')
  const [sortBy, setSortBy] = useState<'subject' | 'exam_name' | 'date' | 'status' | 'progress'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Modals & Notifications State
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmActionType, setConfirmActionType] = useState<'lock' | 'unlock'>('lock')
  const [actionExams, setActionExams] = useState<ExamLockDetail[]>([])

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
    setExams([])
    setSelectedExamIds([])
  }, [selectedYearId, selectedClassId])

  // 2. Fetch Exams when Year, Class, or Term changes
  const loadExams = async () => {
    if (!selectedYearId || !selectedClassId) {
      setExams([])
      setSelectedExamIds([])
      return
    }

    setLoadingExams(true)
    setErrorMsg(null)
    const termParam = selectedTermId === 'all' ? 'all' : selectedTermId === 'legacy' ? 'legacy' : selectedTermId
    const res = await getExamsLockDetailsAction(selectedYearId, selectedClassId, termParam)
    setLoadingExams(false)
    if (res.success && res.data) {
      setExams(res.data as ExamLockDetail[])
    } else {
      setErrorMsg(res.error || 'Failed to load exams.')
    }
    setSelectedExamIds([])
  }

  useEffect(() => {
    loadExams()
  }, [selectedYearId, selectedClassId, selectedTermId])

  // Handle Select All Checkbox
  const handleSelectAll = (checked: boolean, filteredList: ExamLockDetail[]) => {
    if (checked) {
      const allIds = filteredList.map(e => e.id)
      setSelectedExamIds(allIds)
    } else {
      setSelectedExamIds([])
    }
  }

  // Handle Single Checkbox Toggle
  const handleSelectRow = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedExamIds(prev => [...prev, id])
    } else {
      setSelectedExamIds(prev => prev.filter(item => item !== id))
    }
  }

  // Prepare Lock/Unlock Action
  const triggerAction = (type: 'lock' | 'unlock', targetExams: ExamLockDetail[]) => {
    setConfirmActionType(type)
    setActionExams(targetExams)
    setShowConfirmModal(true)
  }

  // Execute Lock/Unlock Server Action
  const handleConfirmAction = () => {
    const examIds = actionExams.map(e => e.id)
    setShowConfirmModal(false)
    
    startTransition(async () => {
      setErrorMsg(null)
      setSuccessMsg(null)
      
      let res
      if (confirmActionType === 'lock') {
        res = await bulkLockExamsAction(examIds)
      } else {
        res = await bulkUnlockExamsAction(examIds)
      }

      if (res.success) {
        setSuccessMsg(`Successfully ${confirmActionType === 'lock' ? 'locked' : 'unlocked'} ${res.count} exam(s).`)
        loadExams()
        router.refresh()
      } else {
        setErrorMsg(res.error || `Failed to ${confirmActionType} exams.`)
      }
    })
  }

  // Formatting helper for Date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Filter and Sort in memory
  const filteredExams = exams
    .filter(exam => {
      // Text Search
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        exam.exam_name.toLowerCase().includes(searchLower) ||
        exam.subject_name.toLowerCase().includes(searchLower) ||
        exam.subject_code.toLowerCase().includes(searchLower)
      
      // Status Filter
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'locked' && exam.is_locked) ||
        (statusFilter === 'open' && !exam.is_locked)

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === 'subject') {
        comparison = a.subject_name.localeCompare(b.subject_name)
      } else if (sortBy === 'exam_name') {
        comparison = a.exam_name.localeCompare(b.exam_name)
      } else if (sortBy === 'date') {
        comparison = new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
      } else if (sortBy === 'status') {
        comparison = (a.is_locked ? 1 : 0) - (b.is_locked ? 0 : 1)
      } else if (sortBy === 'progress') {
        const aPct = a.enrolled_students_count > 0 ? a.entered_results_count / a.enrolled_students_count : 0
        const bPct = b.enrolled_students_count > 0 ? b.entered_results_count / b.enrolled_students_count : 0
        comparison = aPct - bPct
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Sorting Handler
  const requestSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  // Summary Metrics
  const totalExamsCount = exams.length
  const lockedCount = exams.filter(e => e.is_locked).length
  const openCount = totalExamsCount - lockedCount
  
  let totalEntered = 0
  let totalEnrolled = 0
  exams.forEach(e => {
    totalEntered += e.entered_results_count
    totalEnrolled += e.enrolled_students_count
  })
  const overallProgressPercent = totalEnrolled > 0 ? Math.round((totalEntered / totalEnrolled) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{successMsg}</div>
        </div>
      )}

      {/* Selectors Bar */}
      <div className="p-6 bg-white border border-light-gray/60 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-bold text-steel-gray tracking-wider uppercase mb-2">Academic Year</label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full h-11 px-4 border border-light-gray rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-charcoal transition-all"
          >
            {initialYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label} {y.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-steel-gray tracking-wider uppercase mb-2">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full h-11 px-4 border border-light-gray rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-charcoal transition-all"
          >
            <option value="" disabled>Select Class</option>
            {initialClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-steel-gray tracking-wider uppercase mb-2">Term</label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            disabled={loadingTerms}
            className="w-full h-11 px-4 border border-light-gray rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-charcoal transition-all disabled:bg-light-gray/30 disabled:text-steel-gray/60"
          >
            <option value="all">All Terms</option>
            <option value="legacy">Ungrouped (legacy)</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      {selectedClassId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total */}
          <div className="p-5 bg-white border border-light-gray/60 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary/5 text-primary rounded-xl shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-steel-gray tracking-wider uppercase">Total Exams</p>
              <h3 className="text-2xl font-bold text-charcoal mt-1">{loadingExams ? '...' : totalExamsCount}</h3>
            </div>
          </div>

          {/* Card 2: Locked */}
          <div className="p-5 bg-white border border-light-gray/60 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-steel-gray tracking-wider uppercase">Locked Exams</p>
              <h3 className="text-2xl font-bold text-charcoal mt-1">{loadingExams ? '...' : lockedCount}</h3>
            </div>
          </div>

          {/* Card 3: Open */}
          <div className="p-5 bg-white border border-light-gray/60 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-steel-gray tracking-wider uppercase">Open Exams</p>
              <h3 className="text-2xl font-bold text-charcoal mt-1">{loadingExams ? '...' : openCount}</h3>
            </div>
          </div>

          {/* Card 4: Progress */}
          <div className="p-5 bg-white border border-light-gray/60 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-steel-gray tracking-wider uppercase">Entry Progress</p>
              <span className="text-xs font-bold text-primary">{loadingExams ? '...' : `${overallProgressPercent}%`}</span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-light-gray/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${overallProgressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-steel-gray mt-2 font-medium">
                {loadingExams ? 'Loading marks counts...' : `${totalEntered} / ${totalEnrolled} total marks entered`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      {selectedClassId && (
        <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
          {/* Controls Header */}
          <div className="p-5 border-b border-light-gray/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Status Tabs */}
              <div className="inline-flex p-1 bg-light-gray/40 rounded-xl">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === 'all' ? 'bg-white text-charcoal shadow-sm' : 'text-steel-gray hover:text-charcoal'
                  }`}
                >
                  All ({totalExamsCount})
                </button>
                <button
                  onClick={() => setStatusFilter('locked')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === 'locked' ? 'bg-white text-charcoal shadow-sm' : 'text-steel-gray hover:text-charcoal'
                  }`}
                >
                  Locked ({lockedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('open')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === 'open' ? 'bg-white text-charcoal shadow-sm' : 'text-steel-gray hover:text-charcoal'
                  }`}
                >
                  Open ({openCount})
                </button>
              </div>

              {/* Text Search */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-steel-gray/60">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search subject or exam..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border border-light-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm placeholder:text-steel-gray/50 text-charcoal"
                />
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedExamIds.length > 0 && (
              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-right-3 duration-200">
                <span className="text-xs font-bold text-primary font-caption">
                  {selectedExamIds.length} Selected
                </span>
                <div className="h-4 w-px bg-primary/20" />
                <button
                  onClick={() => {
                    const selectedExams = exams.filter(e => selectedExamIds.includes(e.id))
                    const unlockedSelected = selectedExams.filter(e => !e.is_locked)
                    if (unlockedSelected.length === 0) {
                      setErrorMsg("All selected exams are already locked.")
                      return
                    }
                    triggerAction('lock', unlockedSelected)
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Lock
                </button>
                <button
                  onClick={() => {
                    const selectedExams = exams.filter(e => selectedExamIds.includes(e.id))
                    const lockedSelected = selectedExams.filter(e => e.is_locked)
                    if (lockedSelected.length === 0) {
                      setErrorMsg("All selected exams are already open.")
                      return
                    }
                    triggerAction('unlock', lockedSelected)
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock
                </button>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto relative">
            {loadingExams ? (
              <div className="p-20 text-center text-steel-gray flex flex-col items-center justify-center gap-4 bg-white">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-sm font-medium">Fetching exam lock dashboard details...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="p-20 text-center bg-white flex flex-col items-center justify-center">
                <div className="p-4 bg-light-gray/40 rounded-full text-steel-gray mb-4">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-charcoal font-heading">No Exams Found</h4>
                <p className="text-xs text-steel-gray mt-1 max-w-sm leading-relaxed font-caption">
                  We couldn't find any exams matching your search query or status filter for the selected class and term.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-light-gray/20 text-xs font-bold text-steel-gray uppercase tracking-wider border-b border-light-gray/60">
                    <th className="py-4.5 px-6 w-12">
                      <input
                        type="checkbox"
                        checked={filteredExams.length > 0 && selectedExamIds.length === filteredExams.length}
                        onChange={(e) => handleSelectAll(e.target.checked, filteredExams)}
                        className="w-4.5 h-4.5 text-primary border-light-gray rounded focus:ring-primary/20 transition-all cursor-pointer"
                      />
                    </th>
                    <th className="py-4.5 px-4 cursor-pointer hover:text-charcoal select-none transition-colors" onClick={() => requestSort('subject')}>
                      <span className="flex items-center gap-1.5">
                        Subject
                        {sortBy === 'subject' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </th>
                    <th className="py-4.5 px-4 cursor-pointer hover:text-charcoal select-none transition-colors" onClick={() => requestSort('exam_name')}>
                      <span className="flex items-center gap-1.5">
                        Exam Name
                        {sortBy === 'exam_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </th>
                    <th className="py-4.5 px-4 cursor-pointer hover:text-charcoal select-none transition-colors" onClick={() => requestSort('date')}>
                      <span className="flex items-center gap-1.5">
                        Exam Date
                        {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </th>
                    <th className="py-4.5 px-4 cursor-pointer hover:text-charcoal select-none transition-colors" onClick={() => requestSort('status')}>
                      <span className="flex items-center gap-1.5">
                        Lock Status
                        {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </th>
                    <th className="py-4.5 px-4 cursor-pointer hover:text-charcoal select-none transition-colors" onClick={() => requestSort('progress')}>
                      <span className="flex items-center gap-1.5">
                        Entry Progress
                        {sortBy === 'progress' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray/40 text-sm font-medium text-charcoal">
                  {filteredExams.map((exam) => {
                    const isChecked = selectedExamIds.includes(exam.id)
                    const isFullyEntered = exam.entered_results_count === exam.enrolled_students_count && exam.enrolled_students_count > 0
                    const isPartialEntered = exam.entered_results_count > 0 && exam.entered_results_count < exam.enrolled_students_count
                    const progressPercent = exam.enrolled_students_count > 0 ? Math.round((exam.entered_results_count / exam.enrolled_students_count) * 100) : 0

                    return (
                      <tr
                        key={exam.id}
                        className={`hover:bg-cream/5 transition-colors duration-150 ${isChecked ? 'bg-primary/5' : ''}`}
                      >
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleSelectRow(e.target.checked, exam.id)}
                            className="w-4.5 h-4.5 text-primary border-light-gray rounded focus:ring-primary/20 transition-all cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-charcoal">{exam.subject_name}</div>
                          <div className="text-xs text-steel-gray mt-0.5 font-caption font-semibold">{exam.subject_code}</div>
                        </td>
                        <td className="py-4 px-4 font-normal text-steel-gray">{exam.exam_name}</td>
                        <td className="py-4 px-4 text-steel-gray font-normal">{formatDate(exam.exam_date)}</td>
                        <td className="py-4 px-4">
                          {exam.is_locked ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-lg select-none">
                                <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Locked
                              </span>
                              {exam.locked_by_name && (
                                <p className="text-[10px] text-steel-gray font-medium leading-tight font-caption pl-0.5">
                                  By {exam.locked_by_name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg select-none">
                              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                              Open
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="w-36 space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className={
                                isFullyEntered ? 'text-emerald-700' : isPartialEntered ? 'text-amber-700' : 'text-steel-gray/70'
                              }>
                                {exam.entered_results_count} / {exam.enrolled_students_count}
                              </span>
                              <span className="text-[10px] text-steel-gray font-caption font-semibold">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-light-gray/40 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isFullyEntered ? 'bg-emerald-600' : isPartialEntered ? 'bg-amber-500' : 'bg-steel-gray/30'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {exam.is_locked ? (
                            <button
                              disabled={isPending}
                              onClick={() => triggerAction('unlock', [exam])}
                              className="px-3 py-1.5 text-xs font-bold border border-emerald-200 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50 text-emerald-700 rounded-lg transition-all cursor-pointer shadow-sm inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                              Unlock
                            </button>
                          ) : (
                            <button
                              disabled={isPending}
                              onClick={() => triggerAction('lock', [exam])}
                              className="px-3 py-1.5 text-xs font-bold border border-rose-200 hover:border-rose-500 bg-rose-50/20 hover:bg-rose-50 text-rose-700 rounded-lg transition-all cursor-pointer shadow-sm inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Lock
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-light-gray/60 rounded-3xl max-w-lg w-full overflow-hidden shadow-xl animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Modal Header */}
            <div className={`p-6 text-white flex items-center gap-4 ${
              confirmActionType === 'lock' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              <div className="p-3 bg-white/10 rounded-2xl shrink-0">
                {confirmActionType === 'lock' ? (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading">
                  Confirm Bulk {confirmActionType === 'lock' ? 'Locking' : 'Unlocking'}
                </h3>
                <p className="text-white/80 text-xs font-caption mt-0.5">
                  You are about to modify {actionExams.length} exam record(s)
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 flex-1">
              <p className="text-sm font-medium text-steel-gray leading-relaxed">
                {confirmActionType === 'lock' 
                  ? 'Locking these exams will freeze their scores. No further marks entries or updates can be made by teachers or admins.' 
                  : 'Unlocking these exams will re-enable marks entry and updates for teachers and admins.'}
              </p>

              {/* Scrollable list of exams */}
              <div className="border border-light-gray/40 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-light-gray/40">
                {actionExams.map(exam => (
                  <div key={exam.id} className="p-3.5 flex items-center justify-between text-xs bg-light-gray/10 hover:bg-light-gray/20 transition-colors">
                    <div>
                      <span className="font-bold text-charcoal block">{exam.subject_name}</span>
                      <span className="text-steel-gray text-[10px] font-caption block mt-0.5">
                        {exam.exam_name} • {formatDate(exam.exam_date)}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-steel-gray/80 px-2 py-0.5 bg-white border border-light-gray/60 rounded">
                      {exam.entered_results_count} / {exam.enrolled_students_count} entered
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-cream/10 border border-cream/30 text-amber-900 rounded-xl text-xs font-medium leading-normal flex items-start gap-2.5">
                <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  Please double check the list above. Granular locks can be reversed by an admin at any time if adjustments are needed.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-light-gray/10 border-t border-light-gray/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4.5 py-2 text-xs font-bold text-steel-gray hover:text-charcoal border border-light-gray rounded-xl hover:bg-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4.5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  confirmActionType === 'lock' 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmActionType === 'lock' ? 'Confirm Lock' : 'Confirm Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
