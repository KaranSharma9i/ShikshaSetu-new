import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { deriveInstitutionPrefix } from '@/utils/deriveInstitutionPrefix'

export interface TeacherListItem {
  id: string
  user_id: string
  employee_code: string
  full_name: string
  profile_photo_url: string | null
  specialization: string
  qualification: string
  status: string
  email: string
  phone: string
  performanceScore: number
  assigned_classes: string[]
  date_of_joining?: string | null
  address?: string | null
}

export interface TeacherProfile {
  id: string
  user_id: string
  employee_code: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
  date_of_birth: string | null
  gender: string | null
  qualification: string | null
  specialization: string | null
  date_of_joining: string | null
  address: string | null
  emergency_contact: string | null
  profile_photo_url: string | null
}

export interface TeacherClass {
  class_id: string
  class_name: string
  section_id: string
  section_name: string
  subject_id: string
  subject_name: string
  student_count: number
  isClassTeacher: boolean
}

export async function getTeachersCount(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('institution_id', institutionId)

  if (error) {
    console.error('Error in getTeachersCount:', error)
    return 0
  }
  return count || 0
}

export async function getTeachersList(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  filters: {
    search?: string
    status?: string
    subject?: string
  }
): Promise<TeacherListItem[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id,
      user_id,
      employee_code,
      specialization,
      qualification,
      date_of_joining,
      address,
      user:users!inner (
        full_name,
        profile_photo_url,
        status,
        email,
        phone
      )
    `)
    .eq('institution_id', institutionId)

  if (error) {
    console.error('Error in getTeachersList:', error)
    return []
  }

  // Fetch class subjects taught by teachers
  const { data: classSubs } = await (supabase
    .from('class_subjects') as any)
    .select(`
      teacher_id,
      section_id,
      subject_id,
      subject:subjects!inner ( name ),
      section:sections!inner (
        name,
        class:classes!inner ( id, name )
      )
    `)

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id, section_id')
    .eq('is_active', true)

  const studentsBySection: Record<string, string[]> = {}
  enrollments?.forEach((e: any) => {
    if (!studentsBySection[e.section_id]) {
      studentsBySection[e.section_id] = []
    }
    studentsBySection[e.section_id].push(e.student_id)
  })

  let results: TeacherListItem[] = (data || []).map((t: any) => {
    const user = Array.isArray(t.user) ? t.user[0] : t.user
    const tClassSubs = (classSubs || []).filter((cs: any) => cs.teacher_id === t.user_id)
    const assignedClassesSet = new Set<string>()

    tClassSubs.forEach((cs: any) => {
      const section = cs.section
      const classObj = section?.class
      if (section && classObj) {
        assignedClassesSet.add(`${classObj.name}-${section.name}`)
      }
    })

    // Fallback/Deterministic performance score calculation
    const codeSum = t.employee_code.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    const performanceScore = 80 + (codeSum % 16)

    return {
      id: t.id,
      user_id: t.user_id,
      employee_code: t.employee_code,
      full_name: user?.full_name || '',
      profile_photo_url: user?.profile_photo_url || null,
      specialization: t.specialization || 'General',
      qualification: t.qualification || '',
      status: user?.status || 'active',
      email: user?.email || '',
      phone: user?.phone || '',
      performanceScore: performanceScore,
      assigned_classes: Array.from(assignedClassesSet),
      date_of_joining: t.date_of_joining,
      address: t.address
    }
  })

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    results = results.filter(r => r.status === filters.status)
  }

  // Apply subject filter
  if (filters.subject && filters.subject !== 'all') {
    const subjLower = filters.subject.toLowerCase()
    results = results.filter(r => 
      r.specialization.toLowerCase().includes(subjLower) ||
      r.assigned_classes.some(c => c.toLowerCase().includes(subjLower))
    )
  }

  // Apply search filter
  if (filters.search && filters.search.trim().length > 0) {
    const searchLower = filters.search.toLowerCase()
    results = results.filter(r => 
      r.full_name.toLowerCase().includes(searchLower) ||
      r.employee_code.toLowerCase().includes(searchLower)
    )
  }

  return results.sort((a, b) => a.full_name.localeCompare(b.full_name))
}

export async function getTeacherProfile(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  teacherId: string
): Promise<TeacherProfile | null> {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id,
      user_id,
      employee_code,
      date_of_birth,
      gender,
      qualification,
      specialization,
      date_of_joining,
      address,
      emergency_contact,
      user:users!inner (
        full_name,
        email,
        phone,
        profile_photo_url,
        status
      )
    `)
    .eq('institution_id', institutionId)
    .eq('id', teacherId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('Error in getTeacherProfile:', error)
    return null
  }

  const profileData = data as any
  const user = Array.isArray(profileData.user) ? profileData.user[0] : profileData.user

  return {
    id: profileData.id,
    user_id: profileData.user_id,
    employee_code: profileData.employee_code,
    full_name: user?.full_name || '',
    email: user?.email || null,
    phone: user?.phone || null,
    status: user?.status || 'active',
    date_of_birth: profileData.date_of_birth || null,
    gender: profileData.gender || null,
    qualification: profileData.qualification || null,
    specialization: profileData.specialization || null,
    date_of_joining: profileData.date_of_joining || null,
    address: profileData.address || null,
    emergency_contact: profileData.emergency_contact || null,
    profile_photo_url: user?.profile_photo_url || null
  }
}

export async function getTeacherClasses(
  supabase: SupabaseClient<Database>,
  teacherUserId: string
): Promise<TeacherClass[]> {
  try {
    // Fetch class subjects taught by teacher
    const { data: classSubs, error } = await (supabase
      .from('class_subjects') as any)
      .select(`
        section_id,
        subject_id,
        subject:subjects!inner (
          id,
          name
        ),
        section:sections!inner (
          id,
          name,
          class:classes!inner (
            id,
            name
          )
        )
      `)
      .eq('teacher_id', teacherUserId)

    if (error) throw error

    // Fetch sections where they are class teacher
    const { data: sectionsAsClassTeacher } = await supabase
      .from('sections')
      .select('id')
      .eq('class_teacher_id', teacherUserId)

    const classTeacherSectionIds = new Set((sectionsAsClassTeacher || []).map((s: any) => s.id))

    // Fetch enrollments to compute student count per section
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('section_id')
      .eq('is_active', true)

    const studentCountBySection: Record<string, number> = {}
    enrollments?.forEach((e: any) => {
      studentCountBySection[e.section_id] = (studentCountBySection[e.section_id] || 0) + 1
    })

    return (classSubs || []).map((cs: any) => {
      const section = cs.section
      const classObj = section?.class
      const subject = cs.subject

      return {
        class_id: classObj?.id || '',
        class_name: classObj?.name || '',
        section_id: section?.id || '',
        section_name: section?.name || '',
        subject_id: subject?.id || '',
        subject_name: subject?.name || '',
        student_count: section ? (studentCountBySection[section.id] || 0) : 0,
        isClassTeacher: section ? classTeacherSectionIds.has(section.id) : false
      }
    })
  } catch (error) {
    console.error('Error in getTeacherClasses:', error)
    return []
  }
}

export async function assignClassToTeacher(
  supabase: SupabaseClient<Database>,
  teacherUserId: string,
  sectionId: string,
  subjectId: string
): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('class_subjects') as any)
      .update({ teacher_id: teacherUserId })
      .eq('section_id', sectionId)
      .eq('subject_id', subjectId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error in assignClassToTeacher:', error)
    return false
  }
}

export async function removeClassFromTeacher(
  supabase: SupabaseClient<Database>,
  sectionId: string,
  subjectId: string
): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('class_subjects') as any)
      .update({ teacher_id: null })
      .eq('section_id', sectionId)
      .eq('subject_id', subjectId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error in removeClassFromTeacher:', error)
    return false
  }
}

export async function updateTeacher(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  teacherId: string,
  userId: string,
  updates: {
    fullName?: string
    phone?: string
    email?: string
    status?: 'active' | 'inactive' | 'suspended'
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
    dateOfBirth?: string
    qualification?: string
    specialization?: string
    dateOfJoining?: string
    address?: string
    emergencyContact?: string
  }
): Promise<boolean> {
  try {
    // 1. Verify teacher ownership
    const { data: teacherCheck } = await supabase
      .from('teachers')
      .select('id, user_id')
      .eq('id', teacherId)
      .eq('institution_id', institutionId)
      .maybeSingle()

    if (!teacherCheck) {
      console.error('Teacher not found or tenant mismatch')
      return false
    }

    // 2. Update users table
    const userUpdates: any = {}
    if (updates.fullName !== undefined) userUpdates.full_name = updates.fullName
    if (updates.phone !== undefined) userUpdates.phone = updates.phone
    if (updates.email !== undefined) userUpdates.email = updates.email
    if (updates.status !== undefined) userUpdates.status = updates.status

    if (Object.keys(userUpdates).length > 0) {
      const { error: userErr } = await (supabase
        .from('users') as any)
        .update(userUpdates)
        .eq('id', userId)
        .eq('institution_id', institutionId)

      if (userErr) throw userErr
    }

    // 3. Update teachers table
    const teacherUpdates: any = {}
    if (updates.gender !== undefined) teacherUpdates.gender = updates.gender
    if (updates.dateOfBirth !== undefined) teacherUpdates.date_of_birth = updates.dateOfBirth
    if (updates.qualification !== undefined) teacherUpdates.qualification = updates.qualification
    if (updates.specialization !== undefined) teacherUpdates.specialization = updates.specialization
    if (updates.dateOfJoining !== undefined) teacherUpdates.date_of_joining = updates.dateOfJoining
    if (updates.address !== undefined) teacherUpdates.address = updates.address
    if (updates.emergencyContact !== undefined) teacherUpdates.emergency_contact = updates.emergencyContact

    if (Object.keys(teacherUpdates).length > 0) {
      const { error: teachErr } = await (supabase
        .from('teachers') as any)
        .update(teacherUpdates)
        .eq('id', teacherId)
        .eq('institution_id', institutionId)

      if (teachErr) throw teachErr
    }

    return true
  } catch (error) {
    console.error('Error in updateTeacher repository:', error)
    return false
  }
}

export async function getInstitutionSubjects(
  supabase: SupabaseClient<Database>,
  institutionId: string
) {
  const { data, error } = await supabase
    .from('subjects' as any)
    .select('id, name')
    .eq('institution_id', institutionId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error in getInstitutionSubjects:', error)
    return []
  }
  return data || []
}

export async function getAvailableClassSubjects(
  supabase: SupabaseClient<Database>,
  institutionId: string
) {
  // Get current academic year
  const { data: ayData } = await (supabase
    .from('academic_years')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('is_current', true)
    .maybeSingle() as any)

  if (!ayData) return []

  const { data, error } = await (supabase
    .from('class_subjects') as any)
    .select(`
      id,
      section_id,
      subject_id,
      teacher_id,
      subject:subjects!inner ( id, name ),
      section:sections!inner (
        id,
        name,
        class:classes!inner ( id, name )
      )
    `)
    .eq('academic_year_id', ayData.id)
    .eq('section.class.institution_id', institutionId)

  if (error) {
    console.error('Error in getAvailableClassSubjects:', error)
    return []
  }

  return (data || []).map((cs: any) => ({
    id: cs.id,
    section_id: cs.section_id,
    section_name: cs.section?.name || '',
    class_id: cs.section?.class?.id || '',
    class_name: cs.section?.class?.name || '',
    subject_id: cs.subject_id,
    subject_name: cs.subject?.name || '',
    teacher_id: cs.teacher_id
  }))
}

export async function getNextTeacherCode(
  supabase: SupabaseClient<Database>,
  institutionId: string
): Promise<string> {
  try {
    const { count, error } = await supabase
      .from('teachers')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)

    if (error) throw error

    const { data: instData } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', institutionId)
      .single()

    const prefix = deriveInstitutionPrefix((instData as any)?.name || '')
    const nextNum = (count || 0) + 1
    return `${prefix}-TCH-${String(nextNum).padStart(4, '0')}`
  } catch (error) {
    console.error('Error in getNextTeacherCode:', error)
    return 'SCH-TCH-0001'
  }
}
