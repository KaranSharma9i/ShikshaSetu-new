import { getInstitutionSections, getAcademicYears } from '@/lib/repositories/attendance'
import { todayIST } from '@/utils/date'
import AttendanceNav from '../AttendanceNav'
import { requireInstitutionAdmin } from '../adminContext'
import { sectionsForDate } from '../attendanceUtils'
import LeaveRequestsClient from './LeaveRequestsClient'

export default async function LeaveRequestsPage() {
  const { supabase, institutionId } = await requireInstitutionAdmin()
  const [sections, academicYears] = await Promise.all([
    getInstitutionSections(supabase, institutionId),
    getAcademicYears(supabase, institutionId),
  ])
  const today = todayIST()

  return (
    <div className="space-y-6">
      <AttendanceNav />
      <LeaveRequestsClient sections={sectionsForDate(sections, academicYears, today)} today={today} />
    </div>
  )
}
