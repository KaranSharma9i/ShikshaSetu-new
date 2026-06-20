import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getTimetableForSection } from '@/lib/repositories/timetable'
import PrintTimetableClient from './PrintTimetableClient'

export default async function PrintTimetablePage({
  searchParams
}: {
  searchParams: Promise<{
    sectionId?: string
    academicYearId?: string
  }>
}) {
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

  const resolvedParams = await searchParams
  const sectionId = resolvedParams.sectionId
  const academicYearId = resolvedParams.academicYearId

  if (!sectionId || !academicYearId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-danger">Invalid Print Parameters</h1>
        <p className="text-steel-gray mt-2">Section ID and Academic Year ID are required.</p>
      </div>
    )
  }

  // 3. Verify section and academic year belong to the admin's institution
  const { data: sectionData, error: secErr } = await supabase
    .from('sections')
    .select('id, name, class:classes!inner(id, name, institution_id)')
    .eq('id', sectionId)
    .maybeSingle()

  if (secErr || !sectionData) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-danger">Section Not Found</h1>
        <p className="text-steel-gray mt-2">The requested section was not found.</p>
      </div>
    )
  }

  const classObj = Array.isArray(sectionData.class) ? sectionData.class[0] : sectionData.class
  if (classObj?.institution_id !== institutionId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-danger">Unauthorized</h1>
        <p className="text-steel-gray mt-2">You do not have access to this section.</p>
      </div>
    )
  }

  const { data: yearData, error: yearErr } = await supabase
    .from('academic_years')
    .select('id, label, institution_id')
    .eq('id', academicYearId)
    .maybeSingle()

  if (yearErr || !yearData || yearData.institution_id !== institutionId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-danger">Academic Year Not Found</h1>
        <p className="text-steel-gray mt-2">The requested academic year is invalid or unauthorized.</p>
      </div>
    )
  }

  // 4. Fetch timetable data
  const timetable = await getTimetableForSection(supabase, sectionId, academicYearId)

  // 5. Fetch institution details
  const { data: instData } = await supabase
    .from('institutions')
    .select('name, logo_url, address')
    .eq('id', institutionId)
    .single()

  const className = classObj ? `${classObj.name} - ${sectionData.name}` : sectionData.name

  return (
    <PrintTimetableClient
      timetable={timetable}
      className={className}
      academicYearLabel={yearData.label}
      institution={instData}
    />
  )
}
