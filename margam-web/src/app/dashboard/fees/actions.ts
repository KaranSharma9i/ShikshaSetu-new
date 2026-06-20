'use server'

import { createClient } from '@/utils/supabase/server'
import { recordPayment } from '@/lib/repositories/fees'
import { revalidatePath } from 'next/cache'

export async function recordPaymentAction(
  institutionId: string,
  params: {
    studentId: string
    feeStructureId: string
    amountPaid: number
    paymentMethod: string
    notes: string | null
  }
) {
  try {
    const supabase = await createClient()

    // 1. Get and authenticate current user session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User is not logged in.' }
    }

    // 2. Fetch admin user profile to enforce tenant boundaries
    const { data: adminData, error: adminErr } = await supabase
      .from('users')
      .select('role, institution_id')
      .eq('id', user.id)
      .single()

    if (adminErr || !adminData || adminData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized. Only institution admins can record payments.' }
    }

    if (adminData.institution_id !== institutionId) {
      return { success: false, error: 'Tenant boundary violation: Institution mismatch.' }
    }

    // 3. Verify student belongs to this institution
    const { data: studentData, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .eq('id', params.studentId)
      .eq('institution_id', institutionId)
      .maybeSingle()

    if (studentErr || !studentData) {
      return { success: false, error: 'Student not found or does not belong to this institution.' }
    }

    // 4. Verify fee structure belongs to this institution
    const { data: structData, error: structErr } = await supabase
      .from('fee_structures')
      .select('id, amount')
      .eq('id', params.feeStructureId)
      .eq('institution_id', institutionId)
      .maybeSingle()

    if (structErr || !structData) {
      return { success: false, error: 'Fee structure not found or does not belong to this institution.' }
    }

    // 5. Check already paid amount to prevent overpayment
    const { data: existingPayments, error: payErr } = await supabase
      .from('fee_payments')
      .select('amount_paid')
      .eq('student_id', params.studentId)
      .eq('fee_structure_id', params.feeStructureId)
      .is('deleted_at', null)

    if (payErr) {
      return { success: false, error: 'Failed to verify existing payments.' }
    }

    const totalPaid = (existingPayments || []).reduce((acc, curr) => acc + Number(curr.amount_paid), 0)
    const totalExpected = Number(structData.amount) || 0
    const remaining = totalExpected - totalPaid

    if (params.amountPaid <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' }
    }

    if (params.amountPaid > remaining + 0.01) { // small tolerance for floating point
      return {
        success: false,
        error: `Overpayment limit: Maximum payable is ₹${remaining.toLocaleString('en-IN')}`,
      }
    }

    // 6. Record payment in database
    const result = await recordPayment(supabase, params)

    if (!result.success) {
      return { success: false, error: result.error || 'Database insert failed.' }
    }

    // 7. Revalidate relevant cache paths
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/fees')
    revalidatePath('/dashboard/fees/record-payment')
    revalidatePath(`/dashboard/students/${params.studentId}`)

    return { success: true, paymentId: result.paymentId }
  } catch (error: any) {
    console.error('Error in recordPaymentAction:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}

export async function getFilteredFeeDataAction(
  institutionId: string,
  academicYearId: string,
  classId: string
) {
  try {
    const supabase = await createClient()

    // 1. Get and authenticate current user session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User is not logged in.' }
    }

    // 2. Fetch admin user profile to enforce tenant boundaries
    const { data: adminData, error: adminErr } = await supabase
      .from('users')
      .select('role, institution_id')
      .eq('id', user.id)
      .single()

    if (adminErr || !adminData || adminData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized.' }
    }

    if (adminData.institution_id !== institutionId) {
      return { success: false, error: 'Tenant boundary violation.' }
    }

    // Import repository functions here to avoid circular dependencies if any
    const { getFeeCollectionSummary, getDefaultersList } = await import('@/lib/repositories/fees')

    const [summary, defaulters] = await Promise.all([
      getFeeCollectionSummary(supabase, institutionId, academicYearId, classId),
      getDefaultersList(supabase, institutionId, academicYearId, classId),
    ])

    return {
      success: true,
      data: {
        summary,
        defaulters,
      },
    }
  } catch (error: any) {
    console.error('Error in getFilteredFeeDataAction:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}

export async function getStudentFeesAction(studentId: string) {
  try {
    const supabase = await createClient()

    // 1. Get and authenticate current user session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User is not logged in.' }
    }

    // 2. Fetch admin user profile to enforce tenant boundaries
    const { data: adminData, error: adminErr } = await supabase
      .from('users')
      .select('role, institution_id')
      .eq('id', user.id)
      .single()

    if (adminErr || !adminData || adminData.role !== 'institution_admin') {
      return { success: false, error: 'Unauthorized.' }
    }

    // 3. Verify student belongs to this admin's institution
    const { data: studentData, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('institution_id', adminData.institution_id)
      .maybeSingle()

    if (studentErr || !studentData) {
      return { success: false, error: 'Student not found or unauthorized access.' }
    }

    const { getStudentFees } = await import('@/lib/repositories/fees')
    const feesData = await getStudentFees(supabase, studentId)

    return {
      success: true,
      data: feesData,
    }
  } catch (error: any) {
    console.error('Error in getStudentFeesAction:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}


