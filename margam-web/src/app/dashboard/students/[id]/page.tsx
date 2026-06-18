import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getStudentProfile,
  getStudentMarks,
  getStudentPreviousResults,
  getStudentAIScores,
} from '@/lib/repositories/student'
import StudentProfileTabs from './StudentProfileTabs'

export default async function StudentDetailPage({
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
  const { id: studentId } = await params

  // Fetch the core profile with strict tenant validation inside the query
  const profile = await getStudentProfile(supabase, institutionId, studentId)

  // Tenant validation / Not found check
  if (!profile) {
    notFound()
  }

  // Fetch student performance details in parallel
  const [marks, results, aiSummary] = await Promise.all([
    getStudentMarks(supabase, institutionId, studentId),
    getStudentPreviousResults(supabase, institutionId, studentId),
    getStudentAIScores(supabase, institutionId, studentId, 'this_term'),
  ])

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6 font-body">
      {/* Back button link */}
      <div>
        <Link
          href="/dashboard/students"
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
        {/* Left Column: Student Summary Card */}
        <div className="lg:col-span-1 bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 relative overflow-hidden animate-fade-in">
          {/* Accent decoration stripe */}
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />

          {/* Student profile photo / Initials badge */}
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

          {/* Name & Admission code */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-charcoal font-heading">{profile.full_name}</h2>
            <p className="text-xs font-semibold text-steel-gray font-caption">
              ID: {profile.student_code}
            </p>
          </div>

          <div className="w-full border-t border-light-gray/40 my-1" />

          {/* Enrolment details metadata grid */}
          <div className="w-full grid grid-cols-2 gap-3 text-left">
            <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
              <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                Class
              </span>
              <span className="text-sm font-bold text-primary font-heading">
                {profile.class_name}
              </span>
            </div>
            <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
              <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                Section
              </span>
              <span className="text-sm font-bold text-primary font-heading">
                {profile.section_name}
              </span>
            </div>
            <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
              <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                Roll Number
              </span>
              <span className="text-xs font-bold text-charcoal font-body">
                {profile.roll_number}
              </span>
            </div>
            <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
              <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                Enrolment status
              </span>
              {profile.is_active ? (
                <span className="inline-flex items-center text-[10px] font-extrabold text-success font-caption uppercase">
                  Enrolled
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-extrabold text-danger font-caption uppercase">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Performance & Info details */}
        <div className="lg:col-span-2">
          <StudentProfileTabs
            profile={profile}
            marks={marks}
            results={results}
            aiSummary={aiSummary}
          />
        </div>
      </div>
    </div>
  )
}
