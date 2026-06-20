import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentAcademicYear, getClasses } from '@/lib/repositories/academic'
import MoveSectionForm from './MoveSectionForm'

export default async function MoveSectionPage() {
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

  // 3. Retrieve current active academic year
  const currentYear = await getCurrentAcademicYear(supabase, institutionId)

  if (!currentYear) {
    redirect('/dashboard/promotions?error=no_active_year')
  }

  // 4. Retrieve classes
  const classes = await getClasses(supabase, institutionId)

  return (
    <div className="space-y-6 font-body">
      <MoveSectionForm
        classes={classes}
        currentYear={currentYear}
        institutionId={institutionId}
      />
    </div>
  )
}
