'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StudentProfile, SubjectMarkItem, PreviousResultItem, StudentAIScoreSummary } from '@/lib/repositories/student'

interface StudentProfileTabsProps {
  profile: StudentProfile
  marks: {
    term_name: string
    is_published: boolean
    marks: SubjectMarkItem[]
  }
  results: PreviousResultItem[]
  aiSummary: StudentAIScoreSummary
  feeDetails: {
    fees: Array<{
      id: string
      fee_name: string
      amount: number
      amount_paid: number
      pending_amount: number
      due_date: string | null
      status: 'paid' | 'pending' | 'overdue'
    }>
    payments: Array<{
      id: string
      amount_paid: number
      payment_date: string
      payment_method: string | null
      notes: string | null
      fee_name: string
    }>
    totalDue: number
    totalPaid: number
    totalPending: number
  }
}

type TabName = 'personal' | 'marks' | 'results' | 'ai' | 'fees'

export default function StudentProfileTabs({
  profile,
  marks,
  results,
  aiSummary,
  feeDetails,
}: StudentProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>('personal')
  const [aiFilter, setAiFilter] = useState<'this_term' | 'this_year' | 'all_time'>('this_term')

  const tabs: { id: TabName; label: string; icon: React.ReactNode }[] = [
    {
      id: 'personal',
      label: 'Personal Info',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'marks',
      label: 'Academic Marks',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'results',
      label: 'Academic History',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'ai',
      label: 'AI Homework Insights',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      id: 'fees',
      label: 'Fees & Payments',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  // Render visual line chart using inline SVG
  const renderSVGChart = (history: typeof aiSummary.history) => {
    if (history.length === 0) {
      return (
        <div className="py-12 text-center text-steel-gray/60 text-sm font-body border border-dashed border-light-gray rounded-xl">
          No AI homework scoring logs found.
        </div>
      )
    }

    const width = 550
    const height = 240
    const paddingLeft = 45
    const paddingRight = 20
    const paddingTop = 25
    const paddingBottom = 35

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    // Generate coordinates
    const points = history.map((pt, idx) => {
      const x = paddingLeft + (idx * chartWidth) / Math.max(1, history.length - 1)
      // Map score 0-100 to chart coordinates (Y=0 is at top, so we invert)
      const y = height - paddingBottom - (pt.score * chartHeight) / 100
      return { x, y, label: pt.date, score: pt.score }
    })

    // Construct path string
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
      : ''

    // Grid lines scores (100, 75, 50, 25, 0)
    const gridScores = [100, 75, 50, 25, 0]

    return (
      <div className="w-full overflow-x-auto pt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto overflow-visible">
          <defs>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y labels */}
          {gridScores.map((score) => {
            const y = height - paddingBottom - (score * chartHeight) / 100
            return (
              <g key={score} className="opacity-45">
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
                  {score}%
                </text>
              </g>
            )
          })}

          {/* X axis labels (Dates) */}
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

          {/* Gradient area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#chart-area-grad)"
              className="transition-all duration-500 ease-in-out"
            />
          )}

          {/* Line path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500 ease-in-out"
            />
          )}

          {/* Circle markers & score text */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="var(--white)"
                stroke="var(--secondary)"
                strokeWidth="2.5"
                className="transition-all duration-200 group-hover:r-6 group-hover:stroke-primary"
              />
              <text
                x={p.x}
                y={p.y - 9}
                textAnchor="middle"
                className="fill-charcoal text-[9.5px] font-extrabold font-heading bg-white"
              >
                {Math.round(p.score)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs Header bar */}
      <div className="bg-white border border-light-gray/60 rounded-2xl p-2 shadow-sm flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold font-body transition-all cursor-pointer select-none active:scale-[0.98] ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-steel-gray hover:bg-cream/45 hover:text-charcoal'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tabs Content card */}
      <div className="bg-white border border-light-gray/60 rounded-2xl p-6 md:p-8 shadow-sm min-h-[350px]">
        {/* TAB 1: PERSONAL INFORMATION */}
        {activeTab === 'personal' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-charcoal border-b border-light-gray/40 pb-3 font-heading">
              Personal Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Full Name
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">{profile.full_name}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Admission Code
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">{profile.student_code}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Roll Number
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">{profile.roll_number}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Class & Section
                </span>
                <span className="text-sm font-semibold text-primary font-heading">
                  Class {profile.class_name} — Section {profile.section_name}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Date of Birth
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">
                  {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Gender
                </span>
                <span className="text-sm font-semibold text-charcoal font-body capitalize">{profile.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Blood Group
                </span>
                <span className="text-sm font-semibold text-danger font-body uppercase">{profile.blood_group || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Admission Date
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">
                  {profile.admission_date ? new Date(profile.admission_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-charcoal border-b border-light-gray/40 pb-3 pt-4 font-heading">
              Guardian & Contact Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Guardian Name
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">{profile.guardian_name || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Guardian Phone
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">{profile.guardian_phone || 'N/A'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="block text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">
                  Residential Address
                </span>
                <span className="text-sm font-semibold text-charcoal font-body">{profile.address || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMIC MARKS */}
        {activeTab === 'marks' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-light-gray/40 pb-3">
              <h3 className="text-lg font-bold text-charcoal font-heading">
                Subject-wise Examination Marks
              </h3>
              <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full font-caption">
                Term: {marks.term_name}
              </span>
            </div>

            {!marks.is_published ? (
              <div className="py-16 text-center border border-dashed border-light-gray rounded-2xl flex flex-col items-center justify-center space-y-3">
                <svg className="w-8 h-8 text-steel-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-sm font-semibold text-steel-gray font-body">Marks not yet published</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border border-light-gray/40 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-cream/15 border-b border-light-gray/40">
                        <th className="py-3 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Subject</th>
                        <th className="py-3 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-center">Max Marks</th>
                        <th className="py-3 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-center">Marks Obtained</th>
                        <th className="py-3 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-center">Grade</th>
                        <th className="py-3 px-4 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/30">
                      {marks.marks.map((mark) => (
                        <tr key={mark.subject_id} className="hover:bg-cream/5">
                          <td className="py-3.5 px-4 text-sm font-bold text-charcoal font-heading">{mark.subject_name}</td>
                          <td className="py-3.5 px-4 text-sm font-semibold text-steel-gray text-center font-body">{mark.max_marks}</td>
                          <td className="py-3.5 px-4 text-sm font-extrabold text-charcoal text-center font-body">
                            {mark.marks_obtained !== null ? mark.marks_obtained : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-heading ${
                              mark.grade === 'A+' || mark.grade === 'A' 
                                ? 'bg-success/10 text-success' 
                                : mark.grade === 'B' || mark.grade === 'C' 
                                  ? 'bg-amber-500/10 text-amber-600' 
                                  : 'bg-danger/10 text-danger'
                            }`}>
                              {mark.grade || '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-steel-gray font-body">{mark.remarks || 'No remarks added'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Averages summary card */}
                {marks.marks.length > 0 && (
                  <div className="p-4 bg-cream/10 border border-light-gray/40 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">Calculated Term Average</p>
                      <p className="text-[10px] text-steel-gray font-caption mt-0.5">Weighted average across all subjects</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-black text-charcoal font-heading">
                          {Math.round(
                            marks.marks.reduce((acc, m) => acc + (m.marks_obtained || 0), 0) / marks.marks.length
                          )}%
                        </p>
                        <p className="text-[10px] font-bold text-success font-caption">PASSING STATUS: PASS</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-success/10 text-success font-black flex items-center justify-center text-sm font-heading">
                        {(() => {
                          const avg = Math.round(
                            marks.marks.reduce((acc, m) => acc + (m.marks_obtained || 0), 0) / marks.marks.length
                          );
                          if (avg >= 90) return 'A+';
                          if (avg >= 80) return 'A';
                          if (avg >= 70) return 'B';
                          if (avg >= 60) return 'C';
                          return 'D';
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: ACADEMIC HISTORY */}
        {activeTab === 'results' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-charcoal border-b border-light-gray/40 pb-3 font-heading">
              Academic Enrolment History
            </h3>

            <div className="space-y-4">
              {/* Current Term Card */}
              <div
                className="flex items-center justify-between p-5 bg-white border-2 border-[#D4AF37] rounded-xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-2 h-full bg-[#D4AF37]" />
                <div className="flex items-center gap-3 pl-2">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-[#B8860B] flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l9-5-9-5-9 5 9 5zm0 0v6m0 0v6m0-6H9m3 0h3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-charcoal font-heading">Class {profile.class_name} ({marks.term_name})</p>
                    <p className="text-xs text-steel-gray font-caption mt-0.5">Current Year In-Progress Term</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-extrabold text-charcoal font-heading">
                    {marks.is_published && marks.marks.length > 0
                      ? `${Math.round(marks.marks.reduce((acc, m) => acc + (m.marks_obtained || 0), 0) / marks.marks.length)}%`
                      : 'In Progress'}
                  </p>
                  <span className="text-[10px] font-semibold text-[#B8860B] bg-amber-50 px-2 py-0.5 border border-amber-200 rounded-md font-caption mt-1 inline-block">
                    Current Term
                  </span>
                </div>
              </div>

              {results.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center justify-between p-5 bg-cream/25 border border-light-gray/40 rounded-xl hover:bg-cream/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l9-5-9-5-9 5 9 5zm0 0v6m0 0v6m0-6H9m3 0h3" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-charcoal font-heading">{res.class_name}</p>
                      <p className="text-xs text-steel-gray font-caption mt-0.5">Final Consolidated Assessment</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-charcoal font-heading">{res.percentage}</p>
                    <span className="text-[10px] font-semibold text-success bg-success/5 px-2 py-0.5 border border-success/15 rounded-md font-caption mt-1 inline-block">
                      {res.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AI HOMEWORK INSIGHTS */}
        {activeTab === 'ai' && (() => {
          const history = aiSummary.history
          let filteredHistory = [...history]
          if (aiFilter === 'this_term') {
            filteredHistory = history.slice(-4)
          } else if (aiFilter === 'this_year') {
            filteredHistory = history.slice(-9)
          }
          
          const current = filteredHistory.length > 0 ? filteredHistory[filteredHistory.length - 1].score : 0
          let trend = '+0.0%'
          let isPositive = true
          
          if (filteredHistory.length > 1) {
            const prevScore = filteredHistory[filteredHistory.length - 2].score
            const diff = current - prevScore
            isPositive = diff >= 0
            trend = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`
          } else {
            trend = '0.0%'
            isPositive = true
          }

          return (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-light-gray/40 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-charcoal font-heading">
                    AI-Assisted Homework History
                  </h3>
                  <p className="text-xs text-steel-gray font-caption mt-0.5">
                    Submissions processed and graded via automated AI pipeline
                  </p>
                </div>
                <div className="flex bg-cream/35 border border-light-gray/60 rounded-xl p-1 gap-1 w-fit">
                  {(['this_term', 'this_year', 'all_time'] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      onClick={() => setAiFilter(filterOpt)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold font-caption uppercase tracking-wider transition-all cursor-pointer ${
                        aiFilter === filterOpt
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-steel-gray hover:text-charcoal'
                      }`}
                    >
                      {filterOpt.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overall Score metrics grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-cream/15 border border-light-gray/40 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">Current AI Score</p>
                    <p className="text-2xl font-black text-charcoal mt-1.5 font-heading">
                      {Math.round(current)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>

                <div className="p-4 bg-cream/15 border border-light-gray/40 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-steel-gray uppercase tracking-wider font-caption">Term Trend</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-sm font-extrabold font-heading ${isPositive ? 'text-success' : 'text-danger'}`}>
                        {trend}
                      </span>
                      <span className="text-[10px] text-steel-gray font-caption">vs last submission</span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  }`}>
                    {isPositive ? (
                      <svg className="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Inline SVG Chart */}
              <div className="bg-cream/5 border border-light-gray/40 rounded-xl p-4 md:p-6 shadow-inner">
                <h4 className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption mb-4">
                  Performance Trajectory
                </h4>
                {renderSVGChart(filteredHistory)}
              </div>
            </div>
          )
        })()}

        {/* TAB 5: FEES & PAYMENTS */}
        {activeTab === 'fees' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-light-gray/40 pb-3">
              <div>
                <h3 className="text-lg font-bold text-charcoal font-heading">
                  Student Fee Ledger
                </h3>
                <p className="text-xs text-steel-gray font-caption mt-0.5">
                  Assigned fee structures, recorded transactions, and outstanding dues
                </p>
              </div>
              <div>
                <Link
                  href={`/dashboard/fees/record-payment?studentId=${profile.id}`}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Record Payment
                </Link>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-cream/15 border border-light-gray/40 rounded-xl">
                <span className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption block">Total Assigned Dues</span>
                <span className="text-lg font-black text-primary font-heading mt-1 block">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(feeDetails.totalDue)}
                </span>
              </div>
              <div className="p-4 bg-cream/15 border border-light-gray/40 rounded-xl">
                <span className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption block">Fees Paid</span>
                <span className="text-lg font-black text-success font-heading mt-1 block">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(feeDetails.totalPaid)}
                </span>
              </div>
              <div className="p-4 bg-cream/15 border border-light-gray/40 rounded-xl">
                <span className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption block">Outstanding Balance</span>
                <span className="text-lg font-black text-danger font-heading mt-1 block">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(feeDetails.totalPending)}
                </span>
              </div>
            </div>

            {/* Fee structures table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                Fee Structures & Dues Breakdown
              </h4>
              <div className="bg-white border border-light-gray/60 rounded-xl overflow-hidden shadow-sm">
                {feeDetails.fees.length === 0 ? (
                  <div className="py-8 text-center text-xs text-steel-gray/80 italic font-body">
                    No fee allocations set up for this student&apos;s class.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-light-gray/60 bg-cream/15 font-bold text-steel-gray">
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Fee Particular</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Total Amount</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Amount Paid</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Balance Due</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Due Date</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-light-gray/40 font-body">
                        {feeDetails.fees.map((fee) => (
                          <tr key={fee.id} className="hover:bg-cream/10 transition-colors">
                            <td className="py-3 px-4 font-semibold text-charcoal">{fee.fee_name}</td>
                            <td className="py-3 px-4 font-semibold text-charcoal">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(fee.amount)}
                            </td>
                            <td className="py-3 px-4 text-success font-medium">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(fee.amount_paid)}
                            </td>
                            <td className="py-3 px-4 text-danger font-bold">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(fee.pending_amount)}
                            </td>
                            <td className="py-3 px-4 text-steel-gray">
                              {fee.due_date
                                ? new Date(fee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              {fee.status === 'paid' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                  Paid
                                </span>
                              ) : fee.status === 'overdue' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20">
                                  Overdue
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Payments History log */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">
                Payment History
              </h4>
              <div className="bg-white border border-light-gray/60 rounded-xl overflow-hidden shadow-sm">
                {feeDetails.payments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-steel-gray/80 italic font-body">
                    No transactions logged for this student yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-light-gray/60 bg-cream/15 font-bold text-steel-gray">
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Transaction Date</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Particular</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Amount Paid</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Payment Method</th>
                          <th className="py-3 px-4 font-caption uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-light-gray/40 font-body">
                        {feeDetails.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-cream/10 transition-colors">
                            <td className="py-3 px-4 text-steel-gray">
                              {new Date(p.payment_date).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4 font-semibold text-charcoal">{p.fee_name}</td>
                            <td className="py-3 px-4 text-success font-bold">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.amount_paid)}
                            </td>
                            <td className="py-3 px-4 text-steel-gray font-caption uppercase tracking-wider">{p.payment_method || 'N/A'}</td>
                            <td className="py-3 px-4 text-steel-gray max-w-xs truncate" title={p.notes || ''}>{p.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
