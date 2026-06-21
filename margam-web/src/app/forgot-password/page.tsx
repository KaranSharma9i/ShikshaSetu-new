'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      const redirectToUrl = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectToUrl,
      })

      if (error) {
        // Standard technical error handling (e.g. rate limit, bad formatting)
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      // Success state (doesn't reveal if email existed or not)
      setSubmitted(true)
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

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#1C1917] font-heading">Check your email</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              If an account is associated with <strong className="text-[#1C1917]">{email}</strong>, we have sent a secure password reset link. Please check your inbox.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="text-sm font-bold text-[#EA580C] hover:text-[#EA580C]/80 transition-colors font-caption cursor-pointer"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <h3 className="text-xl font-bold text-[#1C1917] font-heading">Forgot Password?</h3>
              <p className="text-xs text-[#6B7280] mt-2 font-body">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm leading-relaxed font-body">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    Sending link...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#EA580C] hover:text-[#EA580C]/80 transition-colors font-caption cursor-pointer"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
