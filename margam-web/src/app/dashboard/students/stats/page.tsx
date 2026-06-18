import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdmissionStats } from '@/lib/repositories/student'

export default async function AdmissionStatsPage() {
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

  const stats = await getAdmissionStats(supabase, userData.institution_id)

  const genderLabels: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    preferNotToSay: 'Prefer Not to Say'
  }

  return (
    <div className="space-y-8 font-body animate-fade-in">
      {/* Back button & Header */}
      <div className="flex flex-col gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <Link
            href="/dashboard/students"
            className="inline-flex items-center gap-2 text-xs font-bold text-steel-gray hover:text-primary transition-all py-1.5 px-3 bg-white border border-light-gray/60 rounded-xl shadow-sm hover:shadow cursor-pointer active:scale-95 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Directory
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Admission Stats</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Comprehensive report of student registrations, class-wise distribution, and demographic details.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <p className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Total Enrolled</p>
          <h3 className="text-3xl font-black text-charcoal mt-2 font-heading tracking-tight">{stats.totalStudents}</h3>
        </div>

        {/* Active Students */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-success" />
          <p className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Active Profiles</p>
          <h3 className="text-3xl font-black text-charcoal mt-2 font-heading tracking-tight">{stats.activeCount}</h3>
        </div>

        {/* Suspended Students */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-warning" />
          <p className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Suspended</p>
          <h3 className="text-3xl font-black text-charcoal mt-2 font-heading tracking-tight">{stats.suspendedCount}</h3>
        </div>

        {/* Inactive Students */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-danger" />
          <p className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Inactive</p>
          <h3 className="text-3xl font-black text-charcoal mt-2 font-heading tracking-tight">{stats.inactiveCount}</h3>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Class-wise counts */}
        <div className="lg:col-span-2 bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-charcoal font-heading mb-4 border-b border-light-gray/40 pb-3">Class Distribution</h3>
          {stats.classStats.length === 0 ? (
            <div className="py-12 text-center text-steel-gray/60 text-sm font-body">
              No class distribution records available.
            </div>
          ) : (
            <div className="space-y-6">
              {stats.classStats.map((c) => (
                <div key={c.classId} className="border border-light-gray/50 rounded-xl p-4 bg-cream/10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-primary font-heading">Class {c.className}</span>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-cream border border-light-gray/60 text-charcoal rounded-md">
                        Total: {c.totalCount}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-success/10 border border-success/20 text-success rounded-md">
                        Active: {c.activeCount}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {c.sections.map((sec) => (
                      <div key={sec.sectionId} className="bg-white p-2.5 rounded-lg border border-light-gray/40 text-center">
                        <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wide font-caption">Section {sec.sectionName}</span>
                        <span className="text-sm font-bold text-charcoal font-heading mt-1 block">{sec.studentCount} students</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demographic breakdowns */}
        <div className="space-y-8">
          {/* Gender breakdown */}
          <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-charcoal font-heading mb-4 border-b border-light-gray/40 pb-3">Demographics (Gender)</h3>
            <div className="space-y-4">
              {Object.entries(stats.genderDistribution).map(([key, count]) => {
                const pct = stats.totalStudents > 0 ? Math.round((count / stats.totalStudents) * 100) : 0
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-charcoal">
                      <span className="font-caption">{genderLabels[key] || key}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-light-gray/50 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: 'var(--primary)' }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Enrollment status ratios */}
          <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-charcoal font-heading mb-4 border-b border-light-gray/40 pb-3">Profile Statuses</h3>
            <div className="space-y-4">
              {/* Active */}
              <div className="flex justify-between items-center p-3 bg-success/5 border border-success/15 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-success font-caption block">Active</span>
                  <span className="text-[10px] text-steel-gray">Login permitted, actively enrolled</span>
                </div>
                <span className="text-lg font-black text-success font-heading">{stats.activeCount}</span>
              </div>
              {/* Suspended */}
              <div className="flex justify-between items-center p-3 bg-warning/5 border border-warning/15 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-warning font-caption block">Suspended</span>
                  <span className="text-[10px] text-steel-gray">Login suspended by admin</span>
                </div>
                <span className="text-lg font-black text-warning font-heading">{stats.suspendedCount}</span>
              </div>
              {/* Inactive */}
              <div className="flex justify-between items-center p-3 bg-danger/5 border border-danger/15 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-danger font-caption block">Inactive</span>
                  <span className="text-[10px] text-steel-gray">Withdrawn or graduated profiles</span>
                </div>
                <span className="text-lg font-black text-danger font-heading">{stats.inactiveCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
