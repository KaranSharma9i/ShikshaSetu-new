import { getInstitutionSections, getAcademicYears } from '@/lib/repositories/attendance'
import { todayIST } from '@/utils/date'
import AttendanceNav from '../AttendanceNav'
import { requireInstitutionAdmin } from '../adminContext'
import MarkStudentAttendanceClient from './MarkStudentAttendanceClient'

export default async function MarkStudentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; date?: string }>
}) {
  const { supabase, institutionId } = await requireInstitutionAdmin()
  const params = await searchParams

  const [sections, academicYears] = await Promise.all([
    getInstitutionSections(supabase, institutionId),
    getAcademicYears(supabase, institutionId),
  ])

  const today = todayIST()
  const initialDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= today ? params.date : today

  return (
    <div className="space-y-6">
      <AttendanceNav />
      <MarkStudentAttendanceClient
        sections={sections}
        academicYears={academicYears}
        today={today}
        initialDate={initialDate}
        initialSectionId={params.section || ''}
      />
    </div>
  )
}
