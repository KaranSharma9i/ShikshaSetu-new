'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  getStudentAttendanceAction,
  getStaffAttendanceAction,
  getDailyAttendanceAction,
} from './actions'
import {
  CalendarDay,
  StudentAttendanceListItem,
  StaffAttendanceListItem,
  ClassAttendanceBreakdown,
} from '@/lib/repositories/attendance'

interface AttendanceClientProps {
  initialSections: Array<{ id: string; name: string }>
  initialDepartments: string[]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AttendanceClient({
  initialSections,
  initialDepartments
}: AttendanceClientProps) {
  // Tabs: student, staff, daily
  const [activeTab, setActiveTab] = useState<'student' | 'staff' | 'daily'>('student')

  // Date selections - defaulting to May 2026 to ensure mock data loads
  const [currentMonth, setCurrentMonth] = useState(5) // May (1-indexed)
  const [currentYear, setCurrentYear] = useState(2026)
  const [dailyDate, setDailyDate] = useState('2026-05-25')

  // Filter selections
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialSections.length > 0 ? initialSections[0].id : ''
  )
  const [selectedDept, setSelectedDept] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Student states
  const [studentSummary, setStudentSummary] = useState<{
    monthlyAvg: number
    criticalDays: number
    calendarData: CalendarDay[]
    insight: string
    resolvedYear: number
  } | null>(null)
  const [studentList, setStudentList] = useState<StudentAttendanceListItem[]>([])

  // Staff states
  const [staffSummary, setStaffSummary] = useState<{
    monthlyAvg: number
    staffOnLeaveToday: number
    calendarData: CalendarDay[]
    insight: string
    resolvedYear: number
  } | null>(null)
  const [staffList, setStaffList] = useState<StaffAttendanceListItem[]>([])

  // Daily Breakdown states
  const [dailyBreakdown, setDailyBreakdown] = useState<ClassAttendanceBreakdown[]>([])

  // Loaders and Errors
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Handlers for month navigation
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  // Handlers for daily date navigation
  const adjustDailyDate = (days: number) => {
    const dObj = new Date(dailyDate)
    if (isNaN(dObj.getTime())) return
    dObj.setDate(dObj.getDate() + days)
    const newY = dObj.getFullYear()
    const newM = String(dObj.getMonth() + 1).padStart(2, '0')
    const newD = String(dObj.getDate()).padStart(2, '0')
    setDailyDate(`${newY}-${newM}-${newD}`)
  }

  // Load Student Attendance
  const loadStudentData = useCallback(async () => {
    if (!selectedSectionId) return
    setIsLoading(true)
    setError(null)
    const res = await getStudentAttendanceAction(selectedSectionId, currentMonth, currentYear)
    if (res.success && res.summary && res.list) {
      setStudentSummary(res.summary)
      setStudentList(res.list)
    } else {
      setError(res.error || 'Failed to fetch student attendance.')
    }
    setIsLoading(false)
  }, [selectedSectionId, currentMonth, currentYear])

  // Load Staff Attendance
  const loadStaffData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const res = await getStaffAttendanceAction(currentMonth, currentYear, selectedDept)
    if (res.success && res.summary && res.list) {
      setStaffSummary(res.summary)
      setStaffList(res.list)
    } else {
      setError(res.error || 'Failed to fetch staff attendance.')
    }
    setIsLoading(false)
  }, [currentMonth, currentYear, selectedDept])

  // Load Daily Breakdown
  const loadDailyData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const res = await getDailyAttendanceAction(dailyDate)
    if (res.success && res.breakdown) {
      setDailyBreakdown(res.breakdown)
    } else {
      setError(res.error || 'Failed to fetch daily breakdown.')
    }
    setIsLoading(false)
  }, [dailyDate])

  // Effect to reload data on filter change
  useEffect(() => {
    if (activeTab === 'student') {
      loadStudentData()
    } else if (activeTab === 'staff') {
      loadStaffData()
    } else if (activeTab === 'daily') {
      loadDailyData()
    }
  }, [activeTab, loadStudentData, loadStaffData, loadDailyData])

  // Local filtering logic
  const filteredStudents = studentList.filter((s) =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredStaff = staffList.filter((t) =>
    t.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDaily = dailyBreakdown.filter((db) =>
    `${db.className}-${db.sectionName}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Status badge styling helper
  const getBadgeClass = (status: 'excellent' | 'leadership' | 'warning' | 'critical') => {
    switch (status) {
      case 'excellent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
      case 'leadership':
        return 'bg-blue-50 text-blue-700 border-blue-200/50'
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200/50'
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-200/50'
    }
  }

  // Status bar color styling helper
  const getProgressColor = (status: 'excellent' | 'leadership' | 'warning' | 'critical') => {
    switch (status) {
      case 'excellent':
        return 'bg-emerald-500'
      case 'leadership':
        return 'bg-blue-500'
      case 'warning':
        return 'bg-amber-500'
      case 'critical':
        return 'bg-rose-500'
    }
  }

  // Calendar Day render helper
  const renderCalendarGrid = (calendarData: CalendarDay[], resolvedYear: number) => {
    if (!calendarData || calendarData.length === 0) return null

    // Find spacers (which weekday does 1st of month fall on)
    // getDay returns 0: Sunday, 1: Monday, ..., 6: Saturday
    const firstDayIndex = new Date(resolvedYear, currentMonth - 1, 1).getDay()
    const spacers = Array(firstDayIndex).fill(null)
    const allCells = [...spacers, ...calendarData]

    // Pad allCells to always be a multiple of 7
    const paddedCells = [...allCells]
    while (paddedCells.length % 7 !== 0) {
      paddedCells.push(null)
    }

    return (
      <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm">
        {/* Month Heading */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={prevMonth}
            className="p-2 text-steel-gray hover:text-primary hover:bg-cream border border-light-gray/40 rounded-xl transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-heading font-bold text-charcoal text-base">
            {MONTH_NAMES[currentMonth - 1]} {resolvedYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 text-steel-gray hover:text-primary hover:bg-cream border border-light-gray/40 rounded-xl transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {WEEKDAYS.map((day) => (
            <span key={day} className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">
              {day}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {paddedCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="aspect-square" />
            }

            const dayNum = new Date(cell.date).getDate()
            let cellClass = ''

            switch (cell.type) {
              case 'present':
                cellClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/50'
                break
              case 'absent':
                cellClass = 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100/50'
                break
              case 'holiday':
                cellClass = 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100/50'
                break
              case 'weekend':
                cellClass = 'bg-light-gray/20 text-steel-gray/60'
                break
              case 'future':
                cellClass = 'bg-light-gray/5 text-steel-gray/30 cursor-not-allowed'
                break
              case 'no_data':
                cellClass = 'bg-light-gray/10 text-steel-gray/40'
                break
            }

            return (
              <div
                key={cell.date}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold font-heading transition-all ${cellClass}`}
                title={`${cell.date}: ${cell.type.replace('_', ' ')}`}
              >
                <span>{dayNum}</span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-light-gray/40 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-steel-gray">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>Present (&gt;=85%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span>Absent (&lt;85%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-light-gray/40" />
            <span>Weekend</span>
          </div>
        </div>
      </div>
    )
  }

  // Calculate totals/warnings for current active tab
  const getOverviewStats = () => {
    if (activeTab === 'student') {
      const criticalCount = studentList.filter((s) => s.status === 'critical').length
      const warningCount = studentList.filter((s) => s.status === 'warning').length
      return {
        avgRate: studentSummary?.monthlyAvg || 0,
        rateLabel: 'Student Attendance Avg',
        alertLabel: 'Critical Students',
        alertValue: criticalCount,
        alertSub: `${warningCount} warnings active`,
        infoLabel: 'Critical Days',
        infoValue: studentSummary?.criticalDays || 0,
        infoSub: 'Class fell below 85%'
      }
    } else if (activeTab === 'staff') {
      const criticalCount = staffList.filter((s) => s.status === 'critical').length
      const warningCount = staffList.filter((s) => s.status === 'warning').length
      return {
        avgRate: staffSummary?.monthlyAvg || 0,
        rateLabel: 'Staff Attendance Avg',
        alertLabel: 'Critical Staff',
        alertValue: criticalCount,
        alertSub: `${warningCount} warnings active`,
        infoLabel: 'On Leave Today',
        infoValue: staffSummary?.staffOnLeaveToday || 0,
        infoSub: 'Requires substitute teachers'
      }
    } else {
      const activeTotal = dailyBreakdown.reduce((acc, curr) => acc + curr.totalCount, 0)
      const activePresent = dailyBreakdown.reduce((acc, curr) => acc + curr.presentCount, 0)
      const avgRate = activeTotal > 0 ? Math.round((activePresent / activeTotal) * 100) : 0
      return {
        avgRate,
        rateLabel: 'Total Present Rate',
        alertLabel: 'Active Enrolled Students',
        alertValue: activeTotal,
        alertSub: 'Across all sections',
        infoLabel: 'Present Today',
        infoValue: activePresent,
        infoSub: `${activeTotal - activePresent} absent today`
      }
    }
  }

  const stats = getOverviewStats()

  return (
    <div className="space-y-6 font-body">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Attendance Analytics</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            View detailed stats, monthly tracking calendars, and consolidated attendance sheets.
          </p>
        </div>
        
        {/* Tab selector */}
        <div className="bg-light-gray/20 p-1.5 rounded-2xl flex border border-light-gray/30 w-fit self-start md:self-auto shadow-inner">
          <button
            onClick={() => {
              setActiveTab('student')
              setSearchQuery('')
            }}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'student'
                ? 'bg-primary text-white shadow'
                : 'text-steel-gray hover:text-primary'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => {
              setActiveTab('staff')
              setSearchQuery('')
            }}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-primary text-white shadow'
                : 'text-steel-gray hover:text-primary'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => {
              setActiveTab('daily')
              setSearchQuery('')
            }}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-primary text-white shadow'
                : 'text-steel-gray hover:text-primary'
            }`}
          >
            Daily Breakdown
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Average Rate Card */}
        <div className="group bg-white border border-light-gray/60 hover:border-primary/20 rounded-2xl p-6 shadow-sm hover:shadow transition-all relative overflow-hidden flex justify-between items-center">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <div>
            <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">{stats.rateLabel}</p>
            <h3 className="text-4xl font-extrabold text-charcoal mt-2.5 font-heading tracking-tight">
              {stats.avgRate}%
            </h3>
          </div>
          <div className={`p-4 bg-primary/5 rounded-2xl text-primary font-bold text-lg border border-primary/5 group-hover:scale-105 transition-transform`}>
            %
          </div>
        </div>

        {/* Alerts/Critical Count Card */}
        <div className="group bg-white border border-light-gray/60 hover:border-secondary/20 rounded-2xl p-6 shadow-sm hover:shadow transition-all relative overflow-hidden flex justify-between items-center">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
          <div>
            <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">{stats.alertLabel}</p>
            <h3 className="text-4xl font-extrabold text-charcoal mt-2.5 font-heading tracking-tight">
              {stats.alertValue}
            </h3>
            <p className="text-[10px] text-steel-gray font-caption mt-1">{stats.alertSub}</p>
          </div>
          <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Leave/Critical Days Card */}
        <div className="group bg-white border border-light-gray/60 hover:border-amber-500/20 rounded-2xl p-6 shadow-sm hover:shadow transition-all relative overflow-hidden flex justify-between items-center">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div>
            <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">{stats.infoLabel}</p>
            <h3 className="text-4xl font-extrabold text-charcoal mt-2.5 font-heading tracking-tight">
              {stats.infoValue}
            </h3>
            <p className="text-[10px] text-steel-gray font-caption mt-1">{stats.infoSub}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main dashboard body */}
      {isLoading && (
        <div className="py-24 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-steel-gray font-body font-medium">Fetching attendance records...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-5 bg-rose-50 border border-rose-200/50 rounded-2xl text-rose-700 text-sm font-semibold max-w-2xl">
          <div className="flex gap-3 items-center">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Monthly Tab Views (Student & Staff) */}
          {(activeTab === 'student' || activeTab === 'staff') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Column: Selector Chips + Metrics Card + Insights */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* selectors */}
                <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-charcoal font-heading uppercase tracking-wider border-b border-light-gray/40 pb-2">
                    Filters
                  </h4>

                  {activeTab === 'student' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Class & Section</label>
                      {initialSections.length === 0 ? (
                        <p className="text-xs text-steel-gray/60 italic font-body">No sections available.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {initialSections.map((sec) => (
                            <button
                              key={sec.id}
                              onClick={() => setSelectedSectionId(sec.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer font-body ${
                                selectedSectionId === sec.id
                                  ? 'bg-primary text-white border-primary shadow-sm'
                                  : 'bg-cream/45 hover:bg-cream border-light-gray/60 text-steel-gray'
                              }`}
                            >
                              {sec.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'staff' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Department</label>
                      <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        <button
                          onClick={() => setSelectedDept('All')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer font-body ${
                            selectedDept === 'All'
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-cream/45 hover:bg-cream border-light-gray/60 text-steel-gray'
                          }`}
                        >
                          All Departments
                        </button>
                        {initialDepartments.map((dept) => (
                          <button
                            key={dept}
                            onClick={() => setSelectedDept(dept)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer font-body ${
                              selectedDept === dept
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-cream/45 hover:bg-cream border-light-gray/60 text-steel-gray'
                            }`}
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Insight Card */}
                {((activeTab === 'student' && studentSummary) || (activeTab === 'staff' && staffSummary)) && (
                  <div className="bg-cream/25 border border-primary/10 rounded-2xl p-6 shadow-sm relative overflow-hidden flex gap-4 items-start">
                    <div className="p-2.5 bg-primary/5 rounded-xl text-primary font-bold border border-primary/5">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-heading font-bold text-sm text-primary mb-1">Attendance Insight</h5>
                      <p className="text-xs text-charcoal leading-relaxed font-body">
                        {activeTab === 'student' ? studentSummary?.insight : staffSummary?.insight}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Calendar grid */}
              <div className="lg:col-span-2">
                {activeTab === 'student' && studentSummary && renderCalendarGrid(studentSummary.calendarData, studentSummary.resolvedYear)}
                {activeTab === 'staff' && staffSummary && renderCalendarGrid(staffSummary.calendarData, staffSummary.resolvedYear)}
              </div>

            </div>
          )}

          {/* Daily Breakdown Tab Date selector */}
          {activeTab === 'daily' && (
            <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustDailyDate(-1)}
                  className="p-2 text-steel-gray hover:text-primary hover:bg-cream border border-light-gray/40 rounded-xl transition-all cursor-pointer"
                  title="Previous Day"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="bg-cream/45 hover:bg-cream border border-light-gray/60 rounded-xl px-4 py-2 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-all cursor-pointer font-heading"
                />
                <button
                  onClick={() => adjustDailyDate(1)}
                  className="p-2 text-steel-gray hover:text-primary hover:bg-cream border border-light-gray/40 rounded-xl transition-all cursor-pointer"
                  title="Next Day"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="text-right">
                <p className="text-xs text-steel-gray font-caption font-semibold">Active Date Selected</p>
                <p className="text-sm font-bold text-primary font-heading mt-0.5">
                  {new Date(dailyDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* List/Sheet Table Grid Container */}
          <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
            {/* Table Header Filter Row */}
            <div className="p-6 border-b border-light-gray/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cream/15">
              <div>
                <h4 className="text-lg font-bold text-charcoal font-heading">
                  {activeTab === 'student' && 'Student Attendance Sheet'}
                  {activeTab === 'staff' && 'Staff Attendance Sheet'}
                  {activeTab === 'daily' && 'Class Attendance Breakdown'}
                </h4>
                <p className="text-xs text-steel-gray font-caption mt-0.5">
                  {activeTab === 'student' && 'Consolidated list of student records for the selected month'}
                  {activeTab === 'staff' && 'Consolidated list of teacher records for the selected month'}
                  {activeTab === 'daily' && 'Class-wise student count list for the selected date'}
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-steel-gray/60">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder={
                    activeTab === 'student' ? 'Search students...' :
                    activeTab === 'staff' ? 'Search teachers or subjects...' : 'Search classes...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-light-gray/60 rounded-xl pl-9 pr-4 py-2 text-xs md:text-sm text-charcoal focus:outline-none focus:border-primary transition-all font-body"
                />
              </div>
            </div>

            {/* Student Table */}
            {activeTab === 'student' && (
              <div className="overflow-x-auto">
                {filteredStudents.length === 0 ? (
                  <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-sm mx-auto space-y-2">
                    <h3 className="font-bold text-charcoal font-heading">No Students Found</h3>
                    <p className="text-xs">Try adjusting the text filters or selecting another class/section chip.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-light-gray/40 bg-cream/5 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                        <th className="py-4 px-6">Student</th>
                        <th className="py-4 px-6 text-center">Month Attendance</th>
                        <th className="py-4 px-6 text-center">Present / Total Days</th>
                        <th className="py-4 px-6 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/40">
                      {filteredStudents.map((student) => (
                        <tr key={student.studentId} className="hover:bg-cream/10 transition-colors text-sm font-body">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div
                                style={{ backgroundColor: 'var(--primary)', color: 'var(--white)' }}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-extrabold font-heading shadow-sm"
                              >
                                {student.initials}
                              </div>
                              <span className="font-bold text-charcoal font-heading">{student.studentName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3 max-w-[200px] mx-auto">
                              <span className="font-bold text-charcoal w-10 text-right">{student.attendancePercent}%</span>
                              <div className="flex-1 bg-light-gray rounded-full h-1.5 overflow-hidden">
                                <div
                                  style={{ width: `${student.attendancePercent}%` }}
                                  className={`h-full rounded-full ${getProgressColor(student.status)}`}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-semibold text-steel-gray">
                            {student.presentDays} / {student.totalDays} days
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getBadgeClass(student.status)}`}>
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Staff Table */}
            {activeTab === 'staff' && (
              <div className="overflow-x-auto">
                {filteredStaff.length === 0 ? (
                  <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-sm mx-auto space-y-2">
                    <h3 className="font-bold text-charcoal font-heading">No Staff Members Found</h3>
                    <p className="text-xs">Try adjusting the department filters or keyword search query.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-light-gray/40 bg-cream/5 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                        <th className="py-4 px-6">Staff Member</th>
                        <th className="py-4 px-6">Specialization / Subject</th>
                        <th className="py-4 px-6 text-center">Month Attendance</th>
                        <th className="py-4 px-6 text-center">Present / Total Days</th>
                        <th className="py-4 px-6 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/40">
                      {filteredStaff.map((staff) => (
                        <tr key={staff.teacherId} className="hover:bg-cream/10 transition-colors text-sm font-body">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div
                                style={{ backgroundColor: 'var(--primary)', color: 'var(--white)' }}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-extrabold font-heading shadow-sm"
                              >
                                {staff.initials}
                              </div>
                              <span className="font-bold text-charcoal font-heading">{staff.teacherName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-steel-gray">
                            {staff.subject}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3 max-w-[200px] mx-auto">
                              <span className="font-bold text-charcoal w-10 text-right">{staff.attendancePercent}%</span>
                              <div className="flex-1 bg-light-gray rounded-full h-1.5 overflow-hidden">
                                <div
                                  style={{ width: `${staff.attendancePercent}%` }}
                                  className={`h-full rounded-full ${getProgressColor(staff.status)}`}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-semibold text-steel-gray">
                            {staff.presentDays} / {staff.totalDays} days
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getBadgeClass(staff.status)}`}>
                              {staff.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Daily Breakdown Table */}
            {activeTab === 'daily' && (
              <div className="overflow-x-auto">
                {filteredDaily.length === 0 ? (
                  <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-sm mx-auto space-y-2">
                    <h3 className="font-bold text-charcoal font-heading">No Class Breakdown Data</h3>
                    <p className="text-xs">We couldn&apos;t find any breakdown data for the selected date.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-light-gray/40 bg-cream/5 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                        <th className="py-4 px-6">Class & Section</th>
                        <th className="py-4 px-6 text-center">Attendance Progress</th>
                        <th className="py-4 px-6 text-center">Present / Total Students</th>
                        <th className="py-4 px-6 text-right">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/40">
                      {filteredDaily.map((row, index) => {
                        const rate = row.totalCount > 0 ? Math.round((row.presentCount / row.totalCount) * 100) : 0
                        const rateStatus = rate >= 90 ? 'excellent' : rate >= 85 ? 'warning' : 'critical'

                        return (
                          <tr key={`${row.sectionId}-${index}`} className="hover:bg-cream/10 transition-colors text-sm font-body">
                            <td className="py-4 px-6">
                              <span className="font-bold text-charcoal font-heading">
                                {row.className}-{row.sectionName}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3 max-w-[240px] mx-auto">
                                <div className="flex-1 bg-light-gray rounded-full h-1.5 overflow-hidden">
                                  <div
                                    style={{ width: `${rate}%` }}
                                    className={`h-full rounded-full ${getProgressColor(rateStatus)}`}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center font-semibold text-steel-gray">
                              {row.presentCount} / {row.totalCount} students
                            </td>
                            <td className="py-4 px-6 text-right font-extrabold text-charcoal font-heading">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${getBadgeClass(rateStatus)}`}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
