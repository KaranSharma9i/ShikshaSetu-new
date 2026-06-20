import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCircularsList } from '@/lib/repositories/circular'
import CircularsFilterBar from './CircularsFilterBar'
import CircularList from './CircularList'

export default async function CircularsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    category?: string
    role?: string
  }>
}) {
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
    .select('role, institution_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    redirect('/auth/unauthorized')
  }

  // Enforce role checks
  if (userData.role !== 'institution_admin') {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id

  // 3. Await and parse searchParams
  const resolvedParams = await searchParams
  const search = resolvedParams.search || ''
  const category = resolvedParams.category || 'all'
  const role = resolvedParams.role || 'all'

  // 4. Fetch circulars
  const circulars = await getCircularsList(supabase, institutionId, {
    search,
    category,
    role,
  })

  return (
    <div className="space-y-6 font-body">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Circulars & Announcements</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Create and broadcast notices, urgent alerts, event details, and holiday updates to your school community.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/circulars/new"
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs md:text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer font-body"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Broadcast Circular
          </Link>
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 border border-light-gray/50 rounded-xl shadow-sm h-full">
            <span className="text-xs font-semibold text-steel-gray font-caption uppercase tracking-wider">Total Active</span>
            <span className="text-xl font-bold text-primary font-heading">{circulars.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <CircularsFilterBar />

      {/* Directory Table / Grid */}
      <CircularList circulars={circulars} institutionId={institutionId} />
    </div>
  )
}
