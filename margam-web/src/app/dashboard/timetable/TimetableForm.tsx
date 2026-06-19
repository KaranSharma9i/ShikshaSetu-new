'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getTimetableAction,
  getClassSubjectsAction,
  saveTimetableEntryAction,
  deleteTimetableEntryAction
} from './actions'

interface AcademicYear {
  id: string
  label: string
  is_current: boolean
}

interface SectionItem {
  id: string
  name: string
  class_name: string
}

interface ClassSubjectItem {
  id: string
  subject_id: string
  subject_name: string
  subject_code: string
  teacher_id: string | null
  teacher_name: string
}

interface TimetableEntry {
  id: string
  section_id: string
  class_subject_id: string
  day: string
  period_number: number
  starts_at: string
  ends_at: string
  room: string | null
  academic_year_id: string
  subject_name: string
  subject_code: string
  teacher_name: string
  teacher_id: string | null
}

interface TimetableFormProps {
  initialYears: AcademicYear[]
  initialSections: SectionItem[]
  institutionId: string
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
]

const PERIODS = Array.from({ length: 12 }, (_, i) => i + 1)

// Default time slots for auto-fill helper
function getDefaultTimesForPeriod(periodNum: number): { startsAt: string; endsAt: string } {
  const schedule: Record<number, { startsAt: string; endsAt: string }> = {
    1: { startsAt: '08:00', endsAt: '08:45' },
    2: { startsAt: '08:45', endsAt: '09:30' },
    3: { startsAt: '09:30', endsAt: '10:15' },
    4: { startsAt: '10:30', endsAt: '11:15' }, // Assuming break before P4
    5: { startsAt: '11:15', endsAt: '12:00' },
    6: { startsAt: '12:00', endsAt: '12:45' },
    7: { startsAt: '13:30', endsAt: '14:15' }, // Lunch break before P7
    8: { startsAt: '14:15', endsAt: '15:00' },
    9: { startsAt: '15:00', endsAt: '15:45' },
    10: { startsAt: '15:45', endsAt: '16:30' },
    11: { startsAt: '16:30', endsAt: '17:15' },
    12: { startsAt: '17:15', endsAt: '18:00' }
  }
  return schedule[periodNum] || { startsAt: '08:00', endsAt: '08:45' }
}

// Clean time string: "08:00:00" -> "08:00"
function cleanTimeStr(timeStr: string | undefined | null): string {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

export default function TimetableForm({
  initialYears,
  initialSections,
  institutionId
}: TimetableFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Selectors State
  const [selectedYearId, setSelectedYearId] = useState<string>(
    initialYears.find(y => y.is_current)?.id || initialYears[0]?.id || ''
  )
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialSections[0]?.id || ''
  )

  // Loaded Data State
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubjectItem[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formDay, setFormDay] = useState<string>('monday')
  const [formPeriod, setFormPeriod] = useState<number>(1)
  const [formClassSubjectId, setFormClassSubjectId] = useState<string>('')
  const [formRoom, setFormRoom] = useState<string>('')
  const [formStartsAt, setFormStartsAt] = useState<string>('')
  const [formEndsAt, setFormEndsAt] = useState<string>('')

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Fetch timetable and subjects when Section or Year changes
  useEffect(() => {
    if (!selectedSectionId || !selectedYearId) return

    async function loadData() {
      setLoadingData(true)
      setErrorMsg(null)
      try {
        const [ttRes, csRes] = await Promise.all([
          getTimetableAction(institutionId, selectedSectionId, selectedYearId),
          getClassSubjectsAction(institutionId, selectedSectionId, selectedYearId)
        ])

        if (ttRes.success && ttRes.data) {
          setTimetable(ttRes.data)
        } else {
          setErrorMsg(ttRes.error || 'Failed to load timetable.')
        }

        if (csRes.success && csRes.data) {
          setClassSubjects(csRes.data)
          // Default to first subject if none selected
          if (csRes.data.length > 0) {
            setFormClassSubjectId(csRes.data[0].id)
          } else {
            setFormClassSubjectId('')
          }
        }
      } catch (err: any) {
        console.error('Error loading page data:', err)
        setErrorMsg('Failed to fetch data.')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
    resetForm()
  }, [selectedSectionId, selectedYearId])

  // Auto-fill times when period number changes (only if fields are empty or match previous default)
  const handlePeriodChange = (periodNum: number) => {
    setFormPeriod(periodNum)
    const defaults = getDefaultTimesForPeriod(periodNum)
    setFormStartsAt(defaults.startsAt)
    setFormEndsAt(defaults.endsAt)
  }

  // Pre-fill defaults for the initial period when first loading or resetting
  const resetForm = () => {
    setEditingId(null)
    setFormDay('monday')
    setFormPeriod(1)
    if (classSubjects.length > 0) {
      setFormClassSubjectId(classSubjects[0].id)
    } else {
      setFormClassSubjectId('')
    }
    setFormRoom('')
    const defaults = getDefaultTimesForPeriod(1)
    setFormStartsAt(defaults.startsAt)
    setFormEndsAt(defaults.endsAt)
    setErrorMsg(null)
  }

  // Handle cell click in weekly grid
  const handleCellClick = (dayKey: string, periodNum: number) => {
    const existing = timetable.find(
      entry => entry.day === dayKey && entry.period_number === periodNum
    )

    if (existing) {
      // Edit mode
      setEditingId(existing.id)
      setFormDay(existing.day)
      setFormPeriod(existing.period_number)
      setFormClassSubjectId(existing.class_subject_id)
      setFormRoom(existing.room || '')
      setFormStartsAt(cleanTimeStr(existing.starts_at))
      setFormEndsAt(cleanTimeStr(existing.ends_at))
      setErrorMsg(null)
      // Scroll to form panel if needed
      document.getElementById('timetable-form-panel')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      // Add mode for this slot
      setEditingId(null)
      setFormDay(dayKey)
      setFormPeriod(periodNum)
      const defaults = getDefaultTimesForPeriod(periodNum)
      setFormStartsAt(defaults.startsAt)
      setFormEndsAt(defaults.endsAt)
      setFormRoom('')
      if (classSubjects.length > 0 && !formClassSubjectId) {
        setFormClassSubjectId(classSubjects[0].id)
      }
      setErrorMsg(null)
      document.getElementById('timetable-form-panel')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!formClassSubjectId) {
      setErrorMsg('Please select a Class Subject.')
      return
    }

    if (!formStartsAt || !formEndsAt) {
      setErrorMsg('Please specify start and end times.')
      return
    }

    if (formStartsAt >= formEndsAt) {
      setErrorMsg('End time must be later than start time.')
      return
    }

    startTransition(async () => {
      try {
        const res = await saveTimetableEntryAction(institutionId, {
          id: editingId || undefined,
          sectionId: selectedSectionId,
          classSubjectId: formClassSubjectId,
          day: formDay,
          periodNumber: formPeriod,
          startsAt: formStartsAt,
          endsAt: formEndsAt,
          room: formRoom || null,
          academicYearId: selectedYearId
        })

        if (res.success) {
          setSuccessMsg(editingId ? 'Schedule updated successfully!' : 'Period scheduled successfully!')
          
          // Re-fetch timetable
          const ttRes = await getTimetableAction(institutionId, selectedSectionId, selectedYearId)
          if (ttRes.success && ttRes.data) {
            setTimetable(ttRes.data)
          }
          
          resetForm()
        } else {
          setErrorMsg(res.error || 'Failed to save timetable entry.')
        }
      } catch (err: any) {
        console.error('Error saving timetable entry:', err)
        setErrorMsg('An unexpected error occurred.')
      }
    })
  }

  // Delete Handler
  const handleDeleteEntry = async () => {
    if (!editingId) return
    if (!confirm('Are you sure you want to remove this timetable period?')) return

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      try {
        const res = await deleteTimetableEntryAction(editingId, institutionId)

        if (res.success) {
          setSuccessMsg('Period removed from schedule.')
          
          // Re-fetch timetable
          const ttRes = await getTimetableAction(institutionId, selectedSectionId, selectedYearId)
          if (ttRes.success && ttRes.data) {
            setTimetable(ttRes.data)
          }

          resetForm()
        } else {
          setErrorMsg(res.error || 'Failed to delete timetable entry.')
        }
      } catch (err: any) {
        console.error('Error deleting timetable entry:', err)
        setErrorMsg('An unexpected error occurred.')
      }
    })
  }

  // Helper to retrieve entry for a day + period
  const getEntryForSlot = (dayKey: string, periodNum: number) => {
    return timetable.find(entry => entry.day === dayKey && entry.period_number === periodNum)
  }

  return (
    <div className="space-y-8">
      {/* Selection Filter Bar */}
      <div className="bg-white border border-light-gray/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Academic Year</label>
            <select
              value={selectedYearId}
              onChange={e => {
                setSelectedSectionId('')
                setSelectedYearId(e.target.value)
              }}
              className="w-full bg-cream/40 border border-light-gray/50 rounded-xl px-4 py-2.5 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {initialYears.map(year => (
                <option key={year.id} value={year.id}>
                  {year.label} {year.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[220px]">
            <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Class & Section</label>
            <select
              value={selectedSectionId}
              onChange={e => setSelectedSectionId(e.target.value)}
              className="w-full bg-cream/40 border border-light-gray/50 rounded-xl px-4 py-2.5 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>Select a Section</option>
              {initialSections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.class_name} - {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSectionId && (
          <div className="flex items-center gap-3 self-end md:self-center">
            <Link
              href={`/dashboard/timetable/print?sectionId=${selectedSectionId}&academicYearId=${selectedYearId}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-primary bg-white border border-light-gray hover:bg-cream/40 rounded-xl shadow-sm transition-all active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Schedule
            </Link>
          </div>
        )}
      </div>

      {/* Main Panel Layout */}
      {!selectedSectionId ? (
        <div className="bg-white border border-light-gray/60 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-steel-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-charcoal font-heading">No Section Selected</h3>
          <p className="text-steel-gray text-sm mt-1 max-w-md mx-auto font-caption">
            Please choose an academic year and section from the filters above to load the weekly scheduling timetable.
          </p>
        </div>
      ) : loadingData ? (
        <div className="bg-white border border-light-gray/60 rounded-2xl p-24 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <span className="text-steel-gray text-sm mt-4 font-caption">Loading timetable details...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Timetable Grid Column (Spans 3/4) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-light-gray/60 bg-cream/10 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-charcoal font-heading">Weekly Schedule</h2>
                  <p className="text-xs text-steel-gray font-caption mt-0.5">Click any cell to edit an entry or schedule a new period.</p>
                </div>
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Periods 1-12
                  </span>
                </div>
              </div>

              {/* Horizontal scrollable table container */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="bg-cream/20 border-b border-light-gray/60">
                      <th className="p-4 font-bold text-xs uppercase text-steel-gray font-caption border-r border-light-gray/40 w-[120px] sticky left-0 bg-white z-10">Day</th>
                      {PERIODS.map(p => (
                        <th key={p} className="p-3 text-center font-bold text-xs uppercase text-steel-gray font-caption min-w-[90px] border-r border-light-gray/40">
                          P{p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray/50">
                    {DAYS_OF_WEEK.map(day => {
                      const rowEditing = editingId && formDay === day.key
                      return (
                        <tr key={day.key} className="hover:bg-cream/5 transition-colors">
                          <td className="p-4 font-bold text-sm text-charcoal font-heading border-r border-light-gray/40 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {day.label}
                          </td>
                          {PERIODS.map(p => {
                            const entry = getEntryForSlot(day.key, p)
                            const isCellEditing = editingId && formDay === day.key && formPeriod === p

                            return (
                              <td
                                key={p}
                                onClick={() => handleCellClick(day.key, p)}
                                className={`p-2 border-r border-light-gray/40 text-center cursor-pointer transition-all relative group h-24 max-h-28 align-top ${
                                  isCellEditing
                                    ? 'bg-secondary/15 ring-2 ring-secondary/50 z-20 shadow-inner'
                                    : 'hover:bg-cream/15'
                                }`}
                              >
                                {entry ? (
                                  <div className="h-full flex flex-col justify-between text-left p-1.5 rounded-lg border border-primary/10 bg-primary/[0.02] group-hover:border-primary/30 group-hover:bg-primary/[0.04] transition-all">
                                    <div className="line-clamp-2">
                                      <p className="text-[11px] font-extrabold text-primary font-heading tracking-tight leading-tight uppercase">
                                        {entry.subject_name}
                                      </p>
                                    </div>
                                    <div className="mt-1 space-y-0.5">
                                      <p className="text-[10px] text-charcoal/70 font-medium font-body truncate">
                                        👨‍🏫 {entry.teacher_name}
                                      </p>
                                      {entry.room && (
                                        <p className="text-[9px] text-steel-gray font-caption font-semibold truncate uppercase">
                                          📍 Room {entry.room}
                                        </p>
                                      )}
                                      <p className="text-[9px] font-bold text-steel-gray/80 mt-1 block">
                                        🕒 {cleanTimeStr(entry.starts_at)}-{cleanTimeStr(entry.ends_at)}
                                      </p>
                                    </div>
                                    <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded bg-white shadow border border-light-gray/70">
                                      <svg className="w-3 h-3 text-steel-gray hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </span>
                                  </div>
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="p-1 rounded-full bg-cream border border-light-gray/60 text-steel-gray shadow-sm group-hover:scale-105 transition-transform">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                      </svg>
                                    </span>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Form Panel Column (Spans 1/4) */}
          <div className="lg:col-span-1" id="timetable-form-panel">
            <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden sticky top-6">
              <div className="p-5 border-b border-light-gray/60 bg-cream/10">
                <h2 className="text-lg font-bold text-charcoal font-heading">
                  {editingId ? 'Edit Period Slot' : 'Schedule Period'}
                </h2>
                <p className="text-xs text-steel-gray font-caption mt-0.5">
                  {editingId ? 'Modify or delete this scheduled slot.' : 'Configure a subject period slot.'}
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
                {/* Feedback Alerts */}
                {errorMsg && (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs font-semibold text-danger leading-relaxed animate-shake">
                    ⚠️ {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-xs font-semibold text-success leading-relaxed">
                    ✨ {successMsg}
                  </div>
                )}

                {/* Day Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Day of Week</label>
                  <select
                    value={formDay}
                    onChange={e => setFormDay(e.target.value)}
                    className="w-full bg-cream/20 border border-light-gray/50 rounded-xl px-3 py-2 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.key} value={day.key}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period Number */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Period Number</label>
                  <select
                    value={formPeriod}
                    onChange={e => handlePeriodChange(parseInt(e.target.value, 10))}
                    className="w-full bg-cream/20 border border-light-gray/50 rounded-xl px-3 py-2 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {PERIODS.map(p => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class Subject */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Class Subject</label>
                  {classSubjects.length === 0 ? (
                    <div className="text-xs text-danger font-semibold bg-danger/5 p-2.5 rounded-xl border border-danger/10">
                      No subjects are assigned to this section. Please assign subjects & teachers first.
                    </div>
                  ) : (
                    <select
                      value={formClassSubjectId}
                      onChange={e => setFormClassSubjectId(e.target.value)}
                      className="w-full bg-cream/20 border border-light-gray/50 rounded-xl px-3 py-2 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {classSubjects.map(cs => (
                        <option key={cs.id} value={cs.id}>
                          {cs.subject_name} ({cs.teacher_name})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Room */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Room</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={e => setFormRoom(e.target.value)}
                    placeholder="e.g. 102, Lab A, Ground Floor"
                    className="w-full bg-cream/20 border border-light-gray/50 rounded-xl px-3 py-2 text-sm font-semibold text-charcoal placeholder:text-steel-gray/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Time range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Starts At</label>
                    <input
                      type="time"
                      value={formStartsAt}
                      onChange={e => setFormStartsAt(e.target.value)}
                      required
                      className="w-full bg-cream/20 border border-light-gray/50 rounded-xl px-3 py-2 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">Ends At</label>
                    <input
                      type="time"
                      value={formEndsAt}
                      onChange={e => setFormEndsAt(e.target.value)}
                      required
                      className="w-full bg-cream/20 border border-light-gray/50 rounded-xl px-3 py-2 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 space-y-2">
                  <button
                    type="submit"
                    disabled={isPending || classSubjects.length === 0}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 text-xs md:text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : editingId ? (
                      'Update Period Slot'
                    ) : (
                      'Schedule Period'
                    )}
                  </button>

                  {editingId && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        disabled={isPending}
                        className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-steel-gray bg-white hover:bg-cream/40 border border-light-gray rounded-xl shadow-sm transition-all active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteEntry}
                        disabled={isPending}
                        className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-danger hover:bg-danger/90 border border-danger/10 rounded-xl shadow-sm transition-all active:scale-[0.98]"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
