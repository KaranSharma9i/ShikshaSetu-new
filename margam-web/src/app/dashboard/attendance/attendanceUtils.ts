// Client-safe helpers shared by the attendance screens.
import type { AcademicYearOption, SectionOption } from '@/lib/repositories/attendance'

/** Academic year covering a date, falling back to the current academic year. */
export function academicYearForDate(academicYears: AcademicYearOption[], date: string): AcademicYearOption | null {
  return (
    academicYears.find((ay) => ay.starts_on <= date && ay.ends_on >= date) ||
    academicYears.find((ay) => ay.is_current) ||
    null
  )
}

/** Sections that belong to the academic year covering the given date. */
export function sectionsForDate(
  sections: SectionOption[],
  academicYears: AcademicYearOption[],
  date: string
): SectionOption[] {
  const ay = academicYearForDate(academicYears, date)
  if (!ay) return sections
  return sections.filter((s) => s.academicYearId === ay.id)
}

function csvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Prevent spreadsheet formula injection and quote special characters
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Builds a CSV file in the browser and triggers a download. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/[^\w.\-]+/g, '_')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
