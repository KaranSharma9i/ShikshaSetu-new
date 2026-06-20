'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Check if the route redirected with an error query param
    const err = searchParams.get('error')
    if (err === 'unauthorized_role') {
      setErrorMsg('This portal is for institution admins only. Please use the Margam mobile app.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // Distinguish standard auth failures (wrong password, user not found, etc.)
        setErrorMsg(authError.message)
        setLoading(false)
        return
      }

      const user = authData?.user
      if (user) {
        // Step 1: Query users table for role and institution_id
        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('role, institution_id')
          .eq('id', user.id)
          .single()

        if (dbError || !userData) {
          // If we fail to fetch role or no row exists, sign them out immediately
          await supabase.auth.signOut()
          setErrorMsg('Access denied: User profile not found in database.')
          setLoading(false)
          return
        }

        // Step 2: Strict role validation
        if (userData.role !== 'institution_admin') {
          // Explicit student/teacher rejection before querying branding
          await supabase.auth.signOut()
          setErrorMsg('This portal is for institution admins only. Please use the Margam mobile app.')
          setLoading(false)
          return
        }

        // Step 3: Fetch institution branding details ONLY if verified as institution_admin
        const { data: instData, error: instError } = await supabase
          .from('institutions')
          .select('name, tagline, logo_url, theme')
          .eq('id', userData.institution_id)
          .single()

        if (instError || !instData) {
          await supabase.auth.signOut()
          setErrorMsg('Access denied: Associated institution not found.')
          setLoading(false)
          return
        }

        // Step 4: Save theme details to the margam_theme cookie client-side
        const themeCookieData = {
          colors: instData.theme?.colors || {},
          fonts: instData.theme?.fonts || {},
          name: instData.name,
          logo_url: instData.logo_url,
          tagline: instData.tagline,
        }
        document.cookie = `margam_theme=${encodeURIComponent(JSON.stringify(themeCookieData))}; path=/; max-age=31536000; SameSite=Lax`

        setSuccessMsg('Authentication successful. Redirecting...')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 font-body">
      <div className="w-full max-w-md bg-white border border-light-gray rounded-2xl p-8 shadow-xl relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary-alt/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mb-8 text-center relative z-10">
          <h1 className="text-3xl font-bold text-primary tracking-tight font-heading">Margam</h1>
          <p className="text-charcoal/70 mt-2 text-sm font-caption">Institution Web Portal</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm leading-relaxed z-10 relative font-body">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm leading-relaxed z-10 relative font-body">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div>
            <label className="block text-charcoal/80 text-xs font-semibold uppercase tracking-wider mb-2 font-caption" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@institution.edu"
              className="w-full bg-white border border-light-gray rounded-xl px-4 py-3 text-charcoal placeholder-steel-gray/50 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all disabled:opacity-50 font-body"
            />
          </div>

          <div>
            <label className="block text-charcoal/80 text-xs font-semibold uppercase tracking-wider mb-2 font-caption" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-light-gray rounded-xl px-4 py-3 text-charcoal placeholder-steel-gray/50 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all disabled:opacity-50 font-body"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary hover:bg-secondary-light text-primary font-bold py-3 px-4 rounded-xl shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-secondary/50 hover:shadow-secondary/10 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center font-heading cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-slate-400 animate-pulse text-sm">Loading login portal...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
