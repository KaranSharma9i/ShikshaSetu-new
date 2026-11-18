import { getInstitutionSections, getDepartments, getAcademicYears } from '@/lib/repositories/attendance'
import { todayIST } from '@/utils/date'
import AttendanceClient from './AttendanceClient'
import AttendanceNav from './AttendanceNav'
import { requireInstitutionAdmin } from './adminContext'

export default async function AttendancePage() {
  const { supabase, institutionId } = await requireInstitutionAdmin()

  const [sections, departments, academicYears] = await Promise.all([
    getInstitutionSections(supabase, institutionId),
    getDepartments(supabase, institutionId),
    getAcademicYears(supabase, institutionId),
  ])

  return (
    <div className="space-y-6">
      <AttendanceNav />
      <AttendanceClient
        initialSections={sections}
        initialDepartments={departments}
        academicYears={academicYears}
        today={todayIST()}
      />
    </div>
  )
}
