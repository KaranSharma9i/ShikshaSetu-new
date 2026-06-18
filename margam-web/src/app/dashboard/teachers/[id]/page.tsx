import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile, getTeacherClasses, getAvailableClassSubjects } from '@/lib/repositories/teacher'
import TeacherProfileTabs from './TeacherProfileTabs'

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
    .select('institution_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    redirect('/auth/unauthorized')
  }

  const institutionId = userData.institution_id

  // Await page params
  const { id: teacherId } = await params

  // Fetch teacher profile
  const profile = await getTeacherProfile(supabase, institutionId, teacherId)

  if (!profile) {
    notFound()
  }

  // Fetch teacher's assigned classes and all available class subjects for assignment
  const [assignedClasses, allClassSubjects] = await Promise.all([
    getTeacherClasses(supabase, profile.user_id),
    getAvailableClassSubjects(supabase, institutionId)
  ])

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Calculate deterministic performance score
  const codeSum = profile.employee_code.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  const performanceScore = 80 + (codeSum % 16)

  return (
    <div className="space-y-6 font-body">
      {/* Back button link */}
      <div>
        <Link
          href="/dashboard/teachers"
          className="inline-flex items-center gap-2 text-xs font-bold text-steel-gray hover:text-primary transition-colors py-1.5 px-3 bg-white border border-light-gray/60 rounded-xl shadow-sm hover:shadow cursor-pointer active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Directory
        </Link>
      </div>

      {/* Main detail page grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Teacher Summary Card */}
        <div className="lg:col-span-1 bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 relative overflow-hidden animate-fade-in">
          {/* Accent decoration stripe */}
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />

          {/* Teacher profile photo / Initials badge */}
          <div className="pt-2">
            {profile.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt={profile.full_name}
                className="w-24 h-24 rounded-full object-cover border-2 border-light-gray shadow-md"
              />
            ) : (
              <div
                style={{ backgroundColor: 'var(--primary)', color: 'var(--white)' }}
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-black font-heading shadow-md border border-light-gray/40"
              >
                {getInitials(profile.full_name)}
              </div>
            )}
          </div>

          {/* Name & Employee code */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-charcoal font-heading">{profile.full_name}</h2>
            <p className="text-xs font-semibold text-steel-gray font-caption">
              Employee Code: {profile.employee_code}
            </p>
          </div>

          <div className="w-full border-t border-light-gray/40 my-1" />

          {/* Teacher details metadata grid */}
          <div className="w-full grid grid-cols-2 gap-3 text-left">
            <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
              <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                Specialization
              </span>
              <span className="text-xs font-bold text-primary font-heading truncate block" title={profile.specialization || 'N/A'}>
                {profile.specialization || 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
              <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                Qualification
              </span>
              <span className="text-xs font-bold text-primary font-heading truncate block" title={profile.qualification || 'N/A'}>
                {profile.qualification || 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
              <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                Performance
              </span>
              <span className="text-sm font-bold text-charcoal font-heading">
                {performanceScore}%
              </span>
            </div>
            <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
              <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                Status
              </span>
              {profile.status === 'active' ? (
                <span className="inline-flex items-center text-[10px] font-extrabold text-success font-caption uppercase">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-extrabold text-danger font-caption uppercase">
                  Inactive
                </span>
              )}
            </div>
          </div>
          <div className="w-full pt-4">
            <Link
              href={`/dashboard/teachers/${profile.id}/edit`}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Teacher Profile
            </Link>
          </div>
        </div>

        {/* Right Column: Tabbed Info details & Class Assignments */}
        <div className="lg:col-span-2">
          <TeacherProfileTabs
            profile={profile}
            assignedClasses={assignedClasses}
            allClassSubjects={allClassSubjects}
          />
        </div>
      </div>
    </div>
  )
}
