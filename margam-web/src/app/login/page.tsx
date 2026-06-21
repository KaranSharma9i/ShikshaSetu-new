'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    const success = searchParams.get('success')
    if (success === 'password_reset') {
      setSuccessMsg('Your password has been successfully reset. Please sign in with your new password.')
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
          await supabase.auth.signOut()
          setErrorMsg('Access denied: User profile not found in database.')
          setLoading(false)
          return
        }

        // Step 2: Strict role validation
        if (userData.role !== 'institution_admin') {
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
    <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center p-4 md:p-8 lg:p-12 font-body selection:bg-[#EA580C]/10 relative overflow-hidden">
      {/* Decorative background glow lines/waves using SVG */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EA580C]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center relative z-10">
        
        {/* Left Column (Branding & Mascot & Pills) */}
        <div className="lg:col-span-7 flex flex-col justify-center text-[#1C1917] relative">
          
          {/* Brand Header */}
          <div className="flex items-center gap-3 lg:gap-4 mb-6 lg:mb-8 justify-center lg:justify-start">
            <Image
              src="/icon.png"
              alt="Margam Logo"
              width={64}
              height={64}
              className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
              priority
            />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1C1917] font-heading">MARGAM</span>
              </div>
              <p className="text-[10px] lg:text-xs font-bold tracking-widest text-[#D4AF37] uppercase font-caption">
                Digital Backbone of Institutions
              </p>
            </div>
          </div>

          {/* Welcome Message - Hidden on mobile */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1C1917] tracking-tight leading-tight mb-3 font-heading">
              Welcome Back!
            </h2>
            <p className="text-[#6B7280] text-base lg:text-lg font-medium leading-relaxed font-body max-w-md">
              Sign in to your institution portal and continue your work.
            </p>
          </div>

          {/* Mascot & Value Props Container - Hidden on mobile */}
          <div className="hidden lg:block relative">
            <div className="space-y-4 max-w-md z-10 relative">
              
              {/* Pill 1: Attendance */}
              <div className="flex gap-4 items-start bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-[#EA580C]/10 rounded-xl shrink-0">
                  <svg className="w-6 h-6 text-[#EA580C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[#1C1917] text-base font-heading">Attendance Tracking</h4>
                  <p className="text-xs text-[#6B7280] mt-1 font-body leading-relaxed">
                    Real-time attendance tracking of students and staff members.
                  </p>
                </div>
              </div>

              {/* Pill 2: Fees */}
              <div className="flex gap-4 items-start bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-[#EA580C]/10 rounded-xl shrink-0">
                  <svg className="w-6 h-6 text-[#EA580C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[#1C1917] text-base font-heading">Fee Collection</h4>
                  <p className="text-xs text-[#6B7280] mt-1 font-body leading-relaxed">
                    Automated billing, reminders, and online fee collection dashboard.
                  </p>
                </div>
              </div>

              {/* Pill 3: AI Homework */}
              <div className="flex gap-4 items-start bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-3 bg-[#EA580C]/10 rounded-xl shrink-0">
                  <svg className="w-6 h-6 text-[#EA580C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-2.757z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[#1C1917] text-base font-heading">AI-Powered Homework</h4>
                  <p className="text-xs text-[#6B7280] mt-1 font-body leading-relaxed">
                    Smart homework generation and automatic scoring out of 10.
                  </p>
                </div>
              </div>

            </div>

            {/* Mascot Image */}
            <div className="absolute right-[-24px] bottom-[-40px] w-72 h-72 z-0 select-none pointer-events-none transition-transform hover:scale-105 duration-500">
              <Image
                src="/mascot.png"
                alt="Margam Mascot"
                width={288}
                height={288}
                className="w-full h-full object-contain drop-shadow-xl"
                priority
              />
            </div>
          </div>
        </div>

        {/* Right Column (Sign In Card) */}
        <div className="lg:col-span-5 flex justify-center w-full">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-[2rem] p-8 lg:p-10 shadow-xl relative overflow-hidden">
            
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#D4AF37]" />

            <div className="mb-8 text-center">
              <h3 className="text-2xl lg:text-3xl font-extrabold text-[#1C1917] font-heading flex items-center justify-center gap-2">
                <span className="text-[#EA580C]">✦</span> Sign In <span className="text-[#EA580C]">✦</span>
              </h3>
              <p className="text-[#6B7280] mt-2 text-sm font-body">Please sign in to access your dashboard.</p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm leading-relaxed font-body">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm leading-relaxed font-body">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-2 font-caption" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@institution.edu"
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-11 pr-4 py-3.5 text-[#1C1917] placeholder-[#6B7280]/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35 focus:border-[#D4AF37] transition-all disabled:opacity-50 font-body text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-2 font-caption" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-11 pr-11 py-3.5 text-[#1C1917] placeholder-[#6B7280]/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35 focus:border-[#D4AF37] transition-all disabled:opacity-50 font-body text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#6B7280] hover:text-[#EA580C] transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858-.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                
                <div className="mt-3 flex justify-end">
                  <Link 
                    href="/forgot-password" 
                    className="text-xs font-bold text-[#EA580C] hover:text-[#EA580C]/80 transition-colors font-caption"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1C1917] font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl shadow-[#D4AF37]/10 hover:shadow-[#D4AF37]/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center font-heading cursor-pointer text-sm tracking-wide"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-[#1C1917]" viewBox="0 0 24 24" fill="none">
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
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF6EC] flex flex-col items-center justify-center p-4">
        <div className="text-[#6B7280] animate-pulse text-sm">Loading login portal...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
