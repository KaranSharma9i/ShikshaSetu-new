import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeachersList, getInstitutionSubjects } from '@/lib/repositories/teacher'
import TeacherFilterBar from './TeacherFilterBar'

export default async function TeachersPage({
  searchParams
}: {
  searchParams: Promise<{
    search?: string
    subject?: string
    status?: string
  }>
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

  // Await searchParams
  const resolvedParams = await searchParams
  const search = resolvedParams.search || ''
  const subject = resolvedParams.subject || 'all'
  const status = resolvedParams.status || 'all'

  // Fetch subjects and list of teachers
  const [subjects, teachers] = await Promise.all([
    getInstitutionSubjects(supabase, institutionId),
    getTeachersList(supabase, institutionId, { search, subject, status })
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
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Teachers Directory</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Manage teacher profiles, assign classes and subjects, and monitor teaching performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/teachers/new"
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs md:text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Teacher
          </Link>
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 border border-light-gray/50 rounded-xl shadow-sm h-full">
            <span className="text-xs font-semibold text-steel-gray font-caption uppercase tracking-wider">Total Staff</span>
            <span className="text-xl font-bold text-primary font-heading">{teachers.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <TeacherFilterBar subjects={subjects} />

      {/* Directory Table */}
      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
        {teachers.length === 0 ? (
          <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-md mx-auto space-y-3">
            <div className="p-3 bg-cream/30 text-steel-gray rounded-full w-fit mx-auto border border-light-gray/40">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-charcoal font-heading">No Teachers Found</h3>
            <p className="text-xs text-steel-gray/80 px-4">
              We couldn&apos;t find any teachers matching your current search or filter criteria. Try adjusting the filters or clearing search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-light-gray/60 bg-cream/15">
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Teacher Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Employee Code</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Specialization</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Assigned Classes</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Performance</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray/40">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-cream/10 transition-colors">
                    {/* Teacher name and photo */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {teacher.profile_photo_url ? (
                          <img
                            src={teacher.profile_photo_url}
                            alt={teacher.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-light-gray/60 shadow-sm"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--white)' }}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-heading shadow-sm"
                          >
                            {getInitials(teacher.full_name)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-charcoal leading-tight font-heading">{teacher.full_name}</p>
                          <p className="text-xs text-steel-gray font-caption mt-0.5">{teacher.email || 'No email registered'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Employee Code */}
                    <td className="py-4 px-6 text-sm font-semibold text-charcoal font-body">
                      {teacher.employee_code}
                    </td>

                    {/* Specialization */}
                    <td className="py-4 px-6 text-sm font-medium text-steel-gray font-body">
                      {teacher.specialization}
                    </td>

                    {/* Assigned Classes */}
                    <td className="py-4 px-6">
                      {teacher.assigned_classes.length === 0 ? (
                        <span className="text-xs text-steel-gray/60 italic font-body">None assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {teacher.assigned_classes.map((clsName) => (
                            <span
                              key={clsName}
                              className="text-[10px] font-bold text-primary bg-cream border border-light-gray/60 rounded px-1.5 py-0.5 font-caption"
                            >
                              {clsName}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Performance */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-charcoal font-heading">
                          {teacher.performanceScore}%
                        </span>
                        <div className="w-16 bg-light-gray rounded-full h-1.5 overflow-hidden">
                          <div
                            style={{ width: `${teacher.performanceScore}%` }}
                            className={`h-full rounded-full ${
                              teacher.performanceScore >= 90
                                ? 'bg-success'
                                : teacher.performanceScore >= 80
                                ? 'bg-secondary'
                                : 'bg-danger'
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6">
                      {teacher.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions link */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/teachers/${teacher.id}`}
                          className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold text-secondary hover:text-white bg-secondary/10 hover:bg-secondary border border-secondary/25 hover:border-secondary rounded-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
                        >
                          View Profile
                        </Link>
                        <Link
                          href={`/dashboard/teachers/${teacher.id}/edit`}
                          className="p-1.5 text-steel-gray hover:text-primary hover:bg-light-gray/40 border border-transparent hover:border-light-gray/60 rounded-xl transition-all active:scale-95"
                          title="Edit Profile"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-2.036a5 5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
