import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getClasses, getAllSectionsForInstitution } from '@/lib/repositories/academic'
import { getStudentsList } from '@/lib/repositories/student'
import StudentFilterBar from './StudentFilterBar'

export default async function StudentsPage({
  searchParams
}: {
  searchParams: Promise<{
    search?: string
    classId?: string
    sectionId?: string
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
  const classId = resolvedParams.classId || ''
  const sectionId = resolvedParams.sectionId || ''
  const status = resolvedParams.status || 'all'

  // Fetch filters data and list of students
  const [classes, allSections, students] = await Promise.all([
    getClasses(supabase, institutionId),
    getAllSectionsForInstitution(supabase, institutionId),
    getStudentsList(supabase, institutionId, { search, classId, sectionId, status })
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
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Students Directory</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Manage student records, view academic profiles, and track enrolment details.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 border border-light-gray/50 rounded-xl shadow-sm h-fit">
          <span className="text-xs font-semibold text-steel-gray font-caption uppercase tracking-wider">Total Enrolled</span>
          <span className="text-xl font-bold text-primary font-heading">{students.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <StudentFilterBar classes={classes} allSections={allSections} />

      {/* Directory Table */}
      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-md mx-auto space-y-3">
            <div className="p-3 bg-cream/30 text-steel-gray rounded-full w-fit mx-auto border border-light-gray/40">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-charcoal font-heading">No Students Found</h3>
            <p className="text-xs text-steel-gray/80 px-4">
              We couldn&apos;t find any students matching your current search or filter criteria. Try adjusting the filters or clearing search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-light-gray/60 bg-cream/15">
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Student Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Admission Code</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Roll No</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Class & Section</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray/40">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-cream/10 transition-colors">
                    {/* Student name and photo */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {student.profile_photo_url ? (
                          <img
                            src={student.profile_photo_url}
                            alt={student.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-light-gray/60 shadow-sm"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--white)' }}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-heading shadow-sm"
                          >
                            {getInitials(student.full_name)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-charcoal leading-tight font-heading">{student.full_name}</p>
                          <p className="text-xs text-steel-gray font-caption mt-0.5">{student.email || 'No email registered'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Admission Code */}
                    <td className="py-4 px-6 text-sm font-semibold text-charcoal font-body">
                      {student.student_code}
                    </td>

                    {/* Roll No */}
                    <td className="py-4 px-6 text-sm font-medium text-steel-gray font-body">
                      {student.roll_number}
                    </td>

                    {/* Class & Section */}
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-primary font-heading">
                        Class {student.class_name}
                      </span>
                      <span className="text-xs text-steel-gray font-caption ml-1.5 px-2 py-0.5 bg-cream/40 border border-light-gray/40 rounded-md">
                        Sec {student.section_name}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6">
                      {student.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                          Active
                        </span>
                      ) : student.status === 'suspended' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions link */}
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold text-secondary hover:text-white bg-secondary/10 hover:bg-secondary border border-secondary/25 hover:border-secondary rounded-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
                      >
                        View Profile
                      </Link>
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
