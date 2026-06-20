import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getClasses } from '@/lib/repositories/academic'
import { getInstitutionSubjects } from '@/lib/repositories/teacher'
import ManageDatesheetClient from './ManageDatesheetClient'

export default async function ManageDatesheetPage({
  searchParams
}: {
  searchParams: Promise<{
    name?: string
    year?: string
    new?: string
  }>
}) {
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

  // 3. Resolve parameters
  const resolvedParams = await searchParams
  const examName = resolvedParams.name
  const academicYearId = resolvedParams.year
  const isNew = resolvedParams.new === 'true'

  if (!examName || !academicYearId) {
    redirect('/dashboard/exams')
  }

  // 4. Fetch details concurrently
  const [classes, subjects, yearResult, institutionResult] = await Promise.all([
    getClasses(supabase, institutionId),
    getInstitutionSubjects(supabase, institutionId),
    supabase
      .from('academic_years')
      .select('label')
      .eq('id', academicYearId)
      .single(),
    supabase
      .from('institutions')
      .select('name, address, logo_url, theme, tagline')
      .eq('id', institutionId)
      .single()
  ])

  const academicYearLabel = yearResult.data?.label || 'Unknown Session'
  const institution = institutionResult.data

  return (
    <ManageDatesheetClient
      examName={examName}
      academicYearId={academicYearId}
      academicYearLabel={academicYearLabel}
      classes={classes}
      subjects={subjects}
      institution={institution}
      institutionId={institutionId}
      isNew={isNew}
    />
  )
}
