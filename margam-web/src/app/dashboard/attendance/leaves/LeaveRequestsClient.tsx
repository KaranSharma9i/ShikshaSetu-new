'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  getLeaveRequestsAction,
  reviewLeaveAction,
  createLeaveAction,
  getSectionStudentsAction,
} from '../actions'
import type { LeaveRequestItem, LeaveStatus, SectionOption } from '@/lib/repositories/attendance'
import { formatLongDate } from '@/utils/date'

interface Props {
  sections: SectionOption[]
  today: string
}

type Filter = LeaveStatus | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

const STATUS_BADGE: Record<LeaveStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200/60',
}

function shortDate(d: string) {
  return formatLongDate(d).replace(/^[A-Za-z]+,\s*/, '')
}

export default function LeaveRequestsClient({ sections, today }: Props) {
  const [filter, setFilter] = useState<Filter>('pending')
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  // Record-leave form
  const [showForm, setShowForm] = useState(false)
  const [formSection, setFormSection] = useState(sections[0]?.id || '')
  const [students, setStudents] = useState<Array<{ id: string; name: string; rollNumber: string | null }>>([])
  const [formStudent, setFormStudent] = useState('')
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [reason, setReason] = useState('')
  const [approveNow, setApproveNow] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const res = await getLeaveRequestsAction(filter)
    setIsLoading(false)
    if (!res.success || !res.leaves) {
      setLeaves([])
      setError(res.error || 'Failed to load leave requests.')
      return
    }
    setLeaves(res.leaves)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!showForm || !formSection) return
    let cancelled = false
    setStudents([])
    setFormStudent('')
    getSectionStudentsAction(formSection).then((res) => {
      if (cancelled) return
      if (res.success && res.students) setStudents(res.students)
      else setFormError(res.error || 'Failed to load students.')
    })
    return () => {
      cancelled = true
    }
  }, [showForm, formSection])

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    setBusyId(id)
    setError(null)
    setSuccess(null)
    const res = await reviewLeaveAction(id, decision, notes[id] || null)
    setBusyId(null)
    if (!res.success) {
      setError(res.error || 'Failed to update the leave request.')
      return
    }
    setSuccess(
      decision === 'approved'
        ? 'Leave approved. Any absences already recorded for these dates were marked as excused.'
        : 'Leave request rejected.'
    )
    load()
  }

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!formStudent) return setFormError('Select a student.')
    if (!reason.trim()) return setFormError('Enter a reason for the leave.')
    if (toDate < fromDate) return setFormError('The end date cannot be before the start date.')
    setIsSubmitting(true)
    const res = await createLeaveAction({ studentId: formStudent, fromDate, toDate, reason, approve: approveNow })
    setIsSubmitting(false)
    if (!res.success) {
      setFormError(res.error || 'Failed to record leave.')
      return
    }
    setSuccess(approveNow ? 'Leave recorded and approved.' : 'Leave recorded as pending.')
    setReason('')
    setFormStudent('')
    setShowForm(false)
    setFilter(approveNow ? 'approved' : 'pending')
    load()
  }

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Leave Requests</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Review student leave applications. Approved leave days are recorded as excused and do not count against attendance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
          }}
          className="self-start md:self-auto px-4 py-2.5 text-sm font-bold rounded-xl bg-primary text-white shadow hover:opacity-90 cursor-pointer"
        >
          {showForm ? 'Close' : '+ Record Leave'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitLeave} className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-charcoal font-heading uppercase tracking-wider">Record a leave application</h2>
          {formError && <div role="alert" className="p-3 bg-rose-50 border border-rose-200/60 rounded-xl text-rose-700 text-sm">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="lv-section" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-1.5">Class &amp; Section</label>
              <select id="lv-section" value={formSection} onChange={(e) => setFormSection(e.target.value)} className="w-full bg-cream/45 border border-light-gray/60 rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-primary">
                {sections.length === 0 && <option value="">No sections</option>}
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lv-student" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-1.5">Student</label>
              <select id="lv-student" value={formStudent} onChange={(e) => setFormStudent(e.target.value)} className="w-full bg-cream/45 border border-light-gray/60 rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-primary">
                <option value="">{students.length === 0 ? 'Loading…' : 'Select student'}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.rollNumber ? `${s.rollNumber}. ` : ''}{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lv-from" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-1.5">From</label>
              <input id="lv-from" type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); if (toDate < e.target.value) setToDate(e.target.value) }} className="w-full bg-cream/45 border border-light-gray/60 rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label htmlFor="lv-to" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-1.5">To</label>
              <input id="lv-to" type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-cream/45 border border-light-gray/60 rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label htmlFor="lv-reason" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-1.5">Reason</label>
            <textarea id="lv-reason" value={reason} maxLength={1000} rows={2} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Medical — fever, family function…" className="w-full bg-cream/45 border border-light-gray/60 rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-primary" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-charcoal cursor-pointer">
              <input type="checkbox" checked={approveNow} onChange={(e) => setApproveNow(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
              Approve immediately
            </label>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-white shadow hover:opacity-90 disabled:opacity-50 cursor-pointer">
              {isSubmitting ? 'Saving…' : 'Save Leave'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter leave requests">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
              filter === f.key ? 'bg-primary text-white border-primary' : 'bg-white text-steel-gray border-light-gray/60 hover:text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div role="alert" className="p-4 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-700 text-sm font-semibold">{error}</div>}
      {success && <div role="status" className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-2xl text-emerald-700 text-sm font-semibold">{success}</div>}

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-steel-gray font-medium">Loading leave requests…</p>
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white border border-light-gray/60 rounded-2xl py-16 text-center text-sm text-steel-gray">
          <h3 className="font-bold text-charcoal font-heading">No {filter === 'all' ? '' : filter} leave requests</h3>
          <p className="text-xs mt-1">Use “Record Leave” to log a leave application received from a parent.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {leaves.map((l) => (
            <article key={l.id} className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-bold text-charcoal font-heading">{l.studentName}</h3>
                  <p className="text-[11px] text-steel-gray">{[l.studentCode, l.classSection].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_BADGE[l.status]}`}>{l.status}</span>
              </div>
              <p className="text-sm text-charcoal">
                <strong>{shortDate(l.fromDate)}</strong>
                {l.toDate !== l.fromDate && <> – <strong>{shortDate(l.toDate)}</strong></>}
                <span className="text-steel-gray"> · {l.days} day{l.days === 1 ? '' : 's'}</span>
              </p>
              <p className="text-sm text-steel-gray bg-cream/30 rounded-xl p-3 whitespace-pre-wrap break-words">{l.reason}</p>
              {l.reviewNote && <p className="text-xs text-steel-gray"><strong>Note:</strong> {l.reviewNote}</p>}
              {l.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={notes[l.id] || ''}
                    maxLength={500}
                    onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))}
                    placeholder="Note (optional)"
                    aria-label={`Review note for ${l.studentName}`}
                    className="flex-1 bg-white border border-light-gray/60 rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button type="button" disabled={busyId === l.id} onClick={() => review(l.id, 'approved')} className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                      Approve
                    </button>
                    <button type="button" disabled={busyId === l.id} onClick={() => review(l.id, 'rejected')} className="px-3 py-2 text-xs font-bold rounded-xl bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
