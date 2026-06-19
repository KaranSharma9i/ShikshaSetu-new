'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setupNextAcademicYearAction } from '../actions'

interface AcademicYear {
  id: string
  label: string
  startsOn: string
  endsOn: string
}

interface PreviewStats {
  sectionsCount: number
  subjectsCount: number
}

interface SetupFormProps {
  currentYear: AcademicYear | null
  previewStats: PreviewStats
}

export default function SetupForm({ currentYear, previewStats }: SetupFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // 1. Calculate suggested values based on current year
  let suggestedLabel = ''
  let suggestedStartsOn = ''
  let suggestedEndsOn = ''

  if (currentYear?.label) {
    const parts = currentYear.label.split('-')
    if (parts.length === 2) {
      const yr1 = parseInt(parts[0], 10)
      const yr2 = parseInt(parts[1], 10)
      if (!isNaN(yr1) && !isNaN(yr2)) {
        suggestedLabel = `${yr1 + 1}-${String(yr2 + 1).slice(-2)}`
      }
    }
  }

  if (currentYear?.startsOn) {
    const d = new Date(currentYear.startsOn)
    d.setFullYear(d.getFullYear() + 1)
    // format as YYYY-MM-DD
    suggestedStartsOn = d.toISOString().split('T')[0]
  }

  if (currentYear?.endsOn) {
    const d = new Date(currentYear.endsOn)
    d.setFullYear(d.getFullYear() + 1)
    // format as YYYY-MM-DD
    suggestedEndsOn = d.toISOString().split('T')[0]
  }

  // 2. Form state
  const [label, setLabel] = useState(suggestedLabel)
  const [startsOn, setStartsOn] = useState(suggestedStartsOn)
  const [endsOn, setEndsOn] = useState(suggestedEndsOn)
  const [cloneStructure, setCloneStructure] = useState(true)

  // 3. UI states
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    label: string
    sectionsCloned: number
    subjectsCloned: number
  } | null>(null)

  // 4. Handle front-end validation
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const cleanLabel = label.trim()
    if (!/^\d{4}-\d{2}$/.test(cleanLabel)) {
      setErrorMsg('Invalid label format. Must be YYYY-YY (e.g. 2026-27).')
      return
    }

    if (!startsOn) {
      setErrorMsg('Please specify the start date.')
      return
    }

    if (!endsOn) {
      setErrorMsg('Please specify the end date.')
      return
    }

    if (new Date(startsOn) >= new Date(endsOn)) {
      setErrorMsg('Start date must be before the end date.')
      return
    }

    setShowConfirmModal(true)
  }

  // 5. Handle submission via Server Action
  const handleConfirmSubmit = () => {
    setShowConfirmModal(false)
    setErrorMsg(null)

    startTransition(async () => {
      const res = await setupNextAcademicYearAction({
        label: label.trim(),
        startsOn,
        endsOn,
        fromYearId: cloneStructure && currentYear ? currentYear.id : null,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to set up academic year.')
        return
      }

      setSuccessData({
        label: label.trim(),
        sectionsCloned: res.data?.sectionsCloned || 0,
        subjectsCloned: res.data?.subjectsCloned || 0,
      })
    })
  }

  // If successfully completed setup
  if (successData) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-light-gray/60 rounded-2xl p-8 shadow-sm text-center space-y-6">
        <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-full w-fit mx-auto border border-emerald-500/20">
          <svg className="w-12 h-12 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-charcoal font-heading">Academic Year Configured!</h2>
          <p className="text-sm text-steel-gray font-caption max-w-sm mx-auto">
            Academic year <strong>{successData.label}</strong> is now registered.
          </p>
        </div>

        <div className="bg-cream/35 border border-light-gray/40 rounded-xl p-5 text-left text-xs font-semibold text-charcoal space-y-3">
          <div className="flex justify-between">
            <span className="text-steel-gray">New Year:</span>
            <span>{successData.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">Starts on:</span>
            <span>{new Date(startsOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">Ends on:</span>
            <span>{new Date(endsOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="border-t border-light-gray/40 pt-3 flex justify-between">
            <span className="text-steel-gray">Sections Cloned:</span>
            <span className="text-primary font-bold">{successData.sectionsCloned}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-gray">Subject Assignments Cloned:</span>
            <span className="text-primary font-bold">{successData.subjectsCloned}</span>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard/promotions"
            className="inline-flex w-full items-center justify-center px-4 py-3 text-sm font-bold text-white bg-primary hover:bg-primary-alt rounded-xl shadow transition-all active:scale-[0.98]"
          >
            Go to Promotions Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button link */}
      <div>
        <Link
          href="/dashboard/promotions"
          className="inline-flex items-center text-xs font-bold text-steel-gray hover:text-primary transition-colors gap-1.5"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-heading">Set Up Next Academic Year</h1>
          <p className="text-steel-gray text-xs mt-1 font-caption">
            Create a new academic calendar and clone the current grade layout structures.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-xs font-semibold text-danger">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handlePreSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Year Label */}
            <div className="sm:col-span-3">
              <label htmlFor="label" className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider mb-2">
                Academic Year Label
              </label>
              <input
                type="text"
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. 2026-27"
                maxLength={7}
                className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body placeholder:text-steel-gray/50"
                required
              />
              <p className="text-[10px] text-steel-gray/80 font-caption mt-1.5">
                Must be in YYYY-YY format. E.g., if active year is 2025-26, input 2026-27.
              </p>
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="startsOn" className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startsOn"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="endsOn" className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endsOn"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                className="w-full bg-cream/20 hover:bg-cream/30 border border-light-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all font-body text-charcoal"
                required
              />
            </div>

            {/* Clone Structure Checkbox */}
            <div className="sm:col-span-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloneStructure}
                  onChange={(e) => setCloneStructure(e.target.checked)}
                  disabled={!currentYear}
                  className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary border-light-gray"
                />
                <div>
                  <span className="block text-xs font-bold text-charcoal font-caption uppercase tracking-wider">
                    Clone sections & subject assignments
                  </span>
                  <span className="block text-[11px] text-steel-gray font-caption mt-1 leading-relaxed">
                    {currentYear ? (
                      `Copies all active sections and subject assignments configured in the active academic year (${currentYear.label}) to the new year.`
                    ) : (
                      'Disabled: No current academic year is set up to clone from.'
                    )}
                  </span>
                </div>
              </label>
            </div>

          </div>

          {/* Live Preview Card */}
          {cloneStructure && currentYear && (
            <div className="bg-cream/25 border border-light-gray/50 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-charcoal font-heading uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Structure Preview (Cloning from {currentYear.label})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-light-gray/40 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] font-bold text-steel-gray uppercase font-caption">Sections to Create</span>
                    <span className="text-2xl font-extrabold text-primary font-heading mt-1 block">
                      {previewStats.sectionsCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-primary/5 text-primary rounded-lg">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>

                <div className="bg-white border border-light-gray/40 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] font-bold text-steel-gray uppercase font-caption">Subject Assignments</span>
                    <span className="text-2xl font-extrabold text-primary font-heading mt-1 block">
                      {previewStats.subjectsCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-primary/5 text-primary rounded-lg">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-light-gray/50 pt-6">
            <Link
              href="/dashboard/promotions"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isPending ? 'Setting up...' : 'Create & Set Up Year'}
            </button>
          </div>

        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-light-gray/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <h3 className="text-lg font-bold text-charcoal font-heading">
              Confirm Academic Year Setup
            </h3>
            <p className="text-xs text-steel-gray font-caption leading-relaxed">
              This will create the academic calendar <strong>{label}</strong> ({startsOn} to {endsOn}).
              {cloneStructure && currentYear ? (
                <span> It will automatically clone <strong>{previewStats.sectionsCount} sections</strong> and <strong>{previewStats.subjectsCount} subject assignments</strong> from {currentYear.label}.</span>
              ) : (
                ' No structures will be cloned. The year will start completely empty.'
              )}
            </p>
            <p className="text-xs font-bold text-primary bg-cream/40 border border-light-gray/40 rounded-xl p-3">
              This operation runs atomically and cannot be easily undone without reversing the entire batch.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl transition-all cursor-pointer active:scale-[0.98]"
              >
                Confirm Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
