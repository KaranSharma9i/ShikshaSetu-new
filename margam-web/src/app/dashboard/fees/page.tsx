import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getClasses, getAcademicYears, getCurrentAcademicYear } from '@/lib/repositories/academic'
import { getFeeCollectionSummary, getRecentPayments, getDefaultersList } from '@/lib/repositories/fees'
import FeeDashboardClient from './FeeDashboardClient'

export default async function FeesDashboardPage() {
  const supabase = await createClient()

  // 1. Retrieve and authenticate user session
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

  // 3. Fetch academic years and classes
  const [academicYears, classes, currentYear] = await Promise.all([
    getAcademicYears(supabase, institutionId) as Promise<any[]>,
    getClasses(supabase, institutionId) as Promise<any[]>,
    getCurrentAcademicYear(supabase, institutionId) as Promise<any>,
  ])

  const activeYearId = (currentYear?.id || academicYears[0]?.id) as string | undefined

  if (!activeYearId) {
    return (
      <div className="space-y-6 font-body">
        <div className="border-b border-light-gray/60 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Fees Dashboard</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">Fee collection stats and payment logs</p>
        </div>
        <div className="bg-white border border-light-gray/60 rounded-2xl p-8 max-w-2xl text-center shadow-sm">
          <h3 className="text-xl font-semibold text-charcoal mb-2 font-heading">No Academic Year Found</h3>
          <p className="text-steel-gray text-sm max-w-md mx-auto font-body">
            Please set up an academic year in the settings or student portal before viewing fee analytics.
          </p>
        </div>
      </div>
    )
  }

  // 4. Fetch initial fee data based on current academic year
  const [summary, recentPayments, defaulters] = await Promise.all([
    getFeeCollectionSummary(supabase, institutionId, activeYearId),
    getRecentPayments(supabase, institutionId, 10),
    getDefaultersList(supabase, institutionId, activeYearId),
  ])

  return (
    <FeeDashboardClient
      institutionId={institutionId}
      initialSummary={summary}
      initialRecentPayments={recentPayments}
      initialDefaulters={defaulters}
      classes={classes}
      academicYears={academicYears}
      currentYearId={activeYearId}
    />
  )
}
