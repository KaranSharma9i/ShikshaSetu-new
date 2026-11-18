// Date helpers.
//
// Vercel runs server code in UTC, while institutions operate in India (IST, UTC+5:30).
// Using `new Date().toISOString().slice(0, 10)` on the server therefore returns
// "yesterday" between 00:00 and 05:30 IST. These helpers always resolve the
// calendar date in the institution timezone instead.

export const INSTITUTION_TIMEZONE = 'Asia/Kolkata'

/** Returns YYYY-MM-DD for the given instant in the given timezone (default IST). */
export function toDateString(date: Date = new Date(), timeZone: string = INSTITUTION_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Today's date (YYYY-MM-DD) in the institution timezone. */
export function todayIST(): string {
  return toDateString(new Date())
}

/** Parses a YYYY-MM-DD string into its numeric parts without any timezone shifting. */
export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { year: y, month: m, day: d }
}

/** Day of week (0 = Sunday) for a YYYY-MM-DD string, timezone independent. */
export function dayOfWeek(dateStr: string): number {
  const { year, month, day } = parseDateParts(dateStr)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** Adds (or subtracts) days to a YYYY-MM-DD string, timezone independent. */
export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDateParts(dateStr)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return d.toISOString().slice(0, 10)
}

/** First and last date (YYYY-MM-DD) of a month (1-indexed). */
export function monthBounds(year: number, month: number): { start: string; end: string; lastDay: number } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    lastDay,
  }
}

/** Start/end instants (ISO strings) of "today" in IST, for timestamp range queries. */
export function todayISTRange(): { start: string; end: string } {
  const today = todayIST()
  return {
    start: new Date(`${today}T00:00:00+05:30`).toISOString(),
    end: new Date(`${today}T23:59:59.999+05:30`).toISOString(),
  }
}

/** Human readable long date for a YYYY-MM-DD string (no timezone shifting). */
export function formatLongDate(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr)
  if (!year || !month || !day) return dateStr
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
