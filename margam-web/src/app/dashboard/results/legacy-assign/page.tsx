import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getLegacyExams } from '@/lib/repositories/results'
import LegacyAssignForm from './LegacyAssignForm'

export default async function LegacyAssignPage() {
  const supabase = await createClient()

  // 1. Retrieve session user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Retrieve user profile for institution association and role check
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('institution_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    redirect('/auth/unauthorized')
  }

  if (userData.role !== 'institution_admin') {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id

  // 3. Fetch all legacy (ungrouped) exams
  const legacyExams = await getLegacyExams(supabase, institutionId)

  return (
    <div className="space-y-6 font-body">
      {/* Page Header */}
      <div className="border-b border-light-gray/60 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Legacy Exams Utility</h1>
        <p className="text-steel-gray mt-1 text-sm font-caption">
          Link ungrouped legacy exams to structured terms.
        </p>
      </div>

      {/* Main Form */}
      <LegacyAssignForm initialExams={legacyExams} />
    </div>
  )
}
