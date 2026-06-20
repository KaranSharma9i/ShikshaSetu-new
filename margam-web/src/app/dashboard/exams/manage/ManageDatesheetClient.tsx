'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getExamDatesheetForClassAction,
  saveExamDatesheetForClassAction
} from '../actions'

interface ClassItem {
  id: string
  name: string
  grade_number: number
}

interface SubjectItem {
  id: string
  name: string
}

interface LocalRow {
  id?: string
  subject_id: string
  exam_date: string
  start_time: string
  end_time: string
  total_marks: number
  passing_marks: number
  venue: string
  syllabus_file_url?: string | null
  isNewLocal?: boolean
}

interface ManageDatesheetClientProps {
  examName: string
  academicYearId: string
  academicYearLabel: string
  classes: ClassItem[]
  subjects: SubjectItem[]
  institution: any
  institutionId: string
  isNew: boolean
}

export default function ManageDatesheetClient({
  examName,
  academicYearId,
  academicYearLabel,
  classes,
  subjects,
  institution,
  institutionId,
  isNew
}: ManageDatesheetClientProps) {
  const router = useRouter()

  // Theme colors
  const theme = institution?.theme as any
  const primaryColor = theme?.colors?.primary ?? '#4F46E5'
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37'
  const charcoalColor = theme?.colors?.charcoal ?? '#333333'
  const whiteColor = theme?.colors?.white ?? '#FFFFFF'

  // States
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '')
  const [localRows, setLocalRows] = useState<LocalRow[]>([])
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Format time (HH:MM:SS to HH:MM)
  const formatTimeInput = (timeStr: string | null): string => {
    if (!timeStr) return ''
    return timeStr.slice(0, 5) // Get HH:MM
  }

  // Load datesheet when class selection changes
  useEffect(() => {
    if (!selectedClassId) return
    const fetchDatesheet = async () => {
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const res = await getExamDatesheetForClassAction(examName, selectedClassId, academicYearId)
        if (res.success && res.data) {
          // Map DB slots to LocalRow format
          const mapped = (res.data || []).map((dbRow: any) => ({
            id: dbRow.id,
            subject_id: dbRow.subject_id,
            exam_date: dbRow.exam_date,
            start_time: formatTimeInput(dbRow.start_time),
            end_time: formatTimeInput(dbRow.end_time),
            total_marks: Number(dbRow.total_marks || 100),
            passing_marks: Number(dbRow.passing_marks || 40),
            venue: dbRow.venue || '',
            syllabus_file_url: dbRow.syllabus_file_url || null
          }))
          setLocalRows(mapped)
          setDeletedRowIds([])
        } else {
          setError(res.error || 'Failed to load datesheet.')
        }
      } catch (err: any) {
        console.error(err)
        setError('Error fetching existing datesheet.')
      } finally {
        setLoading(false)
      }
    }
    fetchDatesheet()
  }, [selectedClassId, examName, academicYearId])

  // Handle adding a new row locally
  const handleAddRow = () => {
    if (subjects.length === 0) {
      setError('Please create subjects in the system first.')
      return
    }

    // Default to the first subject
    const defaultSubjectId = subjects[0].id
    const newRow: LocalRow = {
      subject_id: defaultSubjectId,
      exam_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '12:00',
      total_marks: 100,
      passing_marks: 40,
      venue: '',
      syllabus_file_url: null,
      isNewLocal: true
    }

    setLocalRows(prev => [...prev, newRow])
  }

  // Update a field in a local row
  const handleUpdateRow = (index: number, field: keyof LocalRow, value: any) => {
    setLocalRows(prev => {
      const updated = [...prev]
      
      // Auto-set passing marks to 40% if total marks change and passing marks is unedited or equal to 40% of previous total marks
      if (field === 'total_marks') {
        const numericVal = Number(value) || 0
        const prevRow = updated[index]
        if (prevRow.passing_marks === Math.round(prevRow.total_marks * 0.4)) {
          updated[index] = {
            ...prevRow,
            total_marks: numericVal,
            passing_marks: Math.round(numericVal * 0.4)
          }
          return updated
        }
      }

      updated[index] = {
        ...updated[index],
        [field]: value
      }
      return updated
    })
  }

  // Remove a row locally
  const handleRemoveRow = (index: number) => {
    const rowToRemove = localRows[index]
    if (rowToRemove.id) {
      // Add to deletion list for server action
      setDeletedRowIds(prev => [...prev, rowToRemove.id!])
    }
    setLocalRows(prev => prev.filter((_, idx) => idx !== index))
  }

  // Validate datesheet rows before submitting
  const validateDatesheet = (): boolean => {
    setError(null)

    if (localRows.length === 0) {
      setError('You must add at least one subject/exam slot to save the datesheet.')
      return false
    }

    const uniqueKeys = new Set<string>()

    for (let i = 0; i < localRows.length; i++) {
      const row = localRows[i]
      if (!row.subject_id) {
        setError(`Row ${i + 1}: Subject is required.`)
        return false
      }
      if (!row.exam_date) {
        setError(`Row ${i + 1}: Exam Date is required.`)
        return false
      }
      if (row.total_marks <= 0) {
        setError(`Row ${i + 1}: Maximum Marks must be greater than 0.`)
        return false
      }
      if (row.passing_marks < 0 || row.passing_marks > row.total_marks) {
        setError(`Row ${i + 1}: Passing Marks must be between 0 and Maximum Marks.`)
        return false
      }

      // Check for duplicates to satisfy unique constraints:
      // UNIQUE (institution_id, academic_year_id, class_id, subject_id, exam_name, exam_date)
      const key = `${row.subject_id}_${row.exam_date}`
      if (uniqueKeys.has(key)) {
        const subName = subjects.find(s => s.id === row.subject_id)?.name || 'Same subject'
        setError(`Duplicate entry: ${subName} is scheduled multiple times on ${row.exam_date}.`)
        return false
      }
      uniqueKeys.add(key)
    }

    return true
  }

  // Save changes
  const handleSave = async () => {
    if (!validateDatesheet()) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Map to server input structure
      const rowsInput = localRows.map(row => ({
        id: row.id,
        subject_id: row.subject_id,
        exam_date: row.exam_date,
        start_time: row.start_time ? `${row.start_time}:00` : null,
        end_time: row.end_time ? `${row.end_time}:00` : null,
        total_marks: row.total_marks,
        passing_marks: row.passing_marks,
        venue: row.venue || null,
        syllabus_file_url: row.syllabus_file_url || null
      }))

      const res = await saveExamDatesheetForClassAction({
        examName,
        classId: selectedClassId,
        academicYearId,
        rows: rowsInput,
        deletedRowIds
      })

      if (res.success) {
        setSuccess('Datesheet saved successfully.')
        // Refetch/reload the newly saved rows
        const reloadRes = await getExamDatesheetForClassAction(examName, selectedClassId, academicYearId)
        if (reloadRes.success && reloadRes.data) {
          const mapped = (reloadRes.data || []).map((dbRow: any) => ({
            id: dbRow.id,
            subject_id: dbRow.subject_id,
            exam_date: dbRow.exam_date,
            start_time: formatTimeInput(dbRow.start_time),
            end_time: formatTimeInput(dbRow.end_time),
            total_marks: Number(dbRow.total_marks || 100),
            passing_marks: Number(dbRow.passing_marks || 40),
            venue: dbRow.venue || '',
            syllabus_file_url: dbRow.syllabus_file_url || null
          }))
          setLocalRows(mapped)
          setDeletedRowIds([])
        }
      } else {
        setError(res.error || 'Failed to save datesheet.')
      }
    } catch (err: any) {
      console.error(err)
      setError('An unexpected error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 font-body">
      {/* Back nav & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div className="space-y-1">
          <Link
            href="/dashboard/exams"
            className="group flex items-center gap-1.5 text-xs font-bold text-steel-gray hover:text-primary transition-colors mb-2 cursor-pointer w-fit"
            style={{ '--hover-color': primaryColor } as any}
          >
            &larr; Back to Exams
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-charcoal font-heading" style={{ color: charcoalColor }}>
              Datesheet Builder
            </h1>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary font-bold text-xs rounded-full" style={{ color: primaryColor, backgroundColor: primaryColor + '1a' }}>
              {examName}
            </span>
          </div>
          <p className="text-steel-gray text-xs font-caption">
            Configure exam dates, times, subjects, and maximum marks for academic session: <strong className="text-charcoal">{academicYearLabel}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Class Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-steel-gray font-caption">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs font-bold text-charcoal border border-light-gray/80 rounded-xl px-3 py-2 bg-white outline-hidden cursor-pointer"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-bold text-white rounded-xl px-5 py-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            {saving && (
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Save Datesheet
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-success/10 text-success border border-success/25 rounded-xl text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {/* Table Editor */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="animate-spin h-10 w-10 text-primary mb-3" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-bold text-steel-gray">Loading datesheet details...</span>
        </div>
      ) : (
        <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-light-gray/60 bg-cream/5 flex items-center justify-between">
            <span className="text-xs font-bold text-charcoal">
              Class Datesheet: <strong className="text-primary font-bold" style={{ color: primaryColor }}>
                {classes.find(c => c.id === selectedClassId)?.name || 'N/A'}
              </strong>
            </span>
            <span className="text-xs text-steel-gray font-semibold">
              {localRows.length} Scheduled Slots
            </span>
          </div>

          {localRows.length === 0 ? (
            <div className="p-16 text-center text-steel-gray/60 text-sm max-w-sm mx-auto space-y-4">
              <p className="text-xs leading-relaxed text-steel-gray">
                No slots configured for this class under this exam. Click "Add Exam Slot" to schedule the first subject.
              </p>
              <button
                onClick={handleAddRow}
                className="text-xs font-bold border border-dashed rounded-xl px-5 py-2.5 hover:bg-light-gray/10 transition-all cursor-pointer"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                + Add Exam Slot
              </button>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-light-gray/10 text-steel-gray font-bold text-xs uppercase tracking-wider border-b border-light-gray/60 font-heading">
                      <th className="py-4 px-5">Subject</th>
                      <th className="py-4 px-5">Exam Date</th>
                      <th className="py-4 px-5">Start Time</th>
                      <th className="py-4 px-5">End Time</th>
                      <th className="py-4 px-5 w-24">Max Marks</th>
                      <th className="py-4 px-5 w-24">Pass Marks</th>
                      <th className="py-4 px-5">Venue/Room</th>
                      <th className="py-4 px-5 text-right w-16">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray/50 font-body">
                    {localRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-light-gray/5 transition-colors">
                        <td className="py-3 px-5">
                          <select
                            value={row.subject_id}
                            onChange={(e) => handleUpdateRow(idx, 'subject_id', e.target.value)}
                            className="w-full text-xs font-semibold text-charcoal border border-light-gray/80 rounded-xl px-2.5 py-2 bg-white outline-hidden cursor-pointer"
                          >
                            {subjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-5">
                          <input
                            type="date"
                            required
                            value={row.exam_date}
                            onChange={(e) => handleUpdateRow(idx, 'exam_date', e.target.value)}
                            className="w-full text-xs font-semibold text-charcoal border border-light-gray/80 rounded-xl px-2.5 py-2 outline-hidden focus:border-steel-gray/50 transition-colors"
                          />
                        </td>
                        <td className="py-3 px-5">
                          <input
                            type="time"
                            value={row.start_time}
                            onChange={(e) => handleUpdateRow(idx, 'start_time', e.target.value)}
                            className="w-full text-xs font-semibold text-charcoal border border-light-gray/80 rounded-xl px-2.5 py-2 outline-hidden focus:border-steel-gray/50 transition-colors"
                          />
                        </td>
                        <td className="py-3 px-5">
                          <input
                            type="time"
                            value={row.end_time}
                            onChange={(e) => handleUpdateRow(idx, 'end_time', e.target.value)}
                            className="w-full text-xs font-semibold text-charcoal border border-light-gray/80 rounded-xl px-2.5 py-2 outline-hidden focus:border-steel-gray/50 transition-colors"
                          />
                        </td>
                        <td className="py-3 px-5">
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            required
                            value={row.total_marks || ''}
                            onChange={(e) => handleUpdateRow(idx, 'total_marks', Number(e.target.value))}
                            className="w-full text-xs font-semibold text-charcoal border border-light-gray/80 rounded-xl px-2.5 py-2 outline-hidden focus:border-steel-gray/50 transition-colors"
                          />
                        </td>
                        <td className="py-3 px-5">
                          <input
                            type="number"
                            min="0"
                            max={row.total_marks}
                            required
                            value={row.passing_marks || ''}
                            onChange={(e) => handleUpdateRow(idx, 'passing_marks', Number(e.target.value))}
                            className="w-full text-xs font-semibold text-charcoal border border-light-gray/80 rounded-xl px-2.5 py-2 outline-hidden focus:border-steel-gray/50 transition-colors"
                          />
                        </td>
                        <td className="py-3 px-5">
                          <input
                            type="text"
                            placeholder="e.g. Hall A, Room 102"
                            value={row.venue}
                            onChange={(e) => handleUpdateRow(idx, 'venue', e.target.value)}
                            className="w-full text-xs font-semibold text-charcoal border border-light-gray/80 rounded-xl px-2.5 py-2 outline-hidden focus:border-steel-gray/50 transition-colors"
                          />
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-2 text-danger hover:text-red-700 bg-transparent hover:bg-danger/5 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add slot footer */}
              <div className="p-5 border-t border-light-gray/60 bg-light-gray/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-xs font-bold text-white rounded-xl px-4.5 py-2.5 shadow-sm transition-all cursor-pointer hover:opacity-90 active:scale-95 flex items-center gap-1.5"
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Exam Slot
                </button>

                {success && isNew && (
                  <Link
                    href="/dashboard/exams"
                    className="text-xs font-bold text-white rounded-xl px-5 py-2.5 shadow-sm transition-all cursor-pointer hover:bg-amber-600 active:scale-95"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    Finish Builder &rarr;
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
