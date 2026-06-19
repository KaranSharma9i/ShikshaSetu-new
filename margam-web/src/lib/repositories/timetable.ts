import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export interface TimetableEntry {
  id: string
  section_id: string
  class_subject_id: string
  day: string
  period_number: number
  starts_at: string
  ends_at: string
  room: string | null
  academic_year_id: string
  subject_name: string
  subject_code: string
  teacher_name: string
  teacher_id: string | null
}

export interface ConflictCheckResult {
  hasConflict: boolean
  type?: 'teacher' | 'room'
  reason?: string | null
}

/**
 * Fetch all active (non-deleted) timetable entries for a section during a given academic year.
 */
export async function getTimetableForSection(
  supabase: SupabaseClient<Database>,
  sectionId: string,
  academicYearId: string
): Promise<TimetableEntry[]> {
  const { data, error } = await (supabase
    .from('timetable')
    .select(`
      id,
      section_id,
      class_subject_id,
      day,
      period_number,
      starts_at,
      ends_at,
      room,
      academic_year_id,
      class_subjects:class_subjects (
        id,
        subject_id,
        teacher_id,
        subject:subjects (
          id,
          name,
          code
        ),
        teacher:users (
          id,
          full_name
        )
      )
    `)
    .eq('section_id', sectionId)
    .eq('academic_year_id', academicYearId)
    .is('deleted_at', null)
    .order('period_number', { ascending: true }) as any)

  if (error) {
    console.error('Error in getTimetableForSection repository:', error)
    return []
  }

  return (data || []).map((row: any) => {
    const classSubject = Array.isArray(row.class_subjects) ? row.class_subjects[0] : row.class_subjects
    const subject = classSubject ? (Array.isArray(classSubject.subject) ? classSubject.subject[0] : classSubject.subject) : null
    const teacher = classSubject ? (Array.isArray(classSubject.teacher) ? classSubject.teacher[0] : classSubject.teacher) : null

    return {
      id: row.id,
      section_id: row.section_id,
      class_subject_id: row.class_subject_id,
      day: row.day,
      period_number: row.period_number,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      room: row.room,
      academic_year_id: row.academic_year_id,
      subject_name: subject?.name || 'Unknown Subject',
      subject_code: subject?.code || '',
      teacher_name: teacher?.full_name || 'Unassigned',
      teacher_id: teacher?.id || null
    }
  })
}

/**
 * Fetch all active class subjects mapped to a specific section for dropdown selection.
 */
export async function getClassSubjectsForSection(
  supabase: SupabaseClient<Database>,
  sectionId: string,
  academicYearId: string
) {
  const { data, error } = await (supabase
    .from('class_subjects')
    .select(`
      id,
      subject_id,
      teacher_id,
      subject:subjects (
        id,
        name,
        code
      ),
      teacher:users (
        id,
        full_name
      )
    `)
    .eq('section_id', sectionId)
    .eq('academic_year_id', academicYearId)
    .is('deleted_at', null) as any)

  if (error) {
    console.error('Error in getClassSubjectsForSection repository:', error)
    return []
  }

  return (data || []).map((row: any) => {
    const subject = Array.isArray(row.subject) ? row.subject[0] : row.subject
    const teacher = Array.isArray(row.teacher) ? row.teacher[0] : row.teacher
    return {
      id: row.id,
      subject_id: row.subject_id,
      subject_name: subject?.name || 'Unknown Subject',
      subject_code: subject?.code || '',
      teacher_id: row.teacher_id,
      teacher_name: teacher?.full_name || 'Unassigned'
    }
  })
}

/**
 * Perform conflict checks for a proposed timetable slot:
 * 1. Teacher clash: check if the teacher is already scheduled in any section at the same day + period + academic year.
 * 2. Room clash: check if the same room is already in use by a different section at the same day + period + academic year.
 */
export async function checkTimetableConflicts(
  supabase: SupabaseClient<Database>,
  params: {
    id?: string // Exclude this ID when updating
    sectionId: string
    classSubjectId: string
    day: string
    periodNumber: number
    academicYearId: string
    room?: string | null
  }
): Promise<ConflictCheckResult> {
  // 1. Fetch teacher_id for the submitted classSubjectId
  const { data: classSubject, error: csError } = await (supabase
    .from('class_subjects')
    .select(`
      teacher_id,
      teacher:users(full_name),
      subject:subjects(name)
    `)
    .eq('id', params.classSubjectId)
    .is('deleted_at', null)
    .maybeSingle() as any)

  if (csError || !classSubject) {
    return { hasConflict: false }
  }

  const teacherObj = Array.isArray(classSubject.teacher) ? classSubject.teacher[0] : classSubject.teacher
  const teacherId = classSubject.teacher_id
  const teacherName = teacherObj?.full_name || 'Assigned Teacher'

  // 2. Check Teacher clash if teacherId is set
  if (teacherId) {
    let teacherClashQuery = supabase
      .from('timetable')
      .select(`
        id,
        day,
        period_number,
        section:sections!inner (
          name,
          class:classes!inner (
            name
          )
        ),
        class_subjects:class_subjects!inner (
          teacher_id
        )
      `)
      .eq('day', params.day.toLowerCase())
      .eq('period_number', params.periodNumber)
      .eq('academic_year_id', params.academicYearId)
      .eq('class_subjects.teacher_id', teacherId)
      .is('deleted_at', null)

    if (params.id) {
      teacherClashQuery = teacherClashQuery.neq('id', params.id)
    }

    const { data: teacherClashes, error: tcError } = await (teacherClashQuery as any)

    if (tcError) {
      console.error('Error checking teacher clashes:', tcError)
    } else if (teacherClashes && teacherClashes.length > 0) {
      const clash = teacherClashes[0]
      const sec = Array.isArray(clash.section) ? clash.section[0] : clash.section
      const cls = sec ? (Array.isArray(sec.class) ? sec.class[0] : sec.class) : null
      const targetSectionName = cls ? `${cls.name}-${sec.name}` : 'another section'

      return {
        hasConflict: true,
        type: 'teacher',
        reason: `${teacherName} is already scheduled to teach in Section ${targetSectionName} at this period.`
      }
    }
  }

  // 3. Check Room clash if room is specified
  const trimmedRoom = params.room?.trim()
  if (trimmedRoom) {
    let roomClashQuery = supabase
      .from('timetable')
      .select(`
        id,
        room,
        section_id,
        section:sections!inner (
          name,
          class:classes!inner (
            name
          )
        )
      `)
      .eq('day', params.day.toLowerCase())
      .eq('period_number', params.periodNumber)
      .eq('academic_year_id', params.academicYearId)
      .ilike('room', trimmedRoom)
      .is('deleted_at', null)

    // We only care if the room is clash-used in a DIFFERENT section
    roomClashQuery = roomClashQuery.neq('section_id', params.sectionId)

    if (params.id) {
      roomClashQuery = roomClashQuery.neq('id', params.id)
    }

    const { data: roomClashes, error: rcError } = await (roomClashQuery as any)

    if (rcError) {
      console.error('Error checking room clashes:', rcError)
    } else if (roomClashes && roomClashes.length > 0) {
      const clash = roomClashes[0]
      const sec = Array.isArray(clash.section) ? clash.section[0] : clash.section
      const cls = sec ? (Array.isArray(sec.class) ? sec.class[0] : sec.class) : null
      const targetSectionName = cls ? `${cls.name}-${sec.name}` : 'another section'

      return {
        hasConflict: true,
        type: 'room',
        reason: `Room "${trimmedRoom}" is already in use by Section ${targetSectionName} at this period.`
      }
    }
  }

  return { hasConflict: false }
}

/**
 * Securely create a new timetable entry.
 * Validates that the section and the class subject belong to the logged-in admin's institution.
 */
export async function createTimetableEntry(
  supabase: SupabaseClient<Database>,
  institutionId: string,
  params: {
    sectionId: string
    classSubjectId: string
    day: string
    periodNumber: number
    startsAt: string
    endsAt: string
    room?: string | null
    academicYearId: string
  }
) {
  // 1. Verify section belongs to institution
  const { data: sectionData, error: secErr } = await (supabase
    .from('sections')
    .select('id, class:classes!inner(institution_id)')
    .eq('id', params.sectionId)
    .maybeSingle() as any)

  if (secErr || !sectionData) {
    return { success: false, error: 'Section not found.' }
  }
  const classObj = Array.isArray(sectionData.class) ? sectionData.class[0] : sectionData.class
  if (classObj?.institution_id !== institutionId) {
    return { success: false, error: 'Unauthorized section.' }
  }

  // 2. Verify class_subject belongs to the section and the institution
  const { data: csData, error: csErr } = await (supabase
    .from('class_subjects')
    .select('id, section_id')
    .eq('id', params.classSubjectId)
    .is('deleted_at', null)
    .maybeSingle() as any)

  if (csErr || !csData) {
    return { success: false, error: 'Class subject not found.' }
  }
  if (csData.section_id !== params.sectionId) {
    return { success: false, error: 'Class subject does not belong to the selected section.' }
  }

  // 3. Conflict checks
  const conflict = await checkTimetableConflicts(supabase, {
    sectionId: params.sectionId,
    classSubjectId: params.classSubjectId,
    day: params.day,
    periodNumber: params.periodNumber,
    academicYearId: params.academicYearId,
    room: params.room
  })

  if (conflict.hasConflict) {
    return { success: false, error: conflict.reason }
  }

  // 4. Insert entry
  const { data, error } = await (supabase
    .from('timetable') as any)
    .insert({
      section_id: params.sectionId,
      class_subject_id: params.classSubjectId,
      day: params.day.toLowerCase() as any,
      period_number: params.periodNumber,
      starts_at: params.startsAt,
      ends_at: params.endsAt,
      room: params.room?.trim() || null,
      academic_year_id: params.academicYearId
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error inserting timetable entry:', error)
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

/**
 * Securely update an existing timetable entry.
 * Validates that the original entry, section, and class subject belong to the logged-in admin's institution.
 */
export async function updateTimetableEntry(
  supabase: SupabaseClient<Database>,
  id: string,
  institutionId: string,
  params: {
    sectionId: string
    classSubjectId: string
    day: string
    periodNumber: number
    startsAt: string
    endsAt: string
    room?: string | null
    academicYearId: string
  }
) {
  // 1. Verify original timetable entry belongs to institution transitively
  const { data: existingEntry, error: existErr } = await (supabase
    .from('timetable')
    .select('id, section_id, section:sections!inner(class:classes!inner(institution_id))')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle() as any)

  if (existErr || !existingEntry) {
    return { success: false, error: 'Timetable entry not found.' }
  }

  const existingSection = Array.isArray(existingEntry.section) ? existingEntry.section[0] : existingEntry.section
  const existingClass = existingSection ? (Array.isArray(existingSection.class) ? existingSection.class[0] : existingSection.class) : null
  if (existingClass?.institution_id !== institutionId) {
    return { success: false, error: 'Unauthorized timetable entry.' }
  }

  // 2. Verify new section belongs to institution
  const { data: sectionData, error: secErr } = await (supabase
    .from('sections')
    .select('id, class:classes!inner(institution_id)')
    .eq('id', params.sectionId)
    .maybeSingle() as any)

  if (secErr || !sectionData) {
    return { success: false, error: 'Section not found.' }
  }
  const classObj = Array.isArray(sectionData.class) ? sectionData.class[0] : sectionData.class
  if (classObj?.institution_id !== institutionId) {
    return { success: false, error: 'Unauthorized section.' }
  }

  // 3. Verify new class_subject belongs to the section and institution
  const { data: csData, error: csErr } = await (supabase
    .from('class_subjects')
    .select('id, section_id')
    .eq('id', params.classSubjectId)
    .is('deleted_at', null)
    .maybeSingle() as any)

  if (csErr || !csData) {
    return { success: false, error: 'Class subject not found.' }
  }
  if (csData.section_id !== params.sectionId) {
    return { success: false, error: 'Class subject does not belong to the selected section.' }
  }

  // 4. Conflict checks (excluding own ID)
  const conflict = await checkTimetableConflicts(supabase, {
    id,
    sectionId: params.sectionId,
    classSubjectId: params.classSubjectId,
    day: params.day,
    periodNumber: params.periodNumber,
    academicYearId: params.academicYearId,
    room: params.room
  })

  if (conflict.hasConflict) {
    return { success: false, error: conflict.reason }
  }

  // 5. Update entry
  const { error } = await (supabase
    .from('timetable') as any)
    .update({
      section_id: params.sectionId,
      class_subject_id: params.classSubjectId,
      day: params.day.toLowerCase() as any,
      period_number: params.periodNumber,
      starts_at: params.startsAt,
      ends_at: params.endsAt,
      room: params.room?.trim() || null,
      academic_year_id: params.academicYearId,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating timetable entry:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Securely soft-deletes a timetable entry.
 * Validates that the original entry belongs to the logged-in admin's institution.
 */
export async function deleteTimetableEntry(
  supabase: SupabaseClient<Database>,
  id: string,
  institutionId: string
) {
  // 1. Verify original timetable entry belongs to institution transitively
  const { data: existingEntry, error: existErr } = await (supabase
    .from('timetable')
    .select('id, section_id, section:sections!inner(class:classes!inner(institution_id))')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle() as any)

  if (existErr || !existingEntry) {
    return { success: false, error: 'Timetable entry not found.' }
  }

  const existingSection = Array.isArray(existingEntry.section) ? existingEntry.section[0] : existingEntry.section
  const existingClass = existingSection ? (Array.isArray(existingSection.class) ? existingSection.class[0] : existingSection.class) : null
  if (existingClass?.institution_id !== institutionId) {
    return { success: false, error: 'Unauthorized timetable entry.' }
  }

  // 2. Soft-delete entry
  const { error } = await (supabase
    .from('timetable') as any)
    .update({
      deleted_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting timetable entry:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
