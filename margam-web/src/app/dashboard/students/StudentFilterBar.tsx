'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'

interface ClassItem {
  id: string
  name: string
}

interface SectionItem {
  id: string
  name: string
  class_id: string
}

interface StudentFilterBarProps {
  classes: ClassItem[]
  allSections: SectionItem[]
}

export default function StudentFilterBar({ classes, allSections }: StudentFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local state for immediate UI feedback
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [classId, setClassId] = useState(searchParams.get('classId') || '')
  const [sectionId, setSectionId] = useState(searchParams.get('sectionId') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')

  // Filter sections based on selected class
  const filteredSections = allSections.filter((sec) => sec.class_id === classId)

  // Sync state if URL changes externally
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setClassId(searchParams.get('classId') || '')
    setSectionId(searchParams.get('sectionId') || '')
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

  const handleClassChange = (val: string) => {
    setClassId(val)
    setSectionId('') // Reset section on class change
    updateQueryParams({ classId: val, sectionId: null })
  }

  const handleSectionChange = (val: string) => {
    setSectionId(val)
    updateQueryParams({ sectionId: val })
  }

  const handleStatusChange = (val: string) => {
    setStatus(val)
    updateQueryParams({ status: val })
  }

  const handleReset = () => {
    setSearch('')
    setClassId('')
    setSectionId('')
    setStatus('all')
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasActiveFilters = search || classId || sectionId || status !== 'all'

  return (
    <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Text Search */}
        <div className="relative">
          <label htmlFor="search" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
            Search Student
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              placeholder="Search by name or code..."
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

        {/* Class Filter */}
        <div>
          <label htmlFor="class" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
            Filter by Class
          </label>
          <select
            id="class"
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full bg-cream/35 border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Class {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div>
          <label htmlFor="section" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
            Filter by Section
          </label>
          <select
            id="section"
            value={sectionId}
            onChange={(e) => handleSectionChange(e.target.value)}
            disabled={!classId}
            className="w-full bg-cream/35 border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Sections</option>
            {filteredSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                Section {sec.name}
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
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Row action & Loading indicator */}
      { (hasActiveFilters || isPending) && (
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
