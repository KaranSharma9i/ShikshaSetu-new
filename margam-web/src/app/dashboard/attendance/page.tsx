import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getInstitutionSections, getDepartments } from '@/lib/repositories/attendance'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
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

  // 3. Fetch initial sections and departments lists for chip selectors
  const [sections, departments] = await Promise.all([
    getInstitutionSections(supabase, institutionId),
    getDepartments(supabase, institutionId),
  ])

  return (
    <AttendanceClient
      initialSections={sections}
      initialDepartments={departments}
    />
  )
}
