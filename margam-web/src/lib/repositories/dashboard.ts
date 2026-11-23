import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { getCurrentAcademicYear } from './academic'
import { todayIST, todayISTRange } from '@/utils/date'

export interface DashboardMetrics {
  totalStudents: number
  totalTeachers: number
  feesCollectedToday: number
  /** Today's student attendance %, or null when no attendance has been marked today. */
  attendanceRate: number | null
  attendanceMarkedToday: number
  recentPayments: Array<{
    id: string
    amount_paid: number
    payment_date: string
    payment_method: string | null
    studentName: string
    className: string
  }>
  recentCirculars: Array<{
    id: string
    title: string
    publish_date: string
    category: string | null
  }>
}

export async function getDashboardMetrics(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<DashboardMetrics> {
  // Institutions operate in IST; the server (Vercel) runs in UTC.
  const todayRange = todayISTRange()
  const todayDateStr = todayIST()

  try {
    // 1. Total Students Count
    const { count: studentsCount, error: studentsError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)

    if (studentsError) throw studentsError

    // 2. Total Teachers Count
    const { count: teachersCount, error: teachersError } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)

    if (teachersError) throw teachersError

    // 3. Fees Collected Today
    const { data: paymentsToday, error: paymentsError } = (await supabase
      .from('fee_payments')
      .select(`
        amount_paid,
        student:students!inner (
          institution_id
        )
      `)
      .eq('student.institution_id', institutionId)
      .gte('payment_date', todayRange.start)
      .lte('payment_date', todayRange.end)) as any

    if (paymentsError) throw paymentsError
    const feesCollectedToday = (paymentsToday || []).reduce((acc: number, curr: any) => acc + Number(curr.amount_paid), 0)

    // 4. Attendance Rate (Today's percentage or fallback to last 2000 overall if today has no records)
    // Rows are stored per student per subject, so collapse to one status per student
    // (present if they attended any period). Paginated past the 1000-row API cap.
    let attendanceRate: number | null = null
    let attendanceMarkedToday = 0
    const academicYear = (await getCurrentAcademicYear(supabase, institutionId)) as any

    if (academicYear) {
      const statusByStudent = new Map<string, boolean>()
      for (let from = 0; ; from += 1000) {
        const { data: page, error: attErr } = (await (supabase as any)
          .from('student_attendance')
          .select('student_id, status, student:students!inner(institution_id)')
          .eq('student.institution_id', institutionId)
          .eq('date', todayDateStr)
          .is('deleted_at', null)
          .order('id', { ascending: true })
          .range(from, from + 999)) as any
        if (attErr) throw attErr
        ;(page || []).forEach((a: any) => {
          if (a.status === 'holiday' || a.status === 'excused') return
          const attended = a.status === 'present' || a.status === 'late'
          statusByStudent.set(a.student_id, (statusByStudent.get(a.student_id) || false) || attended)
        })
        if (!page || page.length < 1000) break
      }
      attendanceMarkedToday = statusByStudent.size
      if (statusByStudent.size > 0) {
        const present = Array.from(statusByStudent.values()).filter(Boolean).length
        attendanceRate = Math.round((present / statusByStudent.size) * 100)
      }
    }

    // 5. Recent Payments List (limit: 5)
    const { data: recentPayData, error: recentPayError } = (await supabase
      .from('fee_payments')
      .select(`
        id,
        amount_paid,
        payment_date,
        payment_method,
        student:students!inner (
          user_id,
          user:users!inner (
            full_name
          ),
          enrollments!inner (
            is_active,
            section:sections!inner (
              name,
              class:classes!inner (
                name
              )
            )
          )
        )
      `)
      .eq('student.institution_id', institutionId)
      .order('payment_date', { ascending: false })
      .limit(5)) as any

    if (recentPayError) throw recentPayError

    const recentPayments = (recentPayData || []).map((p: any) => {
      const studentName = p.student?.user?.full_name || 'Unknown Student'
      const activeEnrollment = p.student?.enrollments?.find((e: any) => e.is_active) || p.student?.enrollments?.[0]
      const sectionName = activeEnrollment?.section?.name || ''
      const className = activeEnrollment?.section?.class?.name || ''
      const classCombinedName = className ? `${className}-${sectionName}` : 'N/A'

      return {
        id: p.id,
        amount_paid: Number(p.amount_paid),
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        studentName,
        className: classCombinedName,
      }
    })

    const { data: circularsData, error: circularsError } = (await supabase
      .from('circulars')
      .select('id, title, publish_date, category')
      .eq('institution_id', institutionId)
      .order('publish_date', { ascending: false })
      .limit(3)) as any

    if (circularsError) throw circularsError

    const recentCirculars = (circularsData || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      publish_date: c.publish_date,
      category: c.category,
    }))

    return {
      totalStudents: studentsCount || 0,
      totalTeachers: teachersCount || 0,
      feesCollectedToday,
      attendanceRate,
      attendanceMarkedToday,
      recentPayments,
      recentCirculars,
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    // Safe fallbacks to keep dashboard UI from crashing
    return {
      totalStudents: 0,
      totalTeachers: 0,
      feesCollectedToday: 0,
      attendanceRate: null,
      attendanceMarkedToday: 0,
      recentPayments: [],
      recentCirculars: [],
    }
  }
}
