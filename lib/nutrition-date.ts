/**
 * Pure date utilities — no `new Date('YYYY-MM-DD')` (that interprets as UTC).
 * All operations use string-based arithmetic or Intl.DateTimeFormat.
 */

/** Returns current YYYY-MM-DD in the given IANA timezone */
export function localDate(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone })
    .format(new Date())
}

export type DateParts = { year: number; month: number; day: number }

/** Parse YYYY-MM-DD into numeric parts — throws on invalid format */
export function parseLocalDate(dateStr: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) throw new Error(`Invalid date format: ${dateStr}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date values: ${dateStr}`)
  }
  return { year, month, day }
}

/** Format DateParts back to YYYY-MM-DD */
function partsToStr({ year, month, day }: DateParts): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * Add (or subtract) calendar days using a UTC trick:
 * We convert YYYY-MM-DD → treat as UTC noon (avoids DST shifts), offset by
 * days, then format back to YYYY-MM-DD.
 */
export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseLocalDate(dateStr)
  // Use UTC noon to avoid any DST ambiguity at midnight
  const ms = Date.UTC(year, month - 1, day, 12, 0, 0) + days * 86_400_000
  const d = new Date(ms)
  return (
    `${d.getUTCFullYear()}-` +
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getUTCDate()).padStart(2, "0")}`
  )
}

/** Returns the Monday of the week containing dateStr (ISO week: Mon=1, Sun=7) */
export function mondayOfWeek(dateStr: string): string {
  const { year, month, day } = parseLocalDate(dateStr)
  const ms = Date.UTC(year, month - 1, day, 12, 0, 0)
  const d = new Date(ms)
  // getUTCDay(): 0=Sun, 1=Mon ... 6=Sat
  const dow = d.getUTCDay()
  // Shift so Monday = 0
  const daysFromMonday = (dow + 6) % 7
  return addDays(dateStr, -daysFromMonday)
}

/** Returns the Sunday of the week containing dateStr */
export function sundayOfWeek(dateStr: string): string {
  const monday = mondayOfWeek(dateStr)
  return addDays(monday, 6)
}

/**
 * Enumerate all YYYY-MM-DD from start to end (inclusive).
 * Capped at 366 entries.
 */
export function dateRange(start: string, end: string): string[] {
  const results: string[] = []
  let cursor = start
  let count = 0
  while (cursor <= end && count < 366) {
    results.push(cursor)
    cursor = addDays(cursor, 1)
    count++
  }
  return results
}

/** e.g. '13–19 Jul 2026' */
export function formatWeekLabel(monday: string, sunday: string): string {
  const mParts = parseLocalDate(monday)
  const sParts = parseLocalDate(sunday)
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  const mMonth = monthNames[mParts.month - 1]
  const sMonth = monthNames[sParts.month - 1]

  if (mParts.month === sParts.month && mParts.year === sParts.year) {
    return `${mParts.day}–${sParts.day} ${mMonth} ${sParts.year}`
  }
  if (mParts.year === sParts.year) {
    return `${mParts.day} ${mMonth} – ${sParts.day} ${sMonth} ${sParts.year}`
  }
  return `${mParts.day} ${mMonth} ${mParts.year} – ${sParts.day} ${sMonth} ${sParts.year}`
}

/** Is dateStr today in the given timezone? */
export function isToday(dateStr: string, timezone: string): boolean {
  return localDate(timezone) === dateStr
}

/** Is dateStr in the future relative to today in the given timezone? */
export function isFuture(dateStr: string, timezone: string): boolean {
  return dateStr > localDate(timezone)
}

/** Format a YYYY-MM-DD to human-readable e.g. 'Wed, 16 Jul' */
export function formatShortDate(dateStr: string): string {
  const { year, month, day } = parseLocalDate(dateStr)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

/** Format a YYYY-MM-DD to weekday abbreviation e.g. 'Mon' */
export function formatWeekday(dateStr: string): string {
  const { year, month, day } = parseLocalDate(dateStr)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })
}

/** Format e.g. 'Jul 16' */
export function formatMonthDay(dateStr: string): string {
  const { year, month, day } = parseLocalDate(dateStr)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })
}

/** partsToStr re-export for external use */
export { partsToStr }
