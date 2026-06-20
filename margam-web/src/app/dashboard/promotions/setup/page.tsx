import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentAcademicYear, getAcademicYearClonePreview } from '@/lib/repositories/academic'
import SetupForm from './SetupForm'

export default async function SetupAcademicYearPage() {
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

  // 3. Retrieve current academic year
  const currentYear = await getCurrentAcademicYear(supabase, institutionId)

  // 4. Retrieve preview clone statistics
  let previewStats = { sectionsCount: 0, subjectsCount: 0 }
  if (currentYear) {
    try {
      previewStats = await getAcademicYearClonePreview(supabase, currentYear.id)
    } catch (err) {
      console.error('Failed to load clone preview stats:', err)
    }
  }

  return (
    <div className="space-y-6 font-body">
      <SetupForm
        currentYear={currentYear ? {
          id: currentYear.id,
          label: currentYear.label,
          startsOn: currentYear.starts_on,
          endsOn: currentYear.ends_on
        } : null}
        previewStats={previewStats}
      />
    </div>
  )
}
