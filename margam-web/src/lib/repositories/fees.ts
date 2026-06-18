import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export interface StudentFeeItem {
  id: string
  fee_name: string
  amount: number
  amount_paid: number
  pending_amount: number
  due_date: string | null
  status: 'paid' | 'pending' | 'overdue'
}

export interface PaymentListItem {
  id: string
  amount_paid: number
  payment_date: string
  payment_method: string | null
  notes: string | null
  student_name: string
  student_code: string
  class_name: string
  section_name: string
  fee_name: string
}

export interface DefaulterListItem {
  studentId: string
  studentName: string
  studentCode: string
  className: string
  sectionName: string
  pendingAmount: number
  status: 'pending' | 'overdue'
  nextDueDate: string | null
}

export function deriveStatus(
  amountPaid: number,
  structureAmount: number,
  dueDateStr: string | null
): 'paid' | 'pending' | 'overdue' {
  if (amountPaid >= structureAmount) {
    return 'paid'
  }
  if (!dueDateStr) {
    return 'pending'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(dueDateStr)
  dueDate.setHours(0, 0, 0, 0)

  if (dueDate < today) {
    return 'overdue'
  }
  return 'pending'
}

// 1. Fetch fee collection stats summary
export async function getFeeCollectionSummary(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  classId?: string
) {
  try {
    // A. Fetch all active enrollments for this year
    let enrollQuery = supabase
      .from('enrollments')
      .select(`
        student_id,
        section:sections!inner (
          class_id,
          class:classes!inner (
            name,
            institution_id
          )
        )
      `)
      .eq('academic_year_id', academicYearId)
      .eq('section.class.institution_id', institutionId)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (classId && classId !== 'all') {
      enrollQuery = enrollQuery.eq('section.class_id', classId)
    }

    const { data: enrollData, error: enrollError } = await enrollQuery

    if (enrollError) throw enrollError
    const enrollments = enrollData as any[] | null

    // B. Fetch all fee structures for this year
    let structQuery = supabase
      .from('fee_structures')
      .select('id, class_id, amount')
      .eq('institution_id', institutionId)
      .eq('academic_year_id', academicYearId)
      .is('deleted_at', null)

    if (classId && classId !== 'all') {
      structQuery = structQuery.eq('class_id', classId)
    }

    const { data: structData, error: structError } = await structQuery

    if (structError) throw structError
    const structures = structData as any[] | null

    // C. Fetch all fee payments for this year
    let payQuery = supabase
      .from('fee_payments')
      .select(`
        amount_paid,
        fee_structure:fee_structures!inner (
          id,
          class_id,
          class:classes!inner (
            name
          ),
          institution_id,
          academic_year_id
        )
      `)
      .eq('fee_structure.institution_id', institutionId)
      .eq('fee_structure.academic_year_id', academicYearId)
      .is('deleted_at', null)

    if (classId && classId !== 'all') {
      payQuery = payQuery.eq('fee_structure.class_id', classId)
    }

    const { data: payData, error: payError } = await payQuery

    if (payError) throw payError
    const payments = payData as any[] | null

    // D. Calculate total expected target and group by class
    let totalTarget = 0
    const classBreakdownMap = new Map<string, { classId: string; className: string; target: number; collected: number }>()

    if (enrollments && structures) {
      // Group structures by class_id
      const classStructureSum = new Map<string, number>()
      structures.forEach((s) => {
        const current = classStructureSum.get(s.class_id) || 0
        classStructureSum.set(s.class_id, current + Number(s.amount))
      })

      // Sum expected amounts for each enrollment and register in breakdown
      enrollments.forEach((e) => {
        const cId = e.section?.class_id
        const cName = (e.section as any)?.class?.name || `Class ${cId}`
        if (cId) {
          const structAmount = classStructureSum.get(cId) || 0
          totalTarget += structAmount

          const existing = classBreakdownMap.get(cId) || { classId: cId, className: cName, target: 0, collected: 0 }
          existing.target += structAmount
          classBreakdownMap.set(cId, existing)
        }
      })
    }

    // E. Calculate total collected and group by class
    const totalCollected = (payments || []).reduce((acc, curr) => {
      const amt = Number(curr.amount_paid) || 0
      const struct = curr.fee_structure
      const cId = struct?.class_id
      const cName = (struct as any)?.class?.name || `Class ${cId}`

      if (cId) {
        const existing = classBreakdownMap.get(cId) || { classId: cId, className: cName, target: 0, collected: 0 }
        existing.collected += amt
        classBreakdownMap.set(cId, existing)
      }

      return acc + amt
    }, 0)

    const totalPending = Math.max(0, totalTarget - totalCollected)
    const completionPercent = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0

    const classBreakdown = Array.from(classBreakdownMap.values()).map((c) => {
      const pending = Math.max(0, c.target - c.collected)
      const percent = c.target > 0 ? (c.collected / c.target) * 100 : 0
      return {
        ...c,
        pending,
        percent,
      }
    }).sort((a, b) => a.className.localeCompare(b.className))

    return {
      totalTarget,
      totalCollected,
      totalPending,
      completionPercent,
      classBreakdown,
    }
  } catch (error) {
    console.error('Error in getFeeCollectionSummary:', error)
    return {
      totalTarget: 0,
      totalCollected: 0,
      totalPending: 0,
      completionPercent: 0,
      classBreakdown: [],
    }
  }
}

// 2. Fetch all defaulters
export async function getDefaultersList(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  academicYearId: string,
  classId?: string
): Promise<DefaulterListItem[]> {
  try {
    // A. Fetch active enrollments with student & class details
    let enrollQuery = supabase
      .from('enrollments')
      .select(`
        student_id,
        roll_number,
        student:students!inner (
          student_code,
          user:users!inner (
            full_name
          )
        ),
        section:sections!inner (
          name,
          class_id,
          class:classes!inner (
            name,
            institution_id
          )
        )
      `)
      .eq('academic_year_id', academicYearId)
      .eq('section.class.institution_id', institutionId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .is('student.deleted_at', null)

    if (classId && classId !== 'all') {
      enrollQuery = enrollQuery.eq('section.class_id', classId)
    }

    const { data: enrollData, error: enrollError } = await enrollQuery

    if (enrollError) throw enrollError
    const enrollments = enrollData as any[] | null

    // B. Fetch all fee structures
    let structQuery = supabase
      .from('fee_structures')
      .select('id, fee_name, amount, due_date, class_id')
      .eq('institution_id', institutionId)
      .eq('academic_year_id', academicYearId)
      .is('deleted_at', null)

    if (classId && classId !== 'all') {
      structQuery = structQuery.eq('class_id', classId)
    }

    const { data: structData, error: structError } = await structQuery

    if (structError) throw structError
    const structures = structData as any[] | null

    // C. Fetch all payments
    const { data: payData, error: payError } = await supabase
      .from('fee_payments')
      .select(`
        student_id,
        fee_structure_id,
        amount_paid
      `)
      .is('deleted_at', null)

    if (payError) throw payError
    const payments = payData as any[] | null

    // Group structures by class_id
    const classStructures = new Map<string, typeof structures>()
    structures?.forEach((s) => {
      const list = classStructures.get(s.class_id) || []
      list.push(s)
      classStructures.set(s.class_id, list)
    })

    // Group payments by student_id & fee_structure_id
    const paymentMap = new Map<string, number>()
    payments?.forEach((p) => {
      const key = `${p.student_id}-${p.fee_structure_id}`
      const current = paymentMap.get(key) || 0
      paymentMap.set(key, current + Number(p.amount_paid))
    })

    const defaulters: DefaulterListItem[] = []

    enrollments?.forEach((e) => {
      const student = e.student
      const user = (student as any)?.user
      const section = e.section
      const className = section?.class?.name || ''
      const sectionName = section?.name || ''
      const classId = section?.class_id

      if (!student || !classId) return

      const studentId = e.student_id
      const studentName = user?.full_name || 'Unknown Student'
      const studentCode = student.student_code || ''

      const allocatedStructures = classStructures.get(classId) || []
      let pendingAmount = 0
      let hasOverdue = false
      let earliestDueDate: string | null = null

      allocatedStructures.forEach((struct) => {
        const key = `${studentId}-${struct.id}`
        const amountPaid = paymentMap.get(key) || 0
        const amount = Number(struct.amount) || 0
        const due = amount - amountPaid

        if (due > 0) {
          pendingAmount += due
          const status = deriveStatus(amountPaid, amount, struct.due_date)
          if (status === 'overdue') {
            hasOverdue = true
          }
          if (struct.due_date) {
            if (!earliestDueDate || new Date(struct.due_date) < new Date(earliestDueDate)) {
              earliestDueDate = struct.due_date
            }
          }
        }
      })

      if (pendingAmount > 0) {
        defaulters.push({
          studentId,
          studentName,
          studentCode,
          className,
          sectionName,
          pendingAmount,
          status: hasOverdue ? 'overdue' : 'pending',
          nextDueDate: earliestDueDate,
        })
      }
    })

    // Sort: overdue first, then by pending amount descending
    return defaulters.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (a.status !== 'overdue' && b.status === 'overdue') return 1
      return b.pendingAmount - a.pendingAmount
    })
  } catch (error) {
    console.error('Error in getDefaultersList:', error)
    return []
  }
}

// 3. Fetch fee structures and payment logs for a student
export async function getStudentFees(
  supabase: SupabaseClient<Database>,
  studentId: string
) {
  try {
    // A. Fetch active enrollment to determine class_id
    const { data: enrollData, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        academic_year_id,
        section:sections!inner (
          class_id
        )
      `)
      .eq('student_id', studentId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (enrollError) throw enrollError
    const enrollment = enrollData as any
    if (!enrollment) {
      return { fees: [], payments: [], totalDue: 0, totalPaid: 0, totalPending: 0 }
    }

    const section = enrollment.section
    const classId = (section as any)?.class_id
    const academicYearId = enrollment.academic_year_id

    if (!classId) {
      return { fees: [], payments: [], totalDue: 0, totalPaid: 0, totalPending: 0 }
    }

    // B. Fetch fee structures for this class
    const { data: structData, error: structError } = await supabase
      .from('fee_structures')
      .select('id, fee_name, amount, due_date')
      .eq('class_id', classId)
      .eq('academic_year_id', academicYearId)
      .is('deleted_at', null)

    if (structError) throw structError
    const structures = structData as any[] | null

    // C. Fetch all payments made by this student
    const { data: payData, error: payError } = await supabase
      .from('fee_payments')
      .select(`
        id,
        fee_structure_id,
        amount_paid,
        payment_date,
        payment_method,
        notes,
        fee_structure:fee_structures (
          fee_name
        )
      `)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('payment_date', { ascending: false })

    if (payError) throw payError
    const paymentsData = payData as any[] | null

    // D. Compute paid sums per fee structure
    const paymentMap = new Map<string, number>()
    paymentsData?.forEach((p) => {
      const current = paymentMap.get(p.fee_structure_id) || 0
      paymentMap.set(p.fee_structure_id, current + Number(p.amount_paid))
    })

    const fees: StudentFeeItem[] = []
    let totalDue = 0
    let totalPaid = 0
    let totalPending = 0

    structures?.forEach((s) => {
      const amountPaid = paymentMap.get(s.id) || 0
      const amount = Number(s.amount) || 0
      const pending = Math.max(0, amount - amountPaid)
      const status = deriveStatus(amountPaid, amount, s.due_date)

      totalDue += amount
      totalPaid += amountPaid
      totalPending += pending

      fees.push({
        id: s.id,
        fee_name: s.fee_name,
        amount,
        amount_paid: amountPaid,
        pending_amount: pending,
        due_date: s.due_date,
        status,
      })
    })

    const payments = (paymentsData || []).map((p: any) => ({
      id: p.id,
      amount_paid: Number(p.amount_paid),
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      notes: p.notes,
      fee_name: p.fee_structure?.fee_name || 'General Fee',
    }))

    return {
      fees,
      payments,
      totalDue,
      totalPaid,
      totalPending,
    }
  } catch (error) {
    console.error('Error in getStudentFees:', error)
    return { fees: [], payments: [], totalDue: 0, totalPaid: 0, totalPending: 0 }
  }
}

// 4. Fetch recent payments for dashboard
export async function getRecentPayments(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  limit = 10
): Promise<PaymentListItem[]> {
  try {
    const { data, error } = await supabase
      .from('fee_payments')
      .select(`
        id,
        amount_paid,
        payment_date,
        payment_method,
        notes,
        student:students!inner (
          student_code,
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
        ),
        fee_structure:fee_structures!inner (
          fee_name,
          institution_id
        )
      `)
      .eq('fee_structure.institution_id', institutionId)
      .is('deleted_at', null)
      .order('payment_date', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((p: any) => {
      const student = p.student
      const user = student?.user
      const enroll = student?.enrollments?.find((e: any) => e.is_active) || student?.enrollments?.[0]
      const sectionName = enroll?.section?.name || ''
      const className = enroll?.section?.class?.name || ''

      return {
        id: p.id,
        amount_paid: Number(p.amount_paid),
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        notes: p.notes,
        student_name: user?.full_name || 'Unknown Student',
        student_code: student?.student_code || '',
        class_name: className,
        section_name: sectionName,
        fee_name: p.fee_structure?.fee_name || 'General Fee',
      }
    })
  } catch (error) {
    console.error('Error in getRecentPayments:', error)
    return []
  }
}

// 5. Create a payment transaction
export async function recordPayment(
  supabase: SupabaseClient<Database>,
  params: {
    studentId: string
    feeStructureId: string
    amountPaid: number
    paymentMethod: string
    notes: string | null
  }
) {
  try {
    const { data, error } = await (supabase
      .from('fee_payments') as any)
      .insert({
        student_id: params.studentId,
        fee_structure_id: params.feeStructureId,
        amount_paid: params.amountPaid,
        payment_method: params.paymentMethod,
        notes: params.notes,
        payment_date: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) throw error
    return { success: true, paymentId: data.id }
  } catch (error: any) {
    console.error('Error in recordPayment repository:', error)
    return { success: false, error: error.message || 'Failed to record payment in database' }
  }
}
