'use client'

import { useEffect, useState } from 'react'

interface TimetableEntry {
  id: string
  section_id: string
  class_subject_id: string
  day: string
  period_number: number
  starts_at: string
  ends_at: string
  room: string | null
  academic_year_id: string
  subject_name: string
  subject_code: string
  teacher_name: string
  teacher_id: string | null
}

interface PrintTimetableClientProps {
  timetable: TimetableEntry[]
  className: string
  academicYearLabel: string
  institution: {
    name: string
    logo_url: string | null
    address: string | null
  } | null
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
]

const PERIODS = Array.from({ length: 12 }, (_, i) => i + 1)

function cleanTimeStr(timeStr: string | undefined | null): string {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

export default function PrintTimetableClient({
  timetable,
  className,
  academicYearLabel,
  institution
}: PrintTimetableClientProps) {
  const [imgError, setImgError] = useState(false)

  // Automatically trigger print on load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const getEntryForSlot = (dayKey: string, periodNum: number) => {
    return timetable.find(entry => entry.day === dayKey && entry.period_number === periodNum)
  }

  return (
    <div className="bg-white min-h-screen p-4 md:p-6 font-body text-charcoal">
      {/* Landscape Print Styles Injection */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header, aside, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          div {
            background-color: transparent !important;
            box-shadow: none !important;
          }
          #print-timetable-sheet {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
          }
        }
      `}</style>

      {/* Top Action Control Panel (Hidden during print) */}
      <div className="no-print mb-6 p-4 bg-cream/30 border border-light-gray/60 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-steel-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-steel-gray font-caption">
            Print Preview Mode. If the print dialog did not open automatically, click the button to trigger printing.
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.close()}
            className="px-4 py-2 text-xs font-bold text-steel-gray bg-white border border-light-gray hover:bg-cream/20 rounded-xl transition-all active:scale-[0.98]"
          >
            Close Tab
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-bold text-primary bg-secondary hover:bg-secondary-light rounded-xl shadow-sm transition-all active:scale-[0.98]"
          >
            Print Timetable
          </button>
        </div>
      </div>

      {/* Main Printable Document Sheet */}
      <div id="print-timetable-sheet" className="max-w-[1100px] mx-auto border border-light-gray/50 p-5 rounded-2xl print:border-0 print:p-0">
        
        {/* Institution Letterhead Header */}
        <div className="flex items-center justify-between border-b border-primary/25 pb-3 mb-4">
          <div className="flex items-center gap-3">
            {institution?.logo_url && !imgError ? (
              <img
                src={institution.logo_url}
                alt="Logo"
                onError={() => setImgError(true)}
                className="w-11 h-11 object-contain rounded-xl bg-cream/10 p-1 border border-light-gray/20"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-primary text-secondary font-bold flex items-center justify-center text-sm font-heading">
                {institution?.name ? institution.name.substring(0, 2).toUpperCase() : 'MG'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-primary font-heading tracking-tight">
                {institution?.name || 'Margam Institution'}
              </h1>
              {institution?.address && (
                <p className="text-[11px] text-steel-gray font-caption mt-0.5">{institution.address}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-bold text-primary font-heading uppercase tracking-wide">
              Weekly Timetable
            </span>
            <p className="text-[11px] text-steel-gray font-caption mt-1">Academic Year: {academicYearLabel}</p>
          </div>
        </div>

        {/* Section Heading Metadata */}
        <div className="flex justify-between items-center mb-4 bg-cream/10 border border-light-gray/30 p-2.5 rounded-xl">
          <div>
            <span className="text-[9px] font-bold text-steel-gray uppercase font-caption tracking-wider">Class & Section</span>
            <h2 className="text-base font-bold text-charcoal font-heading leading-tight">{className}</h2>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-steel-gray uppercase font-caption tracking-wider">Generated On</span>
            <p className="text-[11px] font-semibold text-charcoal font-body">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* The Grid Table */}
        <div className="w-full overflow-hidden border border-light-gray rounded-xl">
          <table className="w-full border-collapse text-left text-[10px] leading-tight">
            <thead>
              <tr className="bg-cream/10 border-b border-light-gray">
                <th className="p-2.5 font-extrabold text-[11px] uppercase text-primary font-heading border-r border-light-gray w-[100px] bg-cream/5">Day</th>
                {PERIODS.map(p => (
                  <th key={p} className="p-1.5 text-center font-extrabold text-[9px] uppercase text-primary font-heading border-r border-light-gray bg-cream/5">
                    P{p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-light-gray">
              {DAYS_OF_WEEK.map(day => (
                <tr key={day.key} className="h-[52px] page-break-inside-avoid">
                  <td className="p-2.5 font-bold text-[11px] text-primary font-heading border-r border-light-gray bg-cream/[0.02]">
                    {day.label}
                  </td>
                  {PERIODS.map(p => {
                    const entry = getEntryForSlot(day.key, p)
                    return (
                      <td
                        key={p}
                        className="p-1 border-r border-light-gray text-center min-w-[70px] max-w-[90px] vertical-align-top h-full"
                      >
                        {entry ? (
                          <div className="h-full flex flex-col justify-between text-left">
                            <p className="font-extrabold text-primary text-[9px] tracking-tight uppercase leading-snug line-clamp-2">
                              {entry.subject_name}
                            </p>
                            <div className="mt-0.5 space-y-0.5">
                              <p className="text-[8px] text-charcoal/80 font-medium truncate">
                                {entry.teacher_name}
                              </p>
                              {entry.room && (
                                <p className="text-[7px] text-steel-gray font-semibold truncate uppercase leading-none">
                                  Rm {entry.room}
                                </p>
                              )}
                              <p className="text-[7px] font-bold text-steel-gray/85">
                                {cleanTimeStr(entry.starts_at)}-{cleanTimeStr(entry.ends_at)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-light-gray">
                            —
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Notes / Signatures */}
        <div className="mt-5 flex justify-between items-end">
          <div className="text-[8px] text-steel-gray font-caption leading-relaxed max-w-sm">
            <p className="font-semibold text-charcoal">Instructions:</p>
            <p>1. Period duration is 45 minutes unless otherwise noted.</p>
            <p>2. Students must be present in the designated room 5 minutes prior to start time.</p>
          </div>
          <div className="flex gap-12 text-center text-[11px] font-semibold text-charcoal pr-4">
            <div className="border-t border-charcoal/40 pt-1 min-w-[100px]">
              Class Teacher
            </div>
            <div className="border-t border-charcoal/40 pt-1 min-w-[100px]">
              Principal
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
