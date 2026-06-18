import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from './Header'
import Sidebar from './Sidebar'
import { InstitutionProvider } from '@/providers/InstitutionProvider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Retrieve user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Retrieve user profile and joined institution details in a single query
  const { data: userData, error } = await supabase
    .from('users')
    .select('role, full_name, institution_id, institutions(name, tagline, logo_url, theme)')
    .eq('id', user.id)
    .single()

  if (error || !userData || userData.role !== 'institution_admin') {
    // Session is invalid or role is not institution admin - redirect to server sign-out handler
    redirect('/auth/unauthorized')
  }

  const inst = userData.institutions as any
  const institutionName = inst?.name || '[Institution Name]'
  const tagline = inst?.tagline || null
  const logoUrl = inst?.logo_url || null
  const theme = inst?.theme || null
  const userDisplayName = userData.full_name || user.email || 'Admin'

  return (
    <InstitutionProvider
      institutionName={institutionName}
      tagline={tagline}
      logoUrl={logoUrl}
      theme={theme}
    >
      <div className="min-h-screen bg-cream text-charcoal flex flex-col font-body">
        {/* Header */}
        <Header userDisplayName={userDisplayName} />

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-cream/30 p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </InstitutionProvider>
  )
}

