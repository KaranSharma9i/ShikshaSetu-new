import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getAcademicYears, getClasses } from '@/lib/repositories/academic'
import PromoteForm from './PromoteForm'

export default async function PromotePage() {
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

  // 3. Retrieve academic years and classes
  const academicYears = await getAcademicYears(supabase, institutionId)
  const classes = await getClasses(supabase, institutionId)

  // Find the current active year
  const currentYear = academicYears.find(ay => ay.is_current)

  if (!currentYear) {
    redirect('/dashboard/promotions?error=no_active_year')
  }

  return (
    <div className="space-y-6 font-body">
      <PromoteForm
        classes={classes}
        academicYears={academicYears}
        currentYear={currentYear}
        institutionId={institutionId}
      />
    </div>
  )
}
