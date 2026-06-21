'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const code = searchParams.get('code')
    
    if (code) {
      // Exchange code for session (PKCE flow recovery)
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          setVerifying(false)
          if (error) {
            setErrorMsg('Invalid or expired reset link. Please request a new one.')
          } else {
            setSessionReady(true)
          }
        })
        .catch(() => {
          setVerifying(false)
          setErrorMsg('An error occurred while verifying the reset link.')
        })
    } else {
      // Check if session is already active (implicit flow recovery or already exchanged)
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          setVerifying(false)
          if (session) {
            setSessionReady(true)
          } else {
            setErrorMsg('Reset link is invalid, expired, or missing details. Please request a new one.')
          }
        })
        .catch(() => {
          setVerifying(false)
          setErrorMsg('Could not verify authentication session.')
        })
    }
  }, [searchParams, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      // Password updated successfully. Sign the user out to clear recovery session and force login
      await supabase.auth.signOut()

      // Redirect to login page with success flag
      router.push('/login?success=password_reset')
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center p-4 font-body selection:bg-[#EA580C]/10 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EA580C]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-[2rem] p-8 lg:p-10 shadow-xl relative z-10 overflow-hidden">
        
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#D4AF37]" />

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/icon.png"
            alt="Margam Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain mb-3"
            priority
          />
          <h2 className="text-xl font-extrabold tracking-tight text-[#1C1917] font-heading">
            MARGAM
          </h2>
          <p className="text-[10px] font-bold tracking-widest text-[#D4AF37] uppercase font-caption">
            Institution Portal
          </p>
        </div>

        {verifying ? (
          <div className="text-center py-6 space-y-4">
            <svg className="animate-spin h-8 w-8 text-[#EA580C] mx-auto" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-[#6B7280]">Verifying reset token...</p>
          </div>
        ) : errorMsg && !sessionReady ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#1C1917] font-heading">Reset Failed</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              {errorMsg}
            </p>
            <div className="pt-4 flex flex-col gap-2">
              <Link
                href="/forgot-password"
                className="text-sm font-bold text-[#EA580C] hover:text-[#EA580C]/80 transition-colors font-caption cursor-pointer"
              >
                Request another reset link
              </Link>
              <Link
                href="/login"
                className="text-xs text-[#6B7280] hover:text-[#1C1917] transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <h3 className="text-xl font-bold text-[#1C1917] font-heading">Reset Password</h3>
              <p className="text-xs text-[#6B7280] mt-2 font-body">
                Please enter and confirm your new password below.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm leading-relaxed font-body">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-2 font-caption" htmlFor="password">
                  New Password
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
                    placeholder="Minimum 6 characters"
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
              </div>

              <div>
                <label className="block text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-2 font-caption" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-11 pr-4 py-3.5 text-[#1C1917] placeholder-[#6B7280]/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35 focus:border-[#D4AF37] transition-all disabled:opacity-50 font-body text-sm"
                  />
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
                    Updating password...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF6EC] flex flex-col items-center justify-center p-4">
        <div className="text-[#6B7280] animate-pulse text-sm">Loading recovery portal...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
