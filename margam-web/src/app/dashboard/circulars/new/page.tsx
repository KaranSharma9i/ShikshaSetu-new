import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getClasses } from '@/lib/repositories/academic'
import BroadcastCircularForm from './BroadcastCircularForm'

export default async function NewCircularPage() {
  const supabase = await createClient()

  // Retrieve user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Retrieve user profile for institution association
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, institution_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    redirect('/auth/unauthorized')
  }

  if (userData.role !== 'institution_admin') {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id

  // Fetch classes for targeting option
  const classes = await getClasses(supabase, institutionId)

  return (
    <div className="space-y-6 font-body">
      {/* Back button & Header */}
      <div className="flex flex-col gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <Link
            href="/dashboard/circulars"
            className="inline-flex items-center gap-2 text-xs font-bold text-steel-gray hover:text-primary transition-all py-1.5 px-3 bg-white border border-light-gray/60 rounded-xl shadow-sm hover:shadow cursor-pointer active:scale-95 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Circulars
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Broadcast New Circular</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Create an announcement, notice, or event alert and distribute it to specific user roles or classes.
          </p>
        </div>
      </div>

      <BroadcastCircularForm
        institutionId={institutionId}
        classes={classes}
      />
    </div>
  )
}
