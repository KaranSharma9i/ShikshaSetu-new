'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'

interface SubjectItem {
  id: string
  name: string
}

interface TeacherFilterBarProps {
  subjects: SubjectItem[]
}

export default function TeacherFilterBar({ subjects }: TeacherFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local state for immediate UI feedback
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [subject, setSubject] = useState(searchParams.get('subject') || 'all')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')

  // Sync state if URL changes externally
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setSubject(searchParams.get('subject') || 'all')
    setStatus(searchParams.get('status') || 'all')
  }, [searchParams])

  // Helper to push new query params
  const updateQueryParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    // Reset page if filtering
    params.delete('page')

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // Handle inputs
  const handleSearchChange = (val: string) => {
    setSearch(val)
    // Debounce/delay update to URL so typing is smooth
    const delayDebounceFn = setTimeout(() => {
      updateQueryParams({ search: val })
    }, 400)
    return () => clearTimeout(delayDebounceFn)
  }

  const handleSubjectChange = (val: string) => {
    setSubject(val)
    updateQueryParams({ subject: val })
  }

  const handleStatusChange = (val: string) => {
    setStatus(val)
    updateQueryParams({ status: val })
  }

  const handleReset = () => {
    setSearch('')
    setSubject('all')
    setStatus('all')
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasActiveFilters = search || subject !== 'all' || status !== 'all'

  return (
    <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Text Search */}
        <div className="relative">
          <label htmlFor="search" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
            Search Teacher
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              placeholder="Search by name or employee code..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-cream/35 border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 pl-10 pr-4 text-sm font-body text-charcoal placeholder-steel-gray/50 transition-all outline-none"
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-steel-gray/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Specialization Filter */}
        <div>
          <label htmlFor="subject" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
            Filter by Specialization
          </label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full bg-cream/35 border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer"
          >
            <option value="all">All Specializations</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full bg-cream/35 border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Row action & Loading indicator */}
      {(hasActiveFilters || isPending) && (
        <div className="flex items-center justify-between pt-2 border-t border-light-gray/40">
          <div className="flex items-center gap-2">
            {isPending && (
              <span className="flex items-center gap-1.5 text-xs text-steel-gray font-medium">
                <svg className="animate-spin h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Filtering directory...
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-danger hover:text-red-700 transition-colors py-1.5 px-3 rounded-lg hover:bg-danger/5 transition-all cursor-pointer active:scale-95"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
