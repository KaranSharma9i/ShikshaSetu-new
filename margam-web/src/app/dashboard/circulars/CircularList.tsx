'use client'

import { useState } from 'react'
import { deleteCircularAction } from './actions'

interface CircularItem {
  id: string
  title: string
  content: string
  publish_date: string
  expiry_date: string | null
  created_by: string | null
  created_at: string
  category: string
  target_roles: string[]
  target_class_id: string | null
  class_name: string | null
  creator_name: string
}

interface CircularListProps {
  circulars: CircularItem[]
  institutionId: string
}

export default function CircularList({ circulars, institutionId }: CircularListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal State for viewing details
  const [activeCircular, setActiveCircular] = useState<CircularItem | null>(null)

  // Confirmation Modal State for deletion
  const [confirmDeleteCircular, setConfirmDeleteCircular] = useState<CircularItem | null>(null)

  const handleDelete = async (id: string) => {
    setError(null)
    setDeleting(true)
    try {
      const res = await deleteCircularAction(id, institutionId)
      if (!res.success) {
        setError(res.error || 'Failed to delete circular.')
      } else {
        setConfirmDeleteCircular(null)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setDeleting(false)
    }
  }

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Urgent':
        return 'bg-danger/10 text-danger border border-danger/25'
      case 'Holiday':
        return 'bg-warning/10 text-amber-800 border border-warning/20'
      case 'Event':
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      default:
        return 'bg-teal-50 text-teal-700 border border-teal-200'
    }
  }

  const formatAudience = (roles: string[], className: string | null) => {
    if (!roles || roles.length === 0) return 'No targets'
    
    // Check if it includes all major roles
    const allRoles = ['institution_admin', 'teacher', 'student', 'driver']
    const hasAll = allRoles.every((r) => roles.includes(r))
    if (hasAll) return 'All Staff & Students'

    const parts: string[] = []
    if (roles.includes('institution_admin')) parts.push('Admins')
    if (roles.includes('teacher')) parts.push('Teachers')
    if (roles.includes('driver')) parts.push('Drivers')
    if (roles.includes('student')) {
      if (className) {
        parts.push(`Students (${className})`)
      } else {
        parts.push('Students')
      }
    }

    return parts.join(', ')
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (circulars.length === 0) {
    return (
      <div className="bg-white border border-light-gray/60 rounded-2xl py-16 text-center text-steel-gray/60 text-sm font-body max-w-md mx-auto space-y-3 shadow-sm">
        <div className="p-3 bg-cream/30 text-steel-gray rounded-full w-fit mx-auto border border-light-gray/40">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-charcoal font-heading">No Circulars Found</h3>
        <p className="text-xs text-steel-gray/80 px-4">
          No announcements match your search parameters. Create a new circular or try adjusting filters.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Circulars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {circulars.map((circular) => (
          <div
            key={circular.id}
            className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-steel-gray/25 transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Category and Date Header */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-extrabold font-caption px-2 py-0.5 rounded-full ${getCategoryBadgeClass(circular.category)}`}>
                  {circular.category}
                </span>
                <span className="text-[11px] font-semibold text-steel-gray font-caption">
                  {formatDate(circular.publish_date)}
                </span>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-base font-bold text-charcoal font-heading leading-snug line-clamp-1">
                  {circular.title}
                </h3>
              </div>

              {/* Description Snippet */}
              <p className="text-sm font-medium text-steel-gray font-body line-clamp-3 leading-relaxed">
                {circular.content}
              </p>

              {/* Audience details */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-light-gray/30">
                <div className="flex items-center gap-1.5 text-xs text-charcoal/80 font-semibold font-caption">
                  <svg className="w-3.5 h-3.5 text-steel-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{formatAudience(circular.target_roles, circular.class_name)}</span>
                </div>
                {circular.expiry_date && (
                  <div className="flex items-center gap-1.5 text-xs text-danger/80 font-semibold font-caption">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Expires: {formatDate(circular.expiry_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-light-gray/35">
              <button
                onClick={() => setActiveCircular(circular)}
                className="text-xs font-bold text-primary hover:text-primary-alt border border-light-gray/80 hover:border-steel-gray/50 rounded-xl px-4 py-2 hover:bg-cream/20 transition-all cursor-pointer active:scale-95"
              >
                Read Full
              </button>
              <button
                onClick={() => setConfirmDeleteCircular(circular)}
                className="text-xs font-semibold text-danger hover:text-red-700 p-2 hover:bg-danger/5 rounded-xl transition-all cursor-pointer active:scale-95"
                title="Delete Circular"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Read Details Modal */}
      {activeCircular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-body">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-light-gray/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-light-gray/50 flex items-center justify-between bg-cream/10">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] uppercase tracking-wider font-extrabold font-caption px-2 py-0.5 rounded-full ${getCategoryBadgeClass(activeCircular.category)}`}>
                  {activeCircular.category}
                </span>
                <span className="text-xs font-semibold text-steel-gray font-caption">
                  {formatDate(activeCircular.publish_date)}
                </span>
              </div>
              <button
                onClick={() => setActiveCircular(null)}
                className="text-steel-gray hover:text-charcoal p-1.5 hover:bg-light-gray/30 rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-charcoal font-heading leading-tight">
                {activeCircular.title}
              </h2>
              
              <div className="text-sm font-medium text-charcoal/90 font-body leading-relaxed whitespace-pre-wrap">
                {activeCircular.content}
              </div>

              {/* Creator details and Expiry */}
              <div className="bg-cream/15 border border-light-gray/40 rounded-xl p-4 space-y-2 text-xs font-caption text-steel-gray mt-6">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-charcoal">Audience:</span>
                  <span>{formatAudience(activeCircular.target_roles, activeCircular.class_name)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-charcoal">Broadcast By:</span>
                  <span>{activeCircular.creator_name}</span>
                </div>
                {activeCircular.expiry_date && (
                  <div className="flex items-center gap-2 text-danger">
                    <span className="font-bold">Expiry Date:</span>
                    <span>{formatDate(activeCircular.expiry_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-light-gray/50 flex justify-end bg-cream/10">
              <button
                onClick={() => setActiveCircular(null)}
                className="text-xs font-bold text-white bg-primary hover:bg-primary-alt rounded-xl px-5 py-2.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteCircular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-body animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full border border-light-gray/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-danger/10 text-danger rounded-full border border-danger/20 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-charcoal font-heading">Delete Circular?</h3>
                <p className="text-sm text-steel-gray leading-relaxed font-body">
                  Are you sure you want to delete <strong className="text-charcoal font-semibold">&ldquo;{confirmDeleteCircular.title}&rdquo;</strong>? This will remove the announcement for all targeted users. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDeleteCircular(null)}
                className="text-xs font-bold text-steel-gray hover:text-charcoal border border-light-gray/80 hover:border-steel-gray/50 rounded-xl px-4 py-2.5 bg-white transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(confirmDeleteCircular.id)}
                className="text-xs font-bold text-white bg-danger hover:bg-red-700 rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
