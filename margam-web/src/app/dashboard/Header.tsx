'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useInstitution } from '@/providers/InstitutionProvider'

export default function Header({
  userDisplayName,
}: {
  userDisplayName: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)
  const [imgError, setImgError] = useState(false)
  
  const { institutionName, tagline, logoUrl } = useInstitution()

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      // Clear cookie client-side immediately
      document.cookie = 'margam_theme=; path=/; max-age=0; SameSite=Lax'
      
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Error logging out:', err)
      setLoggingOut(false)
    }
  }

  return (
    <header className="bg-primary-alt border-b border-light-gray/10 px-6 py-4 flex items-center justify-between z-10 font-body print:hidden">
      <div className="flex items-center gap-4">
        {/* Dynamic Logo with Graceful Fallback */}
        {logoUrl && !imgError ? (
          <img
            src={logoUrl}
            alt={institutionName}
            onError={() => setImgError(true)}
            className="w-10 h-10 object-contain rounded-xl bg-white/5 p-1 border border-light-gray/10"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-secondary text-primary font-bold flex items-center justify-center text-sm font-heading shadow-md border border-secondary/20">
            {institutionName ? institutionName.substring(0, 2).toUpperCase() : 'MG'}
          </div>
        )}

        <div className="flex flex-col">
          <span className="text-white font-bold text-sm md:text-base font-heading leading-tight">
            {institutionName}
          </span>
          {tagline && (
            <span className="text-white/70 text-[10px] md:text-xs font-caption leading-none mt-0.5">
              {tagline}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs md:text-sm text-white/80 font-caption">
          {userDisplayName}
        </span>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="bg-primary hover:bg-primary-alt text-secondary hover:text-secondary-light px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all border border-light-gray/10 active:scale-[0.98] disabled:opacity-50 font-heading"
        >
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </header>
  )
}
