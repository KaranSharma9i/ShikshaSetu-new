// Server-only helper (imported by server components only).
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/** Authenticates the current request and returns the admin's institution, or redirects. */
export async function requireInstitutionAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData, error } = await supabase
    .from('users')
    .select('role, institution_id')
    .eq('id', user.id)
    .single()

  if (error || !userData?.institution_id || userData.role !== 'institution_admin') {
    redirect('/auth/unauthorized')
  }

  return { supabase, institutionId: userData.institution_id as string, userId: user.id }
}
