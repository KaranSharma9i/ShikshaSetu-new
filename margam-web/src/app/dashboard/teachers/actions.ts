'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { updateTeacher, assignClassToTeacher, removeClassFromTeacher } from '@/lib/repositories/teacher'
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
  return { day: '01', month: '01', year: '1985' }
}

export async function addTeacherAction(
  institutionId: string,
  params: {
    name: string
    email: string
    phone: string
    employeeCode: string
    qualification: string
    specialization: string
    dob: string
    gender: string
    dateOfJoining: string
    emergencyContact: string
    address: string
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
      email: params.email,
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

    // 3. Call the SQL RPC function register_teacher_transaction
    const { data: rpcData, error: rpcErr } = await (supabaseAdmin as any).rpc('register_teacher_transaction', {
      p_auth_user_id: authUserId,
      p_institution_id: institutionId,
      p_employee_code: params.employeeCode,
      p_name: params.name,
      p_email: params.email,
      p_phone: params.phone,
      p_gender: params.gender,
      p_date_of_birth: formattedDob,
      p_qualification: params.qualification,
      p_specialization: params.specialization,
      p_date_of_joining: params.dateOfJoining,
      p_address: params.address,
      p_emergency_contact: params.emergencyContact
    })

    if (rpcErr) {
      console.error('RPC Teacher registration failed:', rpcErr)
      // Clean up Auth user since DB transaction failed
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((deleteErr) => {
        console.error(`Failed to clean up Auth user ${authUserId}:`, deleteErr.message || deleteErr)
      })
      return { success: false, error: rpcErr.message || 'Database registration transaction failed.' }
    }

    revalidatePath('/dashboard/teachers')
    return {
      success: true,
      data: {
        tempPassword: password,
        fullName: params.name,
        employeeCode: params.employeeCode
      }
    }
  } catch (error: any) {
    console.error('Error in addTeacherAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function editTeacherAction(
  institutionId: string,
  teacherId: string,
  userId: string,
  params: {
    fullName: string
    phone: string
    email: string
    status: 'active' | 'inactive' | 'suspended'
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
    dateOfBirth: string
    qualification: string
    specialization: string
    dateOfJoining: string
    address: string
    emergencyContact: string
    originalEmail: string
  }
) {
  try {
    const supabase = await createClient()

    // 1. If email changed, update in auth.users
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

    // 2. Run repository update query
    const ok = await updateTeacher(supabase, institutionId, teacherId, userId, {
      fullName: params.fullName,
      phone: params.phone,
      email: params.email,
      status: params.status,
      gender: params.gender,
      dateOfBirth: params.dateOfBirth,
      qualification: params.qualification,
      specialization: params.specialization,
      dateOfJoining: params.dateOfJoining,
      address: params.address,
      emergencyContact: params.emergencyContact
    })

    if (!ok) {
      return { success: false, error: 'Database update failed. Check logs.' }
    }

    revalidatePath('/dashboard/teachers')
    revalidatePath(`/dashboard/teachers/${teacherId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error in editTeacherAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function assignClassAction(
  teacherUserId: string,
  sectionId: string,
  subjectId: string,
  teacherId: string // to revalidate path
) {
  try {
    const supabase = await createClient()
    const success = await assignClassToTeacher(supabase, teacherUserId, sectionId, subjectId)
    if (success) {
      revalidatePath(`/dashboard/teachers/${teacherId}`)
      return { success: true }
    }
    return { success: false, error: 'Failed to assign class-subject' }
  } catch (error: any) {
    console.error('Error in assignClassAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function removeClassAction(
  sectionId: string,
  subjectId: string,
  teacherId: string // to revalidate path
) {
  try {
    const supabase = await createClient()
    const success = await removeClassFromTeacher(supabase, sectionId, subjectId)
    if (success) {
      revalidatePath(`/dashboard/teachers/${teacherId}`)
      return { success: true }
    }
    return { success: false, error: 'Failed to remove class-subject assignment' }
  } catch (error: any) {
    console.error('Error in removeClassAction:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
