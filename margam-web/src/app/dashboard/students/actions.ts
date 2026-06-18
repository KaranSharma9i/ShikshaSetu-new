'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { updateStudent } from '@/lib/repositories/student'
import { revalidatePath } from 'next/cache'

// Helper: Parse DOB to extract day, month, year for password
function parseDob(dobStr: string): { day: string; month: string; year: string } {
  const clean = (dobStr || '').trim()
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (ymdMatch) {
    return {
      year: ymdMatch[1],
      month: ymdMatch[2].padStart(2, '0'),
      day: ymdMatch[3].padStart(2, '0'),
    }
  }
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (dmyMatch) {
    return {
      day: dmyMatch[1].padStart(2, '0'),
      month: dmyMatch[2].padStart(2, '0'),
      year: dmyMatch[4],
    }
  }
  try {
    const d = new Date(clean)
    if (!isNaN(d.getTime())) {
      return {
        day: String(d.getDate()).padStart(2, '0'),
        month: String(d.getMonth() + 1).padStart(2, '0'),
        year: String(d.getFullYear()),
      }
    }
  } catch (e) {
    // ignore
  }
  return { day: '01', month: '01', year: '2008' }
}

export async function admitStudentAction(
  institutionId: string,
  params: {
    name: string
    grade: string
    dob: string
    gender: string
    address: string
    guardianName: string
    guardianPhone: string
    guardianEmail: string
    studentCode: string
    studentEmail: string
    transport: string
    section: string
  }
) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Generate temp password based on DOB (DDMMYYYY)
    const parsedDob = parseDob(params.dob)
    const formattedDob = `${parsedDob.year}-${parsedDob.month}-${parsedDob.day}`
    const password = `${parsedDob.day}${parsedDob.month}${parsedDob.year}`

    // 2. Create user in Supabase Auth via admin client
    const { data: signUpData, error: signUpErr } = await supabaseAdmin.auth.admin.createUser({
      email: params.studentEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        is_admin_registered: true,
      },
    })

    if (signUpErr || !signUpData.user) {
      const msg = signUpErr?.message || 'Auth user creation failed'
      return { success: false, error: msg }
    }

    const authUserId = signUpData.user.id

    // 3. Call the SQL RPC function register_student_transaction to insert all tables atomically
    const { data: rpcData, error: rpcErr } = await (supabaseAdmin as any).rpc('register_student_transaction', {
      p_auth_user_id: authUserId,
      p_institution_id: institutionId,
      p_student_code: params.studentCode,
      p_name: params.name,
      p_email: params.studentEmail,
      p_guardian_name: params.guardianName,
      p_guardian_phone: params.guardianPhone,
      p_guardian_email: params.guardianEmail,
      p_gender: params.gender,
      p_date_of_birth: formattedDob,
      p_address: params.address,
      p_grade: params.grade,
      p_section: params.section,
      p_transport: params.transport,
    })

    if (rpcErr) {
      console.error(`RPC Student registration database transaction failed:`, rpcErr)
      // Clean up Auth user since DB transaction failed
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((deleteErr) => {
        console.error(`Failed to clean up Auth user ${authUserId}:`, deleteErr.message || deleteErr)
      })
      return { success: false, error: rpcErr.message || 'Database registration transaction failed.' }
    }

    revalidatePath('/dashboard/students')
    return {
      success: true,
      data: {
        portalId: rpcData.portalId || params.studentCode,
        tempPassword: password,
        status: rpcData.status || 'Active',
        fullName: rpcData.fullName || params.name,
      },
    }
  } catch (error: any) {
    console.error('Error in admitStudentAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function editStudentAction(
  institutionId: string,
  studentId: string,
  userId: string,
  params: {
    fullName: string
    phone: string
    email: string
    status: 'active' | 'suspended' | 'inactive'
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
    dateOfBirth: string
    bloodGroup: string
    address: string
    guardianName: string
    guardianPhone: string
    guardianEmail: string
    sectionId: string
    rollNumber: string
    originalEmail: string
  }
) {
  try {
    const supabase = await createClient()

    // 1. If email changed, update it in auth.users too
    if (params.email && params.email !== params.originalEmail) {
      const supabaseAdmin = createAdminClient()
      const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: params.email,
      })

      if (authUpdateErr) {
        console.error('Error updating auth email:', authUpdateErr)
        return { success: false, error: `Auth email update failed: ${authUpdateErr.message}` }
      }
    }

    // 2. Run repository update queries
    const ok = await updateStudent(supabase, institutionId, studentId, userId, {
      fullName: params.fullName,
      phone: params.phone,
      email: params.email,
      status: params.status,
      gender: params.gender,
      dateOfBirth: params.dateOfBirth,
      bloodGroup: params.bloodGroup,
      address: params.address,
      guardianName: params.guardianName,
      guardianPhone: params.guardianPhone,
      guardianEmail: params.guardianEmail,
      sectionId: params.sectionId,
      rollNumber: params.rollNumber,
    })

    if (!ok) {
      return { success: false, error: 'Database update failed. Check logs.' }
    }

    revalidatePath('/dashboard/students')
    revalidatePath(`/dashboard/students/${studentId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in editStudentAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
