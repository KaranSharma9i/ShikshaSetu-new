import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function IndexPage() {
  const supabase = await createClient()

  // Retrieve user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Retrieve user profile and double-check role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role === 'institution_admin') {
    redirect('/dashboard')
  } else {
    // If a session exists but the role is not admin, route to unauthorized handler
    redirect('/auth/unauthorized')
  }
}
