'use client'

import { useState, useTransition } from 'react'
import { undoPromotionBatchAction } from './actions'

interface PromotionBatch {
  id: string
  performedAt: string
  isUndone: boolean
  undoneAt: string | null
  fromYearLabel: string
  toYearLabel: string
  performerName: string
  undonePerformerName: string | null
  studentCount: number
}

interface PromotionHistoryTableProps {
  initialBatches: PromotionBatch[]
}

export default function PromotionHistoryTable({ initialBatches }: PromotionHistoryTableProps) {
  const [batches, setBatches] = useState<PromotionBatch[]>(initialBatches)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [confirmBatch, setConfirmBatch] = useState<PromotionBatch | null>(null)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const handleUndoClick = (batch: PromotionBatch) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setConfirmBatch(batch)
  }

  const handleConfirmUndo = () => {
    if (!confirmBatch) return

    const batchToUndo = confirmBatch
    setConfirmBatch(null)

    startTransition(async () => {
      try {
        const res = await undoPromotionBatchAction(batchToUndo.id)
        if (res.success) {
          // Update local state to show it was undone
          setBatches((prev) =>
            prev.map((b) =>
              b.id === batchToUndo.id
                ? { ...b, isUndone: true, undoneAt: new Date().toISOString() }
                : b
            )
          )
          setSuccessMsg(
            `Successfully reverted promotion batch from academic year ${batchToUndo.fromYearLabel} to ${batchToUndo.toYearLabel}.`
          )
        } else {
          setErrorMsg(res.error || 'Failed to undo promotion batch.')
        }
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.message || 'An unexpected error occurred.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {errorMsg && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-xs font-semibold text-red-600 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-xs font-semibold text-emerald-600 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{successMsg}</div>
        </div>
      )}

      {/* Main Card Wrapper */}
      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-light-gray/60 bg-cream/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-charcoal font-heading">Promotion History</h3>
            <p className="text-xs text-steel-gray font-caption mt-0.5">
              Review prior bulk student promotion actions and perform whole-batch undos if needed.
            </p>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="py-12 text-center text-steel-gray/60 text-sm font-body">
            No student promotion batches recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-light-gray/60 bg-cream/15">
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Batch Run Details</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">From Year</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">To Year</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-center">Students</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray/40">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-cream/10 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-charcoal font-heading text-sm">
                        {formatDate(batch.performedAt)}
                      </div>
                      <div className="text-[11px] text-steel-gray font-caption mt-0.5">
                        Run by {batch.performerName}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-steel-gray font-body">
                      {batch.fromYearLabel}
                    </td>
                    <td className="py-4 px-6 text-sm text-steel-gray font-body">
                      {batch.toYearLabel}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-primary font-heading text-center">
                      {batch.studentCount} student(s)
                    </td>
                    <td className="py-4 px-6">
                      {batch.isUndone ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20 font-caption uppercase">
                          Undone / Reverted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-caption uppercase">
                          Active / Completed
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {!batch.isUndone ? (
                        <button
                          type="button"
                          onClick={() => handleUndoClick(batch)}
                          disabled={isPending}
                          className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-500 border border-red-200/50 hover:border-red-500 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        >
                          Undo Promotion
                        </button>
                      ) : (
                        <span className="text-xs text-steel-gray/60 font-caption italic">
                          No actions available
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-light-gray/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <h3 className="text-lg font-bold text-charcoal font-heading flex items-center gap-2 text-red-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Confirm Revert Promotion Batch
            </h3>
            <div className="text-xs text-steel-gray font-caption leading-relaxed space-y-2">
              <p>
                Are you sure you want to undo this promotion batch performed on{' '}
                <strong>{formatDate(confirmBatch.performedAt)}</strong>?
              </p>
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-red-700">
                <strong>Warning:</strong> This will reactivate the students' previous enrollments, delete their new target enrollments, and remove associated elective selections for this academic year transition (<strong>{confirmBatch.fromYearLabel} &rarr; {confirmBatch.toYearLabel}</strong>).
              </div>
              <p>
                This operation is atomic and irreversible. It will be blocked if any student has attendance records or exam marks registered in their new class.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBatch(null)}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-primary hover:text-primary-alt bg-white hover:bg-cream/20 border border-light-gray rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUndo}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded-xl transition-all cursor-pointer active:scale-[0.98]"
              >
                Confirm Revert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
