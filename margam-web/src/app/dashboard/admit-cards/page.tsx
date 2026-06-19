import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getClasses, getCurrentAcademicYear } from '@/lib/repositories/academic'
import { getAdmitCardSettings } from '@/lib/repositories/admitCardSettings'
import AdmitCardsClient from './AdmitCardsClient'

export default async function AdmitCardsPage() {
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
    .select('institution_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id || userData.role !== 'institution_admin') {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id

  // Fetch settings, classes, active academic year, and institution details concurrently
  const [classes, activeAcademicYear, admitCardSettings, institutionResult] = await Promise.all([
    getClasses(supabase, institutionId),
    getCurrentAcademicYear(supabase, institutionId),
    getAdmitCardSettings(supabase, institutionId),
    supabase
      .from('institutions')
      .select('name, address, logo_url, theme, tagline')
      .eq('id', institutionId)
      .single()
  ])

  const institution = institutionResult.data

  return (
    <AdmitCardsClient
      classes={classes}
      activeAcademicYear={activeAcademicYear}
      initialSettings={admitCardSettings}
      institution={institution}
      institutionId={institutionId}
    />
  )
}
