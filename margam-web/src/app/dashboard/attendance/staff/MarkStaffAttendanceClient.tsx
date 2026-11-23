'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getStaffRosterAction, saveStaffAttendanceAction } from '../actions'
import type { StaffAttendanceStatus, StaffRosterEntry } from '@/lib/repositories/attendance'
import { addDays, formatLongDate } from '@/utils/date'

interface Props {
  today: string
  departments: string[]
}

interface RowState {
  status: StaffAttendanceStatus | null
  checkIn: string
  checkOut: string
  remarks: string
}

const STATUS_META: Record<StaffAttendanceStatus, { short: string; label: string; active: string }> = {
  present: { short: 'P', label: 'Present', active: 'bg-emerald-500 text-white border-emerald-500' },
  absent: { short: 'A', label: 'Absent', active: 'bg-rose-500 text-white border-rose-500' },
  late: { short: 'L', label: 'Late', active: 'bg-amber-500 text-white border-amber-500' },
  on_leave: { short: 'OL', label: 'On Leave', active: 'bg-sky-500 text-white border-sky-500' },
}
const STATUS_ORDER: StaffAttendanceStatus[] = ['present', 'absent', 'late', 'on_leave']

export default function MarkStaffAttendanceClient({ today, departments }: Props) {
  const [date, setDate] = useState(today)
  const [department, setDepartment] = useState('All')
  const [search, setSearch] = useState('')
  const [staff, setStaff] = useState<StaffRosterEntry[]>([])
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [meta, setMeta] = useState<{ holidayName: string | null; isWeekend: boolean; alreadyMarked: boolean } | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    const res = await getStaffRosterAction(date)
    setIsLoading(false)
    if (!res.success || !res.roster) {
      setStaff([])
      setRows({})
      setMeta(null)
      setError(res.error || 'Failed to load staff.')
      return
    }
    const r = res.roster
    const next: Record<string, RowState> = {}
    r.staff.forEach((t) => {
      next[t.teacherId] = {
        status: t.status ?? (r.alreadyMarked ? null : 'present'),
        checkIn: t.checkIn || '',
        checkOut: t.checkOut || '',
        remarks: t.remarks || '',
      }
    })
    setStaff(r.staff)
    setRows(next)
    setMeta({ holidayName: r.holidayName, isWeekend: r.isWeekend, alreadyMarked: r.alreadyMarked })
    setIsDirty(!r.alreadyMarked && r.staff.length > 0)
  }, [date])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  const changeDate = (value: string) => {
    if (!value || value > today) return
    if (isDirty && !window.confirm('You have unsaved attendance changes. Discard them?')) return
    setDate(value)
  }

  const update = (teacherId: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [teacherId]: { ...prev[teacherId], ...patch } }))
    setIsDirty(true)
    setSuccess(null)
  }

  const visibleStaff = useMemo(() => {
    const q = search.trim().toLowerCase()
    return staff.filter((t) => {
      if (department !== 'All' && t.specialization !== department) return false
      if (!q) return true
      return t.name.toLowerCase().includes(q) || (t.employeeCode || '').toLowerCase().includes(q)
    })
  }, [staff, department, search])

  const markAllVisible = (status: StaffAttendanceStatus) => {
    setRows((prev) => {
      const next = { ...prev }
      visibleStaff.forEach((t) => {
        next[t.teacherId] = { ...next[t.teacherId], status }
      })
      return next
    })
    setIsDirty(true)
    setSuccess(null)
  }

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, on_leave: 0, unmarked: 0 }
    staff.forEach((t) => {
      const st = rows[t.teacherId]?.status
      if (st) c[st]++
      else c.unmarked++
    })
    return c
  }, [rows, staff])

  const handleSave = async () => {
    const entries = staff
      .filter((t) => rows[t.teacherId]?.status)
      .map((t) => {
        const r = rows[t.teacherId]
        return {
          teacherId: t.teacherId,
          status: r.status as StaffAttendanceStatus,
          checkIn: r.checkIn || null,
          checkOut: r.checkOut || null,
          remarks: r.remarks || null,
        }
      })
    if (entries.length === 0) {
      setError('Mark at least one staff member before saving.')
      return
    }
    const badTimes = entries.find((e) => e.checkIn && e.checkOut && e.checkOut < e.checkIn)
    if (badTimes) {
      setError('Check-out time cannot be earlier than check-in time.')
      return
    }
    if (counts.unmarked > 0 && !window.confirm(`${counts.unmarked} staff member(s) are not marked and will be skipped. Save anyway?`)) return
    if (meta?.holidayName && !window.confirm(`${formatLongDate(date)} is a holiday (${meta.holidayName}). Save attendance anyway?`)) return

    setIsSaving(true)
    setError(null)
    const res = await saveStaffAttendanceAction(date, entries)
    setIsSaving(false)
    if (!res.success) {
      setError(res.error || 'Failed to save staff attendance.')
      return
    }
    setIsDirty(false)
    setMeta((m) => (m ? { ...m, alreadyMarked: true } : m))
    setSuccess(`Attendance saved for ${res.saved} staff member${res.saved === 1 ? '' : 's'}.`)
  }

  return (
    <div className="space-y-6 font-body pb-24">
      <div className="border-b border-light-gray/60 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Mark Staff Attendance</h1>
        <p className="text-steel-gray mt-1 text-sm font-caption">
          Record daily attendance, check-in and check-out times for teachers and staff.
        </p>
      </div>

      <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-end gap-5">
        <div>
          <label htmlFor="staff-date" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Date</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => changeDate(addDays(date, -1))} className="p-2 text-steel-gray hover:text-primary hover:bg-cream border border-light-gray/40 rounded-xl cursor-pointer" aria-label="Previous day">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <input
              id="staff-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => changeDate(e.target.value)}
              className="bg-cream/45 border border-light-gray/60 rounded-xl px-4 py-2 text-sm font-bold text-charcoal focus:outline-none focus:border-primary font-heading"
            />
            <button type="button" onClick={() => changeDate(addDays(date, 1))} disabled={date >= today} className="p-2 text-steel-gray hover:text-primary hover:bg-cream border border-light-gray/40 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next day">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <p className="text-xs text-steel-gray mt-2 font-caption">{formatLongDate(date)}</p>
        </div>
        <div className="flex-1">
          <label htmlFor="staff-dept" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">Department</label>
          <select
            id="staff-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full md:w-64 bg-cream/45 border border-light-gray/60 rounded-xl px-3 py-2 text-sm font-semibold text-charcoal focus:outline-none focus:border-primary"
          >
            <option value="All">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div role="alert" className="p-4 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-700 text-sm font-semibold">{error}</div>}
      {success && <div role="status" className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-2xl text-emerald-700 text-sm font-semibold">{success}</div>}
      {meta?.holidayName && (
        <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-800 text-sm"><strong>Holiday:</strong> {meta.holidayName}.</div>
      )}
      {meta && !meta.holidayName && meta.isWeekend && (
        <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-800 text-sm">This date falls on a weekend.</div>
      )}

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-steel-gray font-medium">Loading staff…</p>
        </div>
      ) : meta && (
        <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-light-gray/60 bg-cream/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">Present {counts.present}</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">Absent {counts.absent}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">Late {counts.late}</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60">On Leave {counts.on_leave}</span>
              {counts.unmarked > 0 && <span className="px-2 py-0.5 rounded-full bg-light-gray/30 text-steel-gray border border-light-gray/60">Not marked {counts.unmarked}</span>}
              <span className="px-2 py-0.5 rounded-full border bg-white text-steel-gray border-light-gray/60">
                {isDirty ? 'Unsaved changes' : meta.alreadyMarked ? 'Saved' : 'Not saved'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => markAllVisible('present')} className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer">
                {department === 'All' && !search ? 'All Present' : 'Shown → Present'}
              </button>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or code…"
                aria-label="Search staff"
                className="w-full sm:w-56 bg-white border border-light-gray/60 rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {visibleStaff.length === 0 ? (
            <div className="py-16 text-center text-sm text-steel-gray">No staff members match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-light-gray/40 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Check-in</th>
                    <th className="py-3 px-4">Check-out</th>
                    <th className="py-3 px-4 min-w-[160px]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray/40">
                  {visibleStaff.map((t) => {
                    const r = rows[t.teacherId] || { status: null, checkIn: '', checkOut: '', remarks: '' }
                    const attended = r.status === 'present' || r.status === 'late'
                    return (
                      <tr key={t.teacherId} className="hover:bg-cream/10 text-sm">
                        <td className="py-3 px-4">
                          <p className="font-bold text-charcoal font-heading">{t.name}</p>
                          <p className="text-[11px] text-steel-gray">{[t.employeeCode, t.specialization].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div role="radiogroup" aria-label={`Attendance for ${t.name}`} className="inline-flex gap-1">
                            {STATUS_ORDER.map((st) => (
                              <button
                                key={st}
                                type="button"
                                role="radio"
                                aria-checked={r.status === st}
                                title={STATUS_META[st].label}
                                onClick={() => update(t.teacherId, { status: st })}
                                className={`min-w-9 h-9 px-2 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                                  r.status === st ? STATUS_META[st].active : 'bg-white text-steel-gray border-light-gray/70 hover:border-primary/50'
                                }`}
                              >
                                {STATUS_META[st].short}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="time"
                            value={r.checkIn}
                            disabled={!attended}
                            onChange={(e) => update(t.teacherId, { checkIn: e.target.value })}
                            aria-label={`Check-in time for ${t.name}`}
                            className="bg-white border border-light-gray/60 rounded-lg px-2 py-1.5 text-xs text-charcoal focus:outline-none focus:border-primary disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="time"
                            value={r.checkOut}
                            disabled={!attended}
                            onChange={(e) => update(t.teacherId, { checkOut: e.target.value })}
                            aria-label={`Check-out time for ${t.name}`}
                            className="bg-white border border-light-gray/60 rounded-lg px-2 py-1.5 text-xs text-charcoal focus:outline-none focus:border-primary disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={r.remarks}
                            maxLength={500}
                            onChange={(e) => update(t.teacherId, { remarks: e.target.value })}
                            placeholder="Optional"
                            aria-label={`Remarks for ${t.name}`}
                            className="w-full bg-white border border-light-gray/60 rounded-lg px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:border-primary"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="px-4 py-3 text-[11px] text-steel-gray border-t border-light-gray/40">
                P = Present · A = Absent · L = Late (counts as present) · OL = On Leave (not counted against attendance)
              </p>
            </div>
          )}
        </div>
      )}

      {staff.length > 0 && meta && (
        <div className="sticky bottom-20 md:bottom-4 z-10">
          <div className="bg-white/95 backdrop-blur border border-light-gray/60 shadow-lg rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-steel-gray">{isDirty ? 'You have unsaved changes.' : meta.alreadyMarked ? 'Staff attendance for this day is saved.' : ''}</p>
            <div className="flex gap-2">
              {isDirty && meta.alreadyMarked && (
                <button type="button" onClick={() => loadRoster()} disabled={isSaving} className="px-4 py-2.5 text-sm font-bold rounded-xl border border-light-gray/60 text-steel-gray bg-white hover:text-primary cursor-pointer disabled:opacity-50">
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || (!isDirty && meta.alreadyMarked)}
                className="px-6 py-2.5 text-sm font-bold rounded-xl bg-primary text-white shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? 'Saving…' : meta.alreadyMarked ? 'Update Attendance' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
