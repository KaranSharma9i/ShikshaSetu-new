'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { getFilteredFeeDataAction } from './actions'
import { PaymentListItem, DefaulterListItem } from '@/lib/repositories/fees'

interface FeeDashboardClientProps {
  institutionId: string
  initialSummary: {
    totalTarget: number
    totalCollected: number
    totalPending: number
    completionPercent: number
    classBreakdown: Array<{
      classId: string
      className: string
      target: number
      collected: number
      pending: number
      percent: number
    }>
  }
  initialRecentPayments: PaymentListItem[]
  initialDefaulters: DefaulterListItem[]
  classes: Array<{ id: string; name: string }>
  academicYears: Array<{ id: string; label: string; is_current: boolean }>
  currentYearId: string
}

export default function FeeDashboardClient({
  institutionId,
  initialSummary,
  initialRecentPayments,
  initialDefaulters,
  classes,
  academicYears,
  currentYearId,
}: FeeDashboardClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [selectedYearId, setSelectedYearId] = useState<string>(currentYearId)
  const [activeTab, setActiveTab] = useState<'overview' | 'defaulters' | 'transactions'>('overview')
  const [defaulterSearch, setDefaulterSearch] = useState<string>('')
  const [paymentSearch, setPaymentSearch] = useState<string>('')

  // State to hold active filter values
  const [summary, setSummary] = useState(initialSummary)
  const [defaulters, setDefaulters] = useState(initialDefaulters)
  const [isPending, startTransition] = useTransition()

  const handleFilterChange = async (classId: string, yearId: string) => {
    setSelectedClassId(classId)
    setSelectedYearId(yearId)

    startTransition(async () => {
      const res = await getFilteredFeeDataAction(institutionId, yearId, classId)
      if (res.success && res.data) {
        setSummary(res.data.summary)
        setDefaulters(res.data.defaulters)
      } else {
        console.error('Failed to apply filters:', res.error)
      }
    })
  }

  // Format currency helpers (INR format)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Filter lists on client based on search query
  const filteredDefaulters = defaulters.filter((d) => {
    const searchLower = defaulterSearch.toLowerCase()
    return (
      d.studentName.toLowerCase().includes(searchLower) ||
      d.studentCode.toLowerCase().includes(searchLower) ||
      d.className.toLowerCase().includes(searchLower)
    )
  })

  const filteredPayments = initialRecentPayments.filter((p) => {
    const searchLower = paymentSearch.toLowerCase()
    return (
      p.student_name.toLowerCase().includes(searchLower) ||
      p.student_code.toLowerCase().includes(searchLower) ||
      p.fee_name.toLowerCase().includes(searchLower)
    )
  })

  // SVG circular completion progress calculation
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, summary.completionPercent) / 100) * circumference

  return (
    <div className="space-y-6 font-body">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Fee Collections</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Monitor targets, track logs, and record pending tuition payments.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/fees/record-payment"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Record a Payment
          </Link>
        </div>
      </div>

      {/* Filter and Loading Bar */}
      <div className="bg-white border border-light-gray/60 rounded-2xl p-4 md:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Academic Year select */}
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <span className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption">Academic Year</span>
            <select
              value={selectedYearId}
              onChange={(e) => handleFilterChange(selectedClassId, e.target.value)}
              className="bg-cream/20 border border-light-gray rounded-xl px-3 py-2 text-xs font-semibold text-charcoal outline-none focus:border-secondary transition-colors"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  Session {ay.label} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Class select */}
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <span className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption">Filter Class</span>
            <select
              value={selectedClassId}
              onChange={(e) => handleFilterChange(e.target.value, selectedYearId)}
              className="bg-cream/20 border border-light-gray rounded-xl px-3 py-2 text-xs font-semibold text-charcoal outline-none focus:border-secondary transition-colors"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Class {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary animate-pulse">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Updating statistics...
          </div>
        )}
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Target Card */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">Target Dues</p>
              <h3 className="text-2xl font-black text-primary font-heading leading-tight">{formatCurrency(summary.totalTarget)}</h3>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-xs text-steel-gray font-caption">Total expected fee receipts</div>
        </div>

        {/* Total Collected Card */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">Fees Collected</p>
              <h3 className="text-2xl font-black text-success font-heading leading-tight">{formatCurrency(summary.totalCollected)}</h3>
            </div>
            <div className="p-2.5 bg-success/10 text-success rounded-xl border border-success/5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-xs text-steel-gray font-caption">Actual payments recorded</div>
        </div>

        {/* Outstanding Dues Card */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">Outstanding Balance</p>
              <h3 className="text-2xl font-black text-danger font-heading leading-tight">{formatCurrency(summary.totalPending)}</h3>
            </div>
            <div className="p-2.5 bg-danger/10 text-danger rounded-xl border border-danger/5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-xs text-steel-gray font-caption">Pending dues remaining</div>
        </div>

        {/* Completion Percent Card */}
        <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-1">Collection Progress</p>
              <h3 className="text-2xl font-black text-secondary font-heading leading-tight">{summary.completionPercent.toFixed(1)}%</h3>
            </div>
            <div className="p-2.5 bg-secondary/10 text-secondary rounded-xl border border-secondary/5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 w-full bg-light-gray rounded-full h-1.5 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, summary.completionPercent)}%` }}
              className="bg-secondary h-1.5 rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-light-gray/60">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-6 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-primary text-primary font-heading'
              : 'border-transparent text-steel-gray hover:text-charcoal'
          }`}
        >
          Overview & Charts
        </button>
        <button
          onClick={() => setActiveTab('defaulters')}
          className={`pb-4 px-6 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'defaulters'
              ? 'border-primary text-primary font-heading'
              : 'border-transparent text-steel-gray hover:text-charcoal'
          }`}
        >
          Defaulters List
          {defaulters.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-danger/10 text-danger border border-danger/25 rounded-md">
              {defaulters.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-4 px-6 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-primary text-primary font-heading'
              : 'border-transparent text-steel-gray hover:text-charcoal'
          }`}
        >
          Recent Transactions
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: Overall Circular KPI chart */}
            <div className="lg:col-span-1 bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <h3 className="text-base font-bold text-charcoal font-heading w-full text-left border-b border-light-gray/40 pb-3">
                Overall Collection Summary
              </h3>
              
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 150 150">
                  <circle
                    className="text-light-gray/45"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="75"
                    cy="75"
                  />
                  <circle
                    className="text-secondary"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="75"
                    cy="75"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="block text-2xl font-black text-charcoal font-heading leading-none">
                    {summary.completionPercent.toFixed(1)}%
                  </span>
                  <span className="text-[9px] font-bold text-steel-gray font-caption uppercase tracking-widest mt-1 block">
                    Collected
                  </span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 text-left pt-2">
                <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
                  <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                    Target
                  </span>
                  <span className="text-sm font-bold text-primary font-heading">
                    {formatCurrency(summary.totalTarget)}
                  </span>
                </div>
                <div className="p-3 bg-cream/15 border border-light-gray/40 rounded-xl">
                  <span className="block text-[9px] font-bold text-steel-gray uppercase tracking-wider font-caption mb-0.5">
                    Collected
                  </span>
                  <span className="text-sm font-bold text-success font-heading">
                    {formatCurrency(summary.totalCollected)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Class Breakdown Table/Charts */}
            <div className="lg:col-span-2 bg-white border border-light-gray/60 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-charcoal font-heading border-b border-light-gray/40 pb-3">
                Fee Collection by Class
              </h3>

              {summary.classBreakdown.length === 0 ? (
                <div className="py-12 text-center text-steel-gray/60 text-sm font-body">
                  No class fee allocations found for this session.
                </div>
              ) : (
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {summary.classBreakdown.map((item) => (
                    <div key={item.classId} className="space-y-1.5 p-3 rounded-xl hover:bg-cream/10 border border-transparent hover:border-light-gray/35 transition-colors">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-charcoal font-heading">Class {item.className}</span>
                        <span className="text-xs text-steel-gray font-caption">
                          {formatCurrency(item.collected)} /{' '}
                          <span className="font-semibold text-charcoal">{formatCurrency(item.target)}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-light-gray rounded-full h-2 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, item.percent)}%` }}
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                          />
                        </div>
                        <span className="text-xs font-bold text-primary w-10 text-right font-heading">
                          {item.percent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Defaulters tab */}
        {activeTab === 'defaulters' && (
          <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
            {/* Search Filter bar */}
            <div className="p-4 md:p-5 border-b border-light-gray/40 bg-cream/15 flex items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-steel-gray">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search student code, name or class..."
                  value={defaulterSearch}
                  onChange={(e) => setDefaulterSearch(e.target.value)}
                  className="w-full bg-white border border-light-gray rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-charcoal placeholder-steel-gray/60 outline-none focus:border-secondary transition-colors"
                />
              </div>
              <div className="text-xs font-bold text-steel-gray font-caption">
                Found {filteredDefaulters.length} Defaulters
              </div>
            </div>

            {filteredDefaulters.length === 0 ? (
              <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-md mx-auto space-y-3">
                <div className="p-3 bg-cream/30 text-steel-gray rounded-full w-fit mx-auto border border-light-gray/40">
                  <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-charcoal font-heading">No Defaulters</h3>
                <p className="text-xs text-steel-gray/80 px-4">
                  All students have paid their dues in full for the selected criteria, or no search matches were found!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-light-gray/60 bg-cream/15 text-[11px] font-bold text-steel-gray uppercase tracking-wider font-caption">
                      <th className="py-4 px-6">Student Name</th>
                      <th className="py-4 px-6">Class & Section</th>
                      <th className="py-4 px-6">Pending Dues</th>
                      <th className="py-4 px-6">Earliest Due Date</th>
                      <th className="py-4 px-6">Dues Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray/40">
                    {filteredDefaulters.map((item) => (
                      <tr key={item.studentId} className="hover:bg-cream/10 transition-colors text-sm">
                        <td className="py-4 px-6">
                          <div>
                            <span className="font-bold text-charcoal font-heading block">{item.studentName}</span>
                            <span className="text-xs text-steel-gray font-caption mt-0.5">Code: {item.studentCode}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-primary font-heading">Class {item.className}</span>
                          <span className="text-xs text-steel-gray font-caption ml-1.5 px-2 py-0.5 bg-cream/40 border border-light-gray/40 rounded-md">
                            Sec {item.sectionName}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-danger font-body">
                          {formatCurrency(item.pendingAmount)}
                        </td>
                        <td className="py-4 px-6 text-steel-gray font-body text-xs">
                          {item.nextDueDate ? formatDate(item.nextDueDate) : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          {item.status === 'overdue' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/students/${item.studentId}`}
                              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-primary bg-white hover:bg-cream/20 border border-light-gray rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              Profile
                            </Link>
                            <Link
                              href={`/dashboard/fees/record-payment?studentId=${item.studentId}`}
                              className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold text-secondary hover:text-white bg-secondary/10 hover:bg-secondary border border-secondary/25 hover:border-secondary rounded-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
                            >
                              Collect Fee
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
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
            {/* Search Filter bar */}
            <div className="p-4 md:p-5 border-b border-light-gray/40 bg-cream/15 flex items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-steel-gray">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search student or fee type..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full bg-white border border-light-gray rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-charcoal placeholder-steel-gray/60 outline-none focus:border-secondary transition-colors"
                />
              </div>
              <div className="text-xs font-bold text-steel-gray font-caption">
                Recent 10 Payments Listed
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-md mx-auto space-y-3">
                <div className="p-3 bg-cream/30 text-steel-gray rounded-full w-fit mx-auto border border-light-gray/40">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-charcoal font-heading">No Transactions</h3>
                <p className="text-xs text-steel-gray/80 px-4">
                  No payments have been recorded yet, or no matches found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-light-gray/60 bg-cream/15 text-[11px] font-bold text-steel-gray uppercase tracking-wider font-caption">
                      <th className="py-4 px-6">Student Name</th>
                      <th className="py-4 px-6">Fee Type</th>
                      <th className="py-4 px-6">Class</th>
                      <th className="py-4 px-6">Amount Paid</th>
                      <th className="py-4 px-6">Method</th>
                      <th className="py-4 px-6">Payment Date</th>
                      <th className="py-4 px-6">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray/40">
                    {filteredPayments.map((item) => (
                      <tr key={item.id} className="hover:bg-cream/10 transition-colors text-sm">
                        <td className="py-4 px-6">
                          <div>
                            <span className="font-bold text-charcoal font-heading block">{item.student_name}</span>
                            <span className="text-xs text-steel-gray font-caption mt-0.5">Code: {item.student_code}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-semibold text-charcoal font-body">
                          {item.fee_name}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-primary font-heading">Class {item.class_name}</span>
                          <span className="text-xs text-steel-gray font-caption ml-1 px-1 bg-cream/40 border border-light-gray/40 rounded-md">
                            {item.section_name}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-success font-body">
                          {formatCurrency(item.amount_paid)}
                        </td>
                        <td className="py-4 px-6 font-medium text-steel-gray font-caption text-xs">
                          {item.payment_method || 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-steel-gray font-body text-xs">
                          {formatDate(item.payment_date)}
                        </td>
                        <td className="py-4 px-6 text-xs text-steel-gray font-body max-w-xs truncate" title={item.notes || ''}>
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
