import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  // Cleanly sign out of Supabase Auth, clearing the cookies on the response
  await supabase.auth.signOut()
  
  const requestUrl = new URL(request.url)
  const redirectUrl = new URL('/login', requestUrl.origin)
  redirectUrl.searchParams.set('error', 'unauthorized_role')
  
  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set('margam_theme', '', { path: '/', maxAge: 0 })
  
  return response
}

