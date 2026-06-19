import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getClasses, getCurrentAcademicYear, getAcademicYears } from '@/lib/repositories/academic'
import { getExamsSummary } from '@/lib/repositories/exams'
import ExamsClient from './ExamsClient'

export default async function ExamsPage() {
  const supabase = await createClient()

  // 1. Retrieve user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Retrieve user profile for institution association
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('institution_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id || userData.role !== 'institution_admin') {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id

  // 3. Fetch academic years, classes, active academic year, and institution details concurrently
  const [classes, activeAcademicYear, academicYears, institutionResult] = await Promise.all([
    getClasses(supabase, institutionId),
    getCurrentAcademicYear(supabase, institutionId),
    getAcademicYears(supabase, institutionId),
    supabase
      .from('institutions')
      .select('name, address, logo_url, theme, tagline')
      .eq('id', institutionId)
      .single()
  ])

  const institution = institutionResult.data

  // 4. Fetch initial exams list for the current academic year
  let initialExams: any[] = []
  if (activeAcademicYear?.id) {
    initialExams = await getExamsSummary(supabase, institutionId, activeAcademicYear.id)
  }

  return (
    <ExamsClient
      classes={classes}
      academicYears={academicYears}
      activeAcademicYear={activeAcademicYear}
      initialExams={initialExams}
      institution={institution}
      institutionId={institutionId}
    />
  )
}
