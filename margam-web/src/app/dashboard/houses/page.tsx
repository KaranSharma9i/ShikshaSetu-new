import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getHousesByInstitution } from '@/lib/repositories/houses'
import HousesClient from './HousesClient'

export default async function HousesPage() {
  const supabase = await createClient()

  // Retrieve user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Retrieve user profile for institution association
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('institution_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id || userData.role !== 'institution_admin') {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id
  const houses = await getHousesByInstitution(supabase, institutionId)

  return (
    <HousesClient initialHouses={houses} />
  )
}
