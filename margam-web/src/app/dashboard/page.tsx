import { createClient } from '@/utils/supabase/server'
import { getDashboardMetrics } from '@/lib/repositories/dashboard'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
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
    .select('institution_id, full_name')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    redirect('/auth/unauthorized')
  }

  // Fetch metrics dynamically from the server-side repositories
  const metrics = await getDashboardMetrics(supabase, userData.institution_id)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div className="space-y-8 font-body">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">
            Welcome back, {userData.full_name || 'Admin'}
          </h1>
          <p className="text-steel-gray text-sm mt-1 font-caption">
            Here is what&apos;s happening at your institution today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/circulars"
            className="bg-primary hover:bg-primary-alt text-white text-xs md:text-sm font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
          >
            Create Circular
          </Link>
          <Link
            href="/dashboard/fees"
            className="bg-secondary hover:bg-secondary-light text-primary text-xs md:text-sm font-bold py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
          >
            Collect Fees
          </Link>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students Card */}
        <div className="group bg-white border border-light-gray/60 hover:border-primary/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">Total Students</p>
              <h3 className="text-3xl font-bold text-charcoal mt-2 font-heading tracking-tight group-hover:text-primary transition-colors">
                {metrics.totalStudents}
              </h3>
            </div>
            <div className="p-3 bg-primary/5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 w-fit px-2.5 py-1 rounded-full">
            <span>+24 this month</span>
          </div>
        </div>

        {/* Total Teachers Card */}
        <div className="group bg-white border border-light-gray/60 hover:border-secondary/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">Total Teachers</p>
              <h3 className="text-3xl font-bold text-charcoal mt-2 font-heading tracking-tight group-hover:text-secondary transition-colors">
                {metrics.totalTeachers}
              </h3>
            </div>
            <div className="p-3 bg-secondary/10 rounded-xl text-secondary group-hover:bg-secondary group-hover:text-primary transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 w-fit px-2.5 py-1 rounded-full">
            <span>+2 this term</span>
          </div>
        </div>

        {/* Attendance Rate Card */}
        <div className="group bg-white border border-light-gray/60 hover:border-emerald-500/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">Today&apos;s Attendance</p>
              <h3 className="text-3xl font-bold text-charcoal mt-2 font-heading tracking-tight group-hover:text-emerald-600 transition-colors">
                {metrics.attendanceRate}%
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-steel-gray font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time status</span>
          </div>
        </div>

        {/* Fees Collected Today Card */}
        <div className="group bg-white border border-light-gray/60 hover:border-amber-500/20 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">Collected Today</p>
              <h3 className="text-2xl font-bold text-charcoal mt-2.5 font-heading tracking-tight group-hover:text-amber-600 transition-colors">
                {formatCurrency(metrics.feesCollectedToday)}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-steel-gray font-medium">
            <span>Direct web + mobile logs</span>
          </div>
        </div>
      </div>

      {/* Details Sections: Payments + Circulars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Payments Logs */}
        <div className="lg:col-span-2 bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-bold text-charcoal font-heading">Recent Fee Transactions</h4>
                <p className="text-xs text-steel-gray font-caption">Last 5 payments recorded across classes</p>
              </div>
              <Link
                href="/dashboard/fees"
                className="text-xs font-semibold text-secondary hover:text-secondary-light transition-colors font-body"
              >
                View All Payments
              </Link>
            </div>

            {metrics.recentPayments.length === 0 ? (
              <div className="py-12 text-center text-steel-gray/60 text-sm font-body border border-dashed border-light-gray rounded-xl">
                No fee transactions logged today.
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 bg-cream/25 hover:bg-cream/40 border border-light-gray/40 rounded-xl transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-sm font-heading">
                        ₹
                      </div>
                      <div>
                        <p className="text-sm font-bold text-charcoal font-heading">{p.studentName}</p>
                        <p className="text-xs text-steel-gray font-caption mt-0.5">
                          Class {p.className} • {p.payment_method || 'Other'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-charcoal font-heading">
                        +{formatCurrency(p.amount_paid)}
                      </p>
                      <p className="text-[10px] text-steel-gray font-caption mt-0.5">
                        {new Date(p.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Institution Circulars Feed */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-bold text-charcoal font-heading">Active Circulars</h4>
                <p className="text-xs text-steel-gray font-caption">Internal announcements and notifications</p>
              </div>
              <Link
                href="/dashboard/circulars"
                className="text-xs font-semibold text-primary hover:text-primary-alt transition-colors font-body"
              >
                Manage Feed
              </Link>
            </div>

            {metrics.recentCirculars.length === 0 ? (
              <div className="py-12 text-center text-steel-gray/60 text-sm font-body border border-dashed border-light-gray rounded-xl">
                No active announcements published.
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.recentCirculars.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-cream/25 hover:bg-cream/40 border border-light-gray/40 rounded-xl transition-all duration-200 flex flex-col gap-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 bg-primary/5 rounded-full font-caption">
                        {c.category || 'General'}
                      </span>
                      <span className="text-[10px] text-steel-gray font-caption">
                        {new Date(c.publish_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-charcoal leading-tight font-heading hover:text-primary transition-colors cursor-pointer">
                      {c.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
