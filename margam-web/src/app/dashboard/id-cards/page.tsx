import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getClasses, getAllSectionsForInstitution } from '@/lib/repositories/academic'
import { getStudentsList } from '@/lib/repositories/student'
import { getTeachersList } from '@/lib/repositories/teacher'
import { getIdCardSettings } from '@/lib/repositories/idCardSettings'
import IDCardsClient from './IDCardsClient'

export default async function IDCardsPage({
  searchParams
}: {
  searchParams: Promise<{
    search?: string
    classId?: string
    sectionId?: string
    status?: string
  }>
}) {
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

  // Await searchParams
  const resolvedParams = await searchParams
  const search = resolvedParams.search || ''
  const classId = resolvedParams.classId || ''
  const sectionId = resolvedParams.sectionId || ''
  const status = resolvedParams.status || 'all'

  // Fetch filters data, students, teachers, settings, and institution details
  const [classes, allSections, students, teachers, idCardSettings, institutionResult] = await Promise.all([
    getClasses(supabase, institutionId),
    getAllSectionsForInstitution(supabase, institutionId),
    getStudentsList(supabase, institutionId, { search, classId, sectionId, status }),
    getTeachersList(supabase, institutionId, { search }),
    getIdCardSettings(supabase, institutionId),
    supabase
      .from('institutions')
      .select('name, address, logo_url, theme')
      .eq('id', institutionId)
      .single()
  ])

  const institution = institutionResult.data

  return (
    <IDCardsClient
      classes={classes}
      allSections={allSections}
      initialStudents={students}
      initialTeachers={teachers}
      initialSettings={idCardSettings}
      institution={institution}
      institutionId={institutionId}
    />
  )
}
