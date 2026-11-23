'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getStudentRosterAction, saveStudentAttendanceAction } from '../actions'
import type {
  AcademicYearOption,
  SectionOption,
  StudentAttendanceStatus,
  StudentRoster,
} from '@/lib/repositories/attendance'
import { addDays, formatLongDate } from '@/utils/date'
import { sectionsForDate } from '../attendanceUtils'

interface Props {
  sections: SectionOption[]
  academicYears: AcademicYearOption[]
  today: string
  initialDate: string
  initialSectionId: string
}

interface RowState {
  status: StudentAttendanceStatus | null
  remarks: string
}

const STATUS_META: Record<StudentAttendanceStatus, { short: string; label: string; active: string }> = {
  present: { short: 'P', label: 'Present', active: 'bg-emerald-500 text-white border-emerald-500' },
  absent: { short: 'A', label: 'Absent', active: 'bg-rose-500 text-white border-rose-500' },
  late: { short: 'L', label: 'Late', active: 'bg-amber-500 text-white border-amber-500' },
  excused: { short: 'E', label: 'Excused / Leave', active: 'bg-sky-500 text-white border-sky-500' },
}
const STATUS_ORDER: StudentAttendanceStatus[] = ['present', 'absent', 'late', 'excused']

export default function MarkStudentAttendanceClient({ sections, academicYears, today, initialDate, initialSectionId }: Props) {
  const [date, setDate] = useState(initialDate)
  const visibleSections = useMemo(() => sectionsForDate(sections, academicYears, date), [sections, academicYears, date])
  const [sectionId, setSectionId] = useState(
    visibleSections.some((s) => s.id === initialSectionId) ? initialSectionId : visibleSections[0]?.id || ''
  )

  const [roster, setRoster] = useState<StudentRoster | null>(null)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Keep the selected section valid for the academic year of the chosen date
  useEffect(() => {
    if (!visibleSections.some((s) => s.id === sectionId)) {
      setSectionId(visibleSections[0]?.id || '')
    }
  }, [visibleSections, sectionId])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const loadRoster = useCallback(async () => {
    if (!sectionId || !date) {
      setRoster(null)
      setRows({})
      return
    }
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    const res = await getStudentRosterAction(sectionId, date)
    setIsLoading(false)
    if (!res.success || !res.roster) {
      setRoster(null)
      setRows({})
      setError(res.error || 'Failed to load students.')
      return
    }
    const r = res.roster
    const next: Record<string, RowState> = {}
    r.students.forEach((s) => {
      // Saved status wins. For a fresh day, students on approved leave default to "excused"
      // and everyone else to "present" (still unsaved until the admin clicks Save).
      const status = s.status ?? (r.alreadyMarked ? null : s.onApprovedLeave ? 'excused' : 'present')
      next[s.studentId] = { status, remarks: s.remarks || '' }
    })
    setRoster(r)
    setRows(next)
    setIsDirty(!r.alreadyMarked && r.students.length > 0)
  }, [sectionId, date])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  const confirmDiscard = () => !isDirty || window.confirm('You have unsaved attendance changes. Discard them?')

  const changeDate = (value: string) => {
    if (!value || value > today) return
    if (!confirmDiscard()) return
    setDate(value)
  }

  const changeSection = (value: string) => {
    if (!confirmDiscard()) return
    setSectionId(value)
  }

  const setStatus = (studentId: string, status: StudentAttendanceStatus) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
    setIsDirty(true)
    setSuccess(null)
  }

  const setRemarks = (studentId: string, remarks: string) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }))
    setIsDirty(true)
    setSuccess(null)
  }

  const markAll = (status: StudentAttendanceStatus, onlyUnmarked = false) => {
    if (!roster) return
    setRows((prev) => {
      const next = { ...prev }
      roster.students.forEach((s) => {
        if (onlyUnmarked && next[s.studentId]?.status) return
        // Never overwrite an approved leave when bulk-marking present
        const leaveDefault = status === 'present' && s.onApprovedLeave ? 'excused' : status
        next[s.studentId] = { ...next[s.studentId], status: leaveDefault }
      })
      return next
    })
    setIsDirty(true)
    setSuccess(null)
  }

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 }
    Object.values(rows).forEach((r) => {
      if (r.status) c[r.status]++
      else c.unmarked++
    })
    return c
  }, [rows])

  const handleSave = async () => {
    if (!roster) return
    const entries = roster.students
      .filter((s) => rows[s.studentId]?.status)
      .map((s) => ({
        studentId: s.studentId,
        status: rows[s.studentId].status as StudentAttendanceStatus,
        remarks: rows[s.studentId].remarks || null,
      }))
    if (entries.length === 0) {
      setError('Mark at least one student before saving.')
      return
    }
    if (counts.unmarked > 0 && !window.confirm(`${counts.unmarked} student(s) are not marked and will be skipped. Save anyway?`)) {
      return
    }
    if (roster.holidayName && !window.confirm(`${formatLongDate(date)} is a holiday (${roster.holidayName}). Save attendance anyway?`)) {
      return
    }
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    const res = await saveStudentAttendanceAction(sectionId, date, entries)
    setIsSaving(false)
    if (!res.success) {
      setError(res.error || 'Failed to save attendance.')
      return
    }
    setIsDirty(false)
    setRoster({ ...roster, alreadyMarked: true })
    setSuccess(`Attendance saved for ${res.saved} student${res.saved === 1 ? '' : 's'}.`)
  }

  const filteredStudents = (roster?.students || []).filter((s) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return s.name.toLowerCase().includes(q) || (s.rollNumber || '').toLowerCase().includes(q) || (s.studentCode || '').toLowerCase().includes(q)
  })

  const sectionName = visibleSections.find((s) => s.id === sectionId)?.name

  return (
    <div className="space-y-6 font-body pb-24">
      <div className="border-b border-light-gray/60 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Mark Student Attendance</h1>
        <p className="text-steel-gray mt-1 text-sm font-caption">
          Select a date and class section, mark each student, then save. Saved attendance can be edited at any time.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-end">
        <div>
          <label htmlFor="att-date" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Date</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeDate(addDays(date, -1))}
              className="p-2 text-steel-gray hover:text-primary hover:bg-cream border border-light-gray/40 rounded-xl transition-all cursor-pointer"
              aria-label="Previous day"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <input
              id="att-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => changeDate(e.target.value)}
              className="bg-cream/45 border border-light-gray/60 rounded-xl px-4 py-2 text-sm font-bold text-charcoal focus:outline-none focus:border-primary font-heading"
            />
            <button
              type="button"
              onClick={() => changeDate(addDays(date, 1))}
              disabled={date >= today}
              className="p-2 text-steel-gray hover:text-primary hover:bg-cream border border-light-gray/40 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next day"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            {date !== today && (
              <button type="button" onClick={() => changeDate(today)} className="text-xs font-bold text-primary hover:underline cursor-pointer ml-1">
                Today
              </button>
            )}
          </div>
          <p className="text-xs text-steel-gray mt-2 font-caption">{formatLongDate(date)}</p>
        </div>

        <div>
          <span className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Class &amp; Section</span>
          {visibleSections.length === 0 ? (
            <p className="text-sm text-steel-gray/70 italic">No sections are set up for the academic year of this date.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
              {visibleSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => changeSection(sec.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    sectionId === sec.id
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
      </div>

      {/* Banners */}
      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-700 text-sm font-semibold">{error}</div>
      )}
      {success && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-2xl text-emerald-700 text-sm font-semibold">{success}</div>
      )}
      {roster && roster.holidayName && (
        <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-800 text-sm">
          <strong>Holiday:</strong> {roster.holidayName}. Attendance is usually not taken on holidays.
        </div>
      )}
      {roster && !roster.holidayName && roster.isWeekend && (
        <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-800 text-sm">
          This date falls on a weekend. Make sure the school was open before marking attendance.
        </div>
      )}
      {roster && roster.subjectCount === 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-700 text-sm">
          No subjects are configured for {sectionName || 'this section'} in its academic year, so attendance cannot be saved yet.
          Attendance is stored per subject — configure the section&apos;s subjects first.
        </div>
      )}

      {isLoading && (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-steel-gray font-medium">Loading students…</p>
        </div>
      )}

      {!isLoading && roster && (
        <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-5 border-b border-light-gray/60 bg-cream/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-charcoal font-heading">
                {sectionName} <span className="text-steel-gray font-normal text-sm">· {roster.students.length} students</span>
              </h2>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">Present {counts.present}</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">Absent {counts.absent}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">Late {counts.late}</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60">Excused {counts.excused}</span>
                {counts.unmarked > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-light-gray/30 text-steel-gray border border-light-gray/60">Not marked {counts.unmarked}</span>
                )}
                <span className={`px-2 py-0.5 rounded-full border ${roster.alreadyMarked && !isDirty ? 'bg-primary/5 text-primary border-primary/20' : 'bg-white text-steel-gray border-light-gray/60'}`}>
                  {isDirty ? 'Unsaved changes' : roster.alreadyMarked ? 'Saved' : 'Not saved'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => markAll('present')} className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer">
                All Present
              </button>
              <button type="button" onClick={() => markAll('absent')} className="px-3 py-2 text-xs font-bold rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 cursor-pointer">
                All Absent
              </button>
              {counts.unmarked > 0 && (
                <button type="button" onClick={() => markAll('present', true)} className="px-3 py-2 text-xs font-bold rounded-xl border border-light-gray/60 text-charcoal bg-white hover:border-primary cursor-pointer">
                  Unmarked → Present
                </button>
              )}
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or roll no…"
                aria-label="Search students"
                className="w-full sm:w-56 bg-white border border-light-gray/60 rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {roster.students.length === 0 ? (
            <div className="py-16 text-center text-sm text-steel-gray max-w-sm mx-auto">
              <h3 className="font-bold text-charcoal font-heading">No students enrolled</h3>
              <p className="text-xs mt-1">This section has no active enrollments for its academic year.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-light-gray/40 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                    <th className="py-3 px-4 w-16">Roll</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 min-w-[180px]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray/40">
                  {filteredStudents.map((s) => {
                    const row = rows[s.studentId] || { status: null, remarks: '' }
                    return (
                      <tr key={s.studentId} className="hover:bg-cream/10 text-sm">
                        <td className="py-3 px-4 font-mono text-steel-gray">{s.rollNumber || '—'}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-charcoal font-heading">{s.name}</p>
                          <p className="text-[11px] text-steel-gray">
                            {s.studentCode}
                            {s.onApprovedLeave && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60 font-bold">On approved leave</span>
                            )}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div role="radiogroup" aria-label={`Attendance for ${s.name}`} className="inline-flex gap-1">
                            {STATUS_ORDER.map((st) => {
                              const meta = STATUS_META[st]
                              const active = row.status === st
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  title={meta.label}
                                  onClick={() => setStatus(s.studentId, st)}
                                  className={`w-9 h-9 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                                    active ? meta.active : 'bg-white text-steel-gray border-light-gray/70 hover:border-primary/50'
                                  }`}
                                >
                                  {meta.short}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={row.remarks}
                            maxLength={500}
                            onChange={(e) => setRemarks(s.studentId, e.target.value)}
                            placeholder="Optional"
                            aria-label={`Remarks for ${s.name}`}
                            className="w-full bg-white border border-light-gray/60 rounded-lg px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:border-primary"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="px-4 py-3 text-[11px] text-steel-gray border-t border-light-gray/40">
                P = Present · A = Absent · L = Late (counts as present) · E = Excused / on leave (not counted against attendance)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sticky save bar */}
      {roster && roster.students.length > 0 && (
        <div className="sticky bottom-20 md:bottom-4 z-10">
          <div className="bg-white/95 backdrop-blur border border-light-gray/60 shadow-lg rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-steel-gray">
              {isDirty ? 'You have unsaved changes.' : roster.alreadyMarked ? 'Attendance for this day is saved.' : ''}
            </p>
            <div className="flex gap-2">
              {isDirty && roster.alreadyMarked && (
                <button
                  type="button"
                  onClick={() => loadRoster()}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-sm font-bold rounded-xl border border-light-gray/60 text-steel-gray bg-white hover:text-primary cursor-pointer disabled:opacity-50"
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || roster.subjectCount === 0 || (!isDirty && roster.alreadyMarked)}
                className="px-6 py-2.5 text-sm font-bold rounded-xl bg-primary text-white shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? 'Saving…' : roster.alreadyMarked ? 'Update Attendance' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
