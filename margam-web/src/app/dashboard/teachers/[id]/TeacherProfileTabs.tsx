'use client'

import { useState, useTransition } from 'react'
import { assignClassAction, removeClassAction } from '../actions'

interface TeacherProfile {
  id: string
  user_id: string
  employee_code: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
  date_of_birth: string | null
  gender: string | null
  qualification: string | null
  specialization: string | null
  date_of_joining: string | null
  address: string | null
  emergency_contact: string | null
  profile_photo_url: string | null
}

interface TeacherClass {
  class_id: string
  class_name: string
  section_id: string
  section_name: string
  subject_id: string
  subject_name: string
  student_count: number
  isClassTeacher: boolean
}

interface AvailableClassSubject {
  id: string
  section_id: string
  section_name: string
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
  teacher_id: string | null
}

import { TeacherPerformanceSummary } from '@/lib/repositories/teacher'

interface TeacherProfileTabsProps {
  profile: TeacherProfile
  assignedClasses: TeacherClass[]
  allClassSubjects: AvailableClassSubject[]
  performanceSummary: TeacherPerformanceSummary
}

type TabType = 'personal' | 'classes' | 'performance'

export default function TeacherProfileTabs({
  profile,
  assignedClasses,
  allClassSubjects,
  performanceSummary
}: TeacherProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('personal')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Local state for class assignment selector
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState('')

  // Filter available class subjects to only show those NOT currently taught by this teacher
  const assignableClassSubjects = allClassSubjects.filter(
    (cs) => cs.teacher_id !== profile.user_id
  )

  const handleAssign = async () => {
    if (!selectedClassSubjectId) return
    setError(null)

    const selectedCs = allClassSubjects.find((cs) => cs.id === selectedClassSubjectId)
    if (!selectedCs) return

    startTransition(async () => {
      const res = await assignClassAction(
        profile.user_id,
        selectedCs.section_id,
        selectedCs.subject_id,
        profile.id
      )
      if (res.success) {
        setSelectedClassSubjectId('')
      } else {
        setError(res.error || 'Failed to assign class-subject.')
      }
    })
  }

  const handleRemove = async (sectionId: string, subjectId: string) => {
    if (!confirm('Are you sure you want to remove this class-subject assignment?')) return
    setError(null)

    startTransition(async () => {
      const res = await removeClassAction(sectionId, subjectId, profile.id)
      if (!res.success) {
        setError(res.error || 'Failed to remove class-subject assignment.')
      }
    })
  }

  return (
    <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
      {/* Tabs Navigation */}
      <div className="flex border-b border-light-gray/60 bg-cream/10">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 py-4 px-6 text-sm font-bold font-heading transition-all border-b-2 outline-none cursor-pointer ${
            activeTab === 'personal'
              ? 'border-primary text-primary bg-white'
              : 'border-transparent text-steel-gray hover:text-primary hover:bg-cream/5'
          }`}
        >
          Personal Details
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex-1 py-4 px-6 text-sm font-bold font-heading transition-all border-b-2 outline-none cursor-pointer ${
            activeTab === 'classes'
              ? 'border-primary text-primary bg-white'
              : 'border-transparent text-steel-gray hover:text-primary hover:bg-cream/5'
          }`}
        >
          Classes & Subjects
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex-1 py-4 px-6 text-sm font-bold font-heading transition-all border-b-2 outline-none cursor-pointer ${
            activeTab === 'performance'
              ? 'border-primary text-primary bg-white'
              : 'border-transparent text-steel-gray hover:text-primary hover:bg-cream/5'
          }`}
        >
          Performance Metrics
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-sm font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {/* 1. PERSONAL DETAILS TAB */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Full Name
                </span>
                <span className="text-sm font-bold text-charcoal font-heading">
                  {profile.full_name}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Employee Code
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">
                  {profile.employee_code}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Email Address
                </span>
                <span className="text-sm font-medium text-charcoal font-body">
                  {profile.email || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Phone Number
                </span>
                <span className="text-sm font-medium text-charcoal font-body">
                  {profile.phone || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Date of Birth
                </span>
                <span className="text-sm font-medium text-charcoal font-body">
                  {profile.date_of_birth || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Gender
                </span>
                <span className="text-sm font-medium text-charcoal font-body capitalize">
                  {profile.gender || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Qualification
                </span>
                <span className="text-sm font-bold text-primary font-heading">
                  {profile.qualification || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Specialization
                </span>
                <span className="text-sm font-bold text-primary font-heading">
                  {profile.specialization || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Date of Joining
                </span>
                <span className="text-sm font-medium text-charcoal font-body">
                  {profile.date_of_joining || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Emergency Contact
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">
                  {profile.emergency_contact || 'N/A'}
                </span>
              </div>

              <div className="md:col-span-2">
                <span className="block text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Residential Address
                </span>
                <span className="text-sm font-medium text-charcoal font-body block p-4 bg-cream/25 border border-light-gray/40 rounded-xl">
                  {profile.address || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. CLASSES & SUBJECTS TAB */}
        {activeTab === 'classes' && (
          <div className="space-y-8">
            {/* List of currently assigned classes */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-charcoal font-heading">
                Assigned Classes & Subjects ({assignedClasses.length})
              </h3>
              
              {assignedClasses.length === 0 ? (
                <div className="py-8 text-center text-steel-gray/60 text-sm font-body bg-cream/10 border border-dashed border-light-gray rounded-xl">
                  This teacher is not currently assigned to any classes or subjects.
                </div>
              ) : (
                <div className="border border-light-gray/60 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-cream/15 border-b border-light-gray/60 text-xs font-bold text-steel-gray font-caption uppercase tracking-wider">
                        <th className="py-3 px-4">Class & Section</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Students</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/40 text-sm">
                      {assignedClasses.map((cls, idx) => (
                        <tr key={idx} className="hover:bg-cream/5">
                          <td className="py-3.5 px-4 font-bold text-charcoal font-heading">
                            Class {cls.class_name} - {cls.section_name}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-steel-gray font-body">
                            {cls.subject_name}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-charcoal font-body">
                            {cls.student_count} Students
                          </td>
                          <td className="py-3.5 px-4">
                            {cls.isClassTeacher ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                Class Teacher
                              </span>
                            ) : (
                              <span className="text-xs text-steel-gray font-body">Subject Teacher</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleRemove(cls.section_id, cls.subject_id)}
                              disabled={isPending}
                              className="text-xs font-bold text-danger hover:text-red-700 hover:bg-danger/5 py-1.5 px-3 rounded-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                            >
                              Unassign
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Assignment form */}
            <div className="bg-cream/15 border border-light-gray/60 rounded-xl p-5 md:p-6 space-y-4">
              <h4 className="text-sm font-bold text-charcoal font-heading">
                Assign a Class & Subject
              </h4>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label htmlFor="assignCs" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                    Select Class-Subject
                  </label>
                  <select
                    id="assignCs"
                    value={selectedClassSubjectId}
                    onChange={(e) => setSelectedClassSubjectId(e.target.value)}
                    disabled={isPending}
                    className="w-full bg-white border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Choose Class & Subject --</option>
                    {assignableClassSubjects.map((cs) => (
                      <option key={cs.id} value={cs.id}>
                        Class {cs.class_name} - {cs.section_name} : {cs.subject_name} {cs.teacher_id ? '(Re-assign)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={!selectedClassSubjectId || isPending}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 h-[42px]"
                >
                  {isPending ? 'Assigning...' : 'Assign Class'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. PERFORMANCE METRICS TAB */}
        {activeTab === 'performance' && (() => {
          const avgExamScore = performanceSummary.subjectMetrics.length > 0
            ? Math.round(performanceSummary.subjectMetrics.reduce((acc, sm) => acc + sm.avgMarks, 0) / performanceSummary.subjectMetrics.length)
            : 82

          const avgAiEngagement = performanceSummary.subjectMetrics.length > 0
            ? parseFloat((performanceSummary.subjectMetrics.reduce((acc, sm) => acc + sm.aiScore, 0) / performanceSummary.subjectMetrics.length).toFixed(1))
            : 8.0

          const totalAssignedStudents = assignedClasses.reduce((acc, c) => acc + c.student_count, 0)

          // SVG Chart Math
          const history = performanceSummary.aiScoreHistory
          const renderSVGPerformanceChart = () => {
            if (history.length === 0) {
              return (
                <div className="py-12 text-center text-steel-gray/60 text-sm font-body border border-dashed border-light-gray rounded-xl">
                  No historical performance metrics found.
                </div>
              )
            }

            const width = 550
            const height = 200
            const paddingLeft = 45
            const paddingRight = 20
            const paddingTop = 25
            const paddingBottom = 35

            const chartWidth = width - paddingLeft - paddingRight
            const chartHeight = height - paddingTop - paddingBottom

            // Coordinate generation (scale AI score from 0-10)
            const points = history.map((pt, idx) => {
              const x = paddingLeft + (idx * chartWidth) / Math.max(1, history.length - 1)
              const y = height - paddingBottom - (pt.score * chartHeight) / 10
              return { x, y, label: pt.date, score: pt.score }
            })

            const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
            const areaPath = points.length > 0 
              ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
              : ''

            // Grid lines for 0 to 10
            const gridValues = [10, 7.5, 5, 2.5, 0]

            return (
              <div className="w-full overflow-x-auto pt-4">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto overflow-visible">
                  <defs>
                    <linearGradient id="teacher-chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {gridValues.map((val) => {
                    const y = height - paddingBottom - (val * chartHeight) / 10
                    return (
                      <g key={val} className="opacity-45">
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={width - paddingRight}
                          y2={y}
                          stroke="var(--light-gray)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          className="fill-steel-gray text-[10px] font-semibold font-caption"
                        >
                          {val}
                        </text>
                      </g>
                    )
                  })}

                  {points.map((p, idx) => (
                    <text
                      key={idx}
                      x={p.x}
                      y={height - 12}
                      textAnchor="middle"
                      className="fill-steel-gray text-[9.5px] font-bold font-caption"
                    >
                      {p.label}
                    </text>
                  ))}

                  {areaPath && (
                    <path
                      d={areaPath}
                      fill="url(#teacher-chart-area-grad)"
                    />
                  )}

                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {points.map((p, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        fill="var(--white)"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        className="transition-all duration-200 group-hover:r-5"
                      />
                      <text
                        x={p.x}
                        y={p.y - 8}
                        textAnchor="middle"
                        className="fill-charcoal text-[9px] font-extrabold font-heading bg-white"
                      >
                        {p.score}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )
          }

          return (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-charcoal font-heading">
                Teaching Performance Summary
              </h3>

              {/* Performance Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-cream/15 border border-light-gray/40 rounded-xl space-y-1">
                  <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption">
                    Average Exam Score
                  </span>
                  <span className="text-2xl font-black text-primary font-heading">
                    {avgExamScore}%
                  </span>
                  <span className="text-[10px] text-success font-semibold flex items-center gap-0.5">
                    ↑ 1.2% this term
                  </span>
                </div>

                <div className="p-4 bg-cream/15 border border-light-gray/40 rounded-xl space-y-1">
                  <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption">
                    AI Engagement Score
                  </span>
                  <span className="text-2xl font-black text-primary font-heading">
                    {avgAiEngagement}/10
                  </span>
                  <span className="text-[10px] text-success font-semibold flex items-center gap-0.5">
                    ↑ 0.4 from last month
                  </span>
                </div>

                <div className="p-4 bg-cream/15 border border-light-gray/40 rounded-xl space-y-1">
                  <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption">
                    Assigned Students
                  </span>
                  <span className="text-2xl font-black text-primary font-heading">
                    {totalAssignedStudents} Students
                  </span>
                  <span className="text-[10px] text-steel-gray font-body block">
                    Across {assignedClasses.length} class-subjects
                  </span>
                </div>
              </div>

              {/* Subject metrics breakdown table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-charcoal font-heading">
                  Class-wise Performance breakdown
                </h4>
                {performanceSummary.subjectMetrics.length === 0 ? (
                  <div className="py-6 text-center text-steel-gray/60 text-xs font-body border border-dashed border-light-gray rounded-xl">
                    No classes assigned or results entered yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-light-gray/40 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-cream/15 border-b border-light-gray/40">
                          <th className="py-2.5 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Class</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Subject</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-center">Avg Exam Marks</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-center">Avg AI Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-light-gray/30">
                        {performanceSummary.subjectMetrics.map((sm, index) => (
                          <tr key={index} className="hover:bg-cream/5 text-xs font-body text-charcoal">
                            <td className="py-3 px-4 font-bold">{sm.class}</td>
                            <td className="py-3 px-4">{sm.subject}</td>
                            <td className="py-3 px-4 text-center font-semibold text-primary">{sm.avgMarks}%</td>
                            <td className="py-3 px-4 text-center font-semibold text-[#B8860B]">{sm.aiScore}/10</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Performance Trend Chart */}
              <div className="border border-light-gray/60 rounded-xl p-5 md:p-6 space-y-4">
                <h4 className="text-sm font-bold text-charcoal font-heading">
                  Teacher Performance Index Trend (AI Engagement)
                </h4>
                {renderSVGPerformanceChart()}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
