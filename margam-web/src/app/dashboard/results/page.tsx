import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ResultsPage() {
  const supabase = await createClient()

  // 1. Retrieve session user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Retrieve user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('institution_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.institution_id) {
    redirect('/auth/unauthorized')
  }

  return (
    <div className="space-y-8 font-body">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Exam Results & Reports</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Manage subject-wise marks entry, lock/unlock exams, print report cards, and generate class summary sheets.
          </p>
        </div>
      </div>

      {/* Main Results Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Legacy Exams Assignment - ACTIVE */}
        <Link
          href="/dashboard/results/legacy-assign"
          className="group flex flex-col justify-between p-6 bg-white border border-light-gray/60 hover:border-primary/20 rounded-2xl hover:bg-cream/10 transition-all duration-300 shadow-sm"
        >
          <div>
            <div className="p-3 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white rounded-xl w-fit transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-charcoal mt-5 font-heading group-hover:text-primary transition-colors">Assign Legacy Exams</h4>
            <p className="text-xs text-steel-gray font-caption mt-2 leading-relaxed">
              Scan existing exam records and group them under structured exam terms (e.g., Term 1, Term 2) for clean consolidated results.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-primary mt-6 group-hover:translate-x-1 transition-transform">
            Open Utility Tool &rarr;
          </div>
        </Link>

        {/* Marks Entry - ACTIVE */}
        <Link
          href="/dashboard/results/marks-entry"
          className="group flex flex-col justify-between p-6 bg-white border border-light-gray/60 hover:border-primary/20 rounded-2xl hover:bg-cream/10 transition-all duration-300 shadow-sm"
        >
          <div>
            <div className="p-3 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white rounded-xl w-fit transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-charcoal mt-5 font-heading group-hover:text-primary transition-colors">Subject-wise Marks Entry</h4>
            <p className="text-xs text-steel-gray font-caption mt-2 leading-relaxed">
              Enter and update student marks for specific subjects, check pass/fail markers, and track results submission progress.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-primary mt-6 group-hover:translate-x-1 transition-transform">
            Open Marks Entry &rarr;
          </div>
        </Link>

        {/* Individual Report Cards - ACTIVE */}
        <Link
          href="/dashboard/results/report-card"
          className="group flex flex-col justify-between p-6 bg-white border border-light-gray/60 hover:border-primary/20 rounded-2xl hover:bg-cream/10 transition-all duration-300 shadow-sm"
        >
          <div>
            <div className="p-3 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white rounded-xl w-fit transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-charcoal mt-5 font-heading group-hover:text-primary transition-colors">Student Report Cards</h4>
            <p className="text-xs text-steel-gray font-caption mt-2 leading-relaxed">
              Generate and download detailed, print-ready PDF report cards including subject details, electives, percentage aggregates, rankings, and signature lines.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-primary mt-6 group-hover:translate-x-1 transition-transform">
            Generate Report Cards &rarr;
          </div>
        </Link>

        {/* Class Summary Sheets - ACTIVE */}
        <Link
          href="/dashboard/results/class-summary"
          className="group flex flex-col justify-between p-6 bg-white border border-light-gray/60 hover:border-primary/20 rounded-2xl hover:bg-cream/10 transition-all duration-300 shadow-sm"
        >
          <div>
            <div className="p-3 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white rounded-xl w-fit transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-charcoal mt-5 font-heading group-hover:text-primary transition-colors">Class Result Summary</h4>
            <p className="text-xs text-steel-gray font-caption mt-2 leading-relaxed">
              View class-wide consolidated result spreadsheets and print section summary checklists showing total marks, grades, and ranks.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-primary mt-6 group-hover:translate-x-1 transition-transform">
            View Class Summary &rarr;
          </div>
        </Link>

        {/* Lock/Unlock Management - ACTIVE */}
        <Link
          href="/dashboard/results/locks"
          className="group flex flex-col justify-between p-6 bg-white border border-light-gray/60 hover:border-primary/20 rounded-2xl hover:bg-cream/10 transition-all duration-300 shadow-sm"
        >
          <div>
            <div className="p-3 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white rounded-xl w-fit transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-charcoal mt-5 font-heading group-hover:text-primary transition-colors">Manage Exam Locks</h4>
            <p className="text-xs text-steel-gray font-caption mt-2 leading-relaxed">
              Oversight panel to lock or unlock individual subject exams in bulk. Locking prevents any further marks entries across teacher and admin portals.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-primary mt-6 group-hover:translate-x-1 transition-transform">
            Manage Exam Locks &rarr;
          </div>
        </Link>

      </div>
    </div>
  )
}
