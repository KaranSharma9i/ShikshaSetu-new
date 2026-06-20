import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getAcademicYears, getAllSectionsForInstitution } from '@/lib/repositories/academic'
import TimetableForm from './TimetableForm'

export default async function TimetablePage() {
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

  // 3. Fetch academic years and all sections for selector inputs
  const [academicYears, sections] = await Promise.all([
    getAcademicYears(supabase, institutionId),
    getAllSectionsForInstitution(supabase, institutionId)
  ])

  return (
    <div className="space-y-6 font-body">
      {/* Page Header */}
      <div className="border-b border-light-gray/60 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Timetable Management</h1>
        <p className="text-steel-gray mt-1 text-sm font-caption">
          Manage and schedule class periods, assign subject teachers, configure classroom locations, and check for scheduling clashes.
        </p>
      </div>

      {/* Main Timetable Interface */}
      <TimetableForm
        initialYears={academicYears}
        initialSections={sections}
        institutionId={institutionId}
      />
    </div>
  )
}
