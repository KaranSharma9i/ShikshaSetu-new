import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getAcademicYears, getClasses } from '@/lib/repositories/academic'
import LocksManagementForm from './LocksManagementForm'

export default async function LocksPage() {
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

  // 3. Fetch academic years and classes
  const [academicYears, classes] = await Promise.all([
    getAcademicYears(supabase, institutionId),
    getClasses(supabase, institutionId)
  ])

  return (
    <div className="space-y-6 font-body">
      {/* Page Header */}
      <div className="border-b border-light-gray/60 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Manage Exam Locks</h1>
        <p className="text-steel-gray mt-1 text-sm font-caption">
          Lock or unlock subject exams in bulk. Locked exams prevent any further marks entry by teachers and admins.
        </p>
      </div>

      {/* Main Component */}
      <LocksManagementForm initialYears={academicYears} initialClasses={classes} />
    </div>
  )
}
