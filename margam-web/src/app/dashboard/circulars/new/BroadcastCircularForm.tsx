'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCircularAction } from '../actions'

interface ClassItem {
  id: string
  name: string
}

interface BroadcastCircularFormProps {
  institutionId: string
  classes: ClassItem[]
}

const AVAILABLE_ROLES = [
  { id: 'institution_admin', name: 'Institution Admins' },
  { id: 'teacher', name: 'Teachers' },
  { id: 'student', name: 'Students' },
  { id: 'driver', name: 'Drivers' },
]

export default function BroadcastCircularForm({ institutionId, classes }: BroadcastCircularFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form States
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Announcement')
  const [targetRoles, setTargetRoles] = useState<string[]>(['institution_admin', 'teacher', 'student', 'driver'])
  const [targetClassId, setTargetClassId] = useState<string>('all')
  const [expiryDate, setExpiryDate] = useState('')

  const handleRoleToggle = (roleId: string) => {
    setTargetRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validations
    if (!title.trim()) {
      setError('Title is required')
      setLoading(false)
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      setLoading(false)
      return
    }
    if (targetRoles.length === 0) {
      setError('At least one target audience role must be selected')
      setLoading(false)
      return
    }

    try {
      const res = await createCircularAction(institutionId, {
        title: title.trim(),
        content: content.trim(),
        category,
        targetRoles,
        targetClassId: targetClassId === 'all' ? null : targetClassId,
        expiryDate: expiryDate || null,
      })

      if (!res.success) {
        setError(res.error || 'Failed to broadcast circular.')
        setLoading(false)
      } else {
        router.push('/dashboard/circulars')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  const isStudentSelected = targetRoles.includes('student')

  return (
    <div className="space-y-6">
      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-charcoal font-heading border-b border-light-gray/40 pb-3">
            Circular Details
          </h2>

          {error && (
            <div className="p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-sm font-semibold flex items-center gap-2 font-body animate-in fade-in duration-100">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Title <span className="text-danger">*</span>
              </label>
              <input
                id="title"
                type="text"
                placeholder="Enter circular title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full bg-cream/35 border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer"
              >
                <option value="Announcement">Announcement</option>
                <option value="Urgent">Urgent</option>
                <option value="Event">Event</option>
                <option value="Holiday">Holiday</option>
              </select>
            </div>

            {/* Expiry Date */}
            <div>
              <label htmlFor="expiryDate" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Expiry Date <span className="text-steel-gray/60 font-normal">(Optional)</span>
              </label>
              <input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer"
              />
            </div>

            {/* Target Audience Roles Selection */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Target Audience <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-cream/20 border border-light-gray/50 rounded-xl">
                {AVAILABLE_ROLES.map((role) => {
                  const checked = targetRoles.includes(role.id)
                  return (
                    <label key={role.id} className="flex items-center gap-2 text-sm font-semibold text-charcoal cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleRoleToggle(role.id)}
                        className="rounded text-primary focus:ring-primary h-4 w-4 border-light-gray/80"
                      />
                      <span>{role.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Class target selection, conditionally visible */}
            {isStudentSelected && (
              <div className="md:col-span-2 animate-in slide-in-from-top-4 duration-150">
                <label htmlFor="classSelect" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                  Target Class <span className="text-steel-gray/60 font-normal">(Optional)</span>
                </label>
                <select
                  id="classSelect"
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full bg-cream/35 border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer"
                >
                  <option value="all">All Classes (Broadcast to all students)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Content Textarea */}
            <div className="md:col-span-2">
              <label htmlFor="content" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Content / Announcement Body <span className="text-danger">*</span>
              </label>
              <textarea
                id="content"
                rows={6}
                placeholder="Type circular announcement details here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 border-t border-light-gray/40 pt-6 mt-6">
            <button
              type="button"
              disabled={loading}
              onClick={() => router.push('/dashboard/circulars')}
              className="text-xs md:text-sm font-bold text-steel-gray hover:text-charcoal border border-light-gray/80 hover:border-steel-gray/50 rounded-xl px-5 py-3 bg-white transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center text-xs md:text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl px-5 py-3 shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Broadcast Circular
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
