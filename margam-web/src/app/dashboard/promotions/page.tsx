import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentAcademicYear, getAcademicYears } from '@/lib/repositories/academic'
import { getPromotionBatches } from '@/lib/repositories/student'
import PromotionHistoryTable from './PromotionHistoryTable'

export default async function PromotionsPage() {
  const supabase = await createClient()

  // 1. Retrieve session user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Retrieve user profile for institution association
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id

  // 3. Fetch academic years and promotion batches history
  const currentYear = await getCurrentAcademicYear(supabase, institutionId)
  const allYears = await getAcademicYears(supabase, institutionId)
  const promotionHistory = await getPromotionBatches(supabase, institutionId)

  // 4. Fetch additional count data (sections count per academic year)
  const { data: sectionsCountData, error: sectionsError } = await supabase
    .from('sections')
    .select('academic_year_id')
    .is('deleted_at', null)

  const sectionCountsMap: Record<string, number> = {}
  if (!sectionsError && sectionsCountData) {
    sectionsCountData.forEach((sec) => {
      const ayId = sec.academic_year_id
      sectionCountsMap[ayId] = (sectionCountsMap[ayId] || 0) + 1
    })
  }

  // 5. Determine if "next" year exists
  // E.g., if current is "2025-26", the next year label is "2026-27".
  let nextYearLabel = ''
  let hasNextYear = false
  if (currentYear?.label) {
    const parts = currentYear.label.split('-')
    if (parts.length === 2) {
      const yr1 = parseInt(parts[0], 10)
      const yr2 = parseInt(parts[1], 10)
      if (!isNaN(yr1) && !isNaN(yr2)) {
        nextYearLabel = `${yr1 + 1}-${String(yr2 + 1).slice(-2)}`
        hasNextYear = allYears.some(ay => ay.label === nextYearLabel)
      }
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-8 font-body">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Promotions & Academic Setup</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Manage academic years, clone class-section structures, and run year-end student promotions.
          </p>
        </div>
      </div>

      {/* Warning alert if next academic year is not set up */}
      {!hasNextYear && currentYear && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-charcoal font-heading">Next Academic Year Structure Required</h4>
              <p className="text-xs text-steel-gray font-caption mt-1 max-w-xl">
                The next academic year ({nextYearLabel || 'upcoming term'}) has not been set up. Before you can execute student promotions, you must configure the next academic year and clone the current class structure.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/promotions/setup"
            className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Set Up {nextYearLabel || 'Next Year'}
          </Link>
        </div>
      )}

      {/* Main Promotions Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column: Quick Actions */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-charcoal font-heading">Promotion Modules</h3>
            <p className="text-xs text-steel-gray font-caption">Select an action below to manage students or structure transitions.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* Setup Academic Year */}
              <Link
                href="/dashboard/promotions/setup"
                className="group flex flex-col justify-between p-5 border border-light-gray/60 hover:border-primary/20 rounded-xl hover:bg-cream/10 transition-all duration-300"
              >
                <div>
                  <div className="p-2.5 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white rounded-lg w-fit transition-all duration-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-charcoal mt-4 font-heading group-hover:text-primary transition-colors">Set Up Next Academic Year</h4>
                  <p className="text-[11px] text-steel-gray font-caption mt-1.5 leading-relaxed">
                    Create the next academic year calendar and automatically clone all classes, sections, and subjects.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-primary mt-4 group-hover:translate-x-1 transition-transform">
                  Configure Year &rarr;
                </div>
              </Link>

              {/* Mid-Year Move Section */}
              <Link
                href="/dashboard/promotions/move-section"
                className="group flex flex-col justify-between p-5 border border-light-gray/60 hover:border-primary/20 rounded-xl hover:bg-cream/10 transition-all duration-300"
              >
                <div>
                  <div className="p-2.5 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white rounded-lg w-fit transition-all duration-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-charcoal mt-4 font-heading group-hover:text-primary transition-colors">Mid-Year Move Section</h4>
                  <p className="text-[11px] text-steel-gray font-caption mt-1.5 leading-relaxed">
                    Reassign active students between different sections of the same grade within the current active year.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-primary mt-4 group-hover:translate-x-1 transition-transform">
                  Move Students &rarr;
                </div>
              </Link>

              {/* Year-End Promote */}
              <Link
                href="/dashboard/promotions/promote"
                className="group flex flex-col justify-between p-5 border border-light-gray/60 hover:border-primary/20 rounded-xl hover:bg-cream/10 transition-all duration-300 sm:col-span-2"
              >
                <div>
                  <div className="p-2.5 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white rounded-lg w-fit transition-all duration-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-charcoal mt-4 font-heading group-hover:text-primary transition-colors">Promote Students (Year-End)</h4>
                  <p className="text-[11px] text-steel-gray font-caption mt-1.5 leading-relaxed">
                    Bulk promote a whole section of students to their next grade level in the upcoming academic year. Link core electives, configure outcomes, and run full-batch validations.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-primary mt-4 group-hover:translate-x-1 transition-transform">
                  Promote Students &rarr;
                </div>
              </Link>

            </div>
          </div>
        </div>

        {/* Right column: Current Academic Year Card & Status */}
        <div className="space-y-6">
          {/* Current Year details */}
          <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            <h3 className="text-sm font-bold text-steel-gray uppercase tracking-wider font-caption">Active Academic Year</h3>
            
            {currentYear ? (
              <div className="mt-4 space-y-3">
                <div className="text-3xl font-extrabold text-primary font-heading tracking-tight">
                  {currentYear.label}
                </div>
                <div className="space-y-1.5 pt-2 text-xs font-medium text-steel-gray font-caption">
                  <div className="flex justify-between">
                    <span>Starts on:</span>
                    <span className="text-charcoal font-semibold">{formatDate(currentYear.starts_on)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ends on:</span>
                    <span className="text-charcoal font-semibold">{formatDate(currentYear.ends_on)}</span>
                  </div>
                  <div className="flex justify-between border-t border-light-gray/40 pt-2 mt-2">
                    <span>Active Sections:</span>
                    <span className="text-charcoal font-bold">{sectionCountsMap[currentYear.id] || 0}</span>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mt-2 font-caption uppercase">
                  Currently Active
                </span>
              </div>
            ) : (
              <div className="py-6 text-center text-steel-gray/60 text-xs font-body">
                No active academic year configured.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Promotion History */}
      <PromotionHistoryTable initialBatches={promotionHistory} />

      {/* Academic Year Timeline Listing */}
      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-light-gray/60 bg-cream/5">
          <h3 className="text-lg font-bold text-charcoal font-heading">Academic Calendars</h3>
          <p className="text-xs text-steel-gray font-caption mt-0.5">Historical records of academic years and configurations.</p>
        </div>
        
        {allYears.length === 0 ? (
          <div className="py-12 text-center text-steel-gray/60 text-sm font-body">
            No academic years found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-light-gray/60 bg-cream/15">
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Academic Year</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Start Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">End Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Sections Configured</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray/40">
                {allYears.map((year) => (
                  <tr key={year.id} className="hover:bg-cream/10 transition-colors">
                    <td className="py-4 px-6 font-bold text-charcoal font-heading text-sm">
                      {year.label}
                    </td>
                    <td className="py-4 px-6 text-sm text-steel-gray font-body">
                      {formatDate(year.starts_on)}
                    </td>
                    <td className="py-4 px-6 text-sm text-steel-gray font-body">
                      {formatDate(year.ends_on)}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-primary font-heading">
                      {sectionCountsMap[year.id] || 0} sections
                    </td>
                    <td className="py-4 px-6">
                      {year.is_current ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-caption uppercase">
                          Active Current
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-steel-gray/10 text-steel-gray border border-steel-gray/25 font-caption uppercase">
                          Inactive
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

    </div>
  )
}
