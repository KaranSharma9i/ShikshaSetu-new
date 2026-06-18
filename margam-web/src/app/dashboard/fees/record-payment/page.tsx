import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getStudentsList } from '@/lib/repositories/student'
import { getStudentFees } from '@/lib/repositories/fees'
import RecordPaymentForm from './RecordPaymentForm'

export default async function RecordPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>
}) {
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
    .select('institution_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id

  // 3. Await search params to check if a student is pre-selected
  const resolvedParams = await searchParams
  const studentId = resolvedParams.studentId || ''

  // 4. Fetch list of active students for the search dropdown
  const studentsList = await getStudentsList(supabase, institutionId, { status: 'active' })

  // 5. Fetch student fees if pre-selected
  let preselectedStudentFees = null
  if (studentId) {
    preselectedStudentFees = await getStudentFees(supabase, studentId)
  }

  return (
    <div className="space-y-6 font-body">
      <RecordPaymentForm
        institutionId={institutionId}
        students={studentsList}
        preselectedStudentId={studentId}
        preselectedStudentFees={preselectedStudentFees}
      />
    </div>
  )
}
