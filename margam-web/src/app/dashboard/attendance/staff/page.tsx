import { getDepartments } from '@/lib/repositories/attendance'
import { todayIST } from '@/utils/date'
import AttendanceNav from '../AttendanceNav'
import { requireInstitutionAdmin } from '../adminContext'
import MarkStaffAttendanceClient from './MarkStaffAttendanceClient'

export default async function MarkStaffAttendancePage() {
  const { supabase, institutionId } = await requireInstitutionAdmin()
  const departments = await getDepartments(supabase, institutionId)

  return (
    <div className="space-y-6">
      <AttendanceNav />
      <MarkStaffAttendanceClient today={todayIST()} departments={departments} />
    </div>
  )
}
