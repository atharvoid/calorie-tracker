/**
 * Pure date utilities — no `new Date('YYYY-MM-DD')` (that interprets as UTC).
 * All operations use string-based arithmetic or Intl.DateTimeFormat.
 */

/**
 * Locale used for all human-facing date formatting. Single constant so the
 * formatters below cannot drift apart from each other.
 */
const DISPLAY_LOCALE = process.env.NEXT_PUBLIC_DATE_LOCALE || "en-IN"

/** Hard cap on `dateRange` output, guarding against unbounded queries. */
export const MAX_DATE_RANGE_DAYS = 366

/** Returns current YYYY-MM-DD in the given IANA timezone */
export function localDate(timezone: string): string {
	// en-CA formats as YYYY-MM-DD, which is exactly our storage format.
	return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date())
}

export type DateParts = { year: number; month: number; day: number }

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Number of days in a given month, accounting for leap years. */
export function daysInMonth(year: number, month: number): number {
	if (month === 2 && isLeapYear(year)) return 29
	return DAYS_PER_MONTH[month - 1]
}

/**
 * Parse YYYY-MM-DD into numeric parts — throws on invalid format or on a date
 * that does not exist on the calendar.
 *
 * The previous implementation only checked `day <= 31`, so 2026-02-31 and
 * 2026-04-31 were accepted and silently rolled over into the next month.
 */
export function parseLocalDate(dateStr: string): DateParts {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
	if (!match) throw new Error(`Invalid date format: ${dateStr}`)
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (month < 1 || month > 12) {
		throw new Error(`Invalid month in date: ${dateStr}`)
	}
	if (day < 1 || day > daysInMonth(year, month)) {
		throw new Error(`Invalid day in date: ${dateStr}`)
	}
	return { year, month, day }
}

/** Format DateParts back to YYYY-MM-DD */
function partsToStr({ year, month, day }: DateParts): string {
	return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Converts YYYY-MM-DD to a Date at UTC noon, which is DST-safe. */
function toUtcNoon(dateStr: string): Date {
	const { year, month, day } = parseLocalDate(dateStr)
	return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

function fromUtcDate(d: Date): string {
	return (
		`${d.getUTCFullYear()}-` +
		`${String(d.getUTCMonth() + 1).padStart(2, "0")}-` +
		`${String(d.getUTCDate()).padStart(2, "0")}`
	)
}

/**
 * Add (or subtract) calendar days. Anchored at UTC noon so a DST transition can
 * never shift the result into the adjacent day.
 */
export function addDays(dateStr: string, days: number): string {
	return fromUtcDate(new Date(toUtcNoon(dateStr).getTime() + days * 86_400_000))
}

/** Returns the Monday of the week containing dateStr (ISO week: Mon=1, Sun=7) */
export function mondayOfWeek(dateStr: string): string {
	// getUTCDay(): 0=Sun, 1=Mon ... 6=Sat. Shift so Monday = 0.
	const daysFromMonday = (toUtcNoon(dateStr).getUTCDay() + 6) % 7
	return addDays(dateStr, -daysFromMonday)
}

/** Returns the Sunday of the week containing dateStr */
export function sundayOfWeek(dateStr: string): string {
	return addDays(mondayOfWeek(dateStr), 6)
}

/**
 * Enumerate all YYYY-MM-DD from start to end (inclusive).
 *
 * Throws when the span exceeds MAX_DATE_RANGE_DAYS. The previous version
 * silently truncated at 366 entries with no signal, so callers could render an
 * incomplete series and believe it was complete.
 */
export function dateRange(start: string, end: string): string[] {
	// Validate both endpoints up front so a bad `end` fails fast.
	parseLocalDate(start)
	parseLocalDate(end)

	const results: string[] = []
	let cursor = start
	while (cursor <= end) {
		if (results.length >= MAX_DATE_RANGE_DAYS) {
			throw new Error(`Date range ${start}..${end} exceeds the ${MAX_DATE_RANGE_DAYS}-day maximum.`)
		}
		results.push(cursor)
		cursor = addDays(cursor, 1)
	}
	return results
}

const MONTH_ABBREVIATIONS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
]

/** e.g. '13–19 Jul 2026' */
export function formatWeekLabel(monday: string, sunday: string): string {
	const mParts = parseLocalDate(monday)
	const sParts = parseLocalDate(sunday)
	const mMonth = MONTH_ABBREVIATIONS[mParts.month - 1]
	const sMonth = MONTH_ABBREVIATIONS[sParts.month - 1]

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
	return toUtcNoon(dateStr).toLocaleDateString(DISPLAY_LOCALE, {
		weekday: "short",
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	})
}

/** Format a YYYY-MM-DD to weekday abbreviation e.g. 'Mon' */
export function formatWeekday(dateStr: string): string {
	return toUtcNoon(dateStr).toLocaleDateString(DISPLAY_LOCALE, {
		weekday: "short",
		timeZone: "UTC",
	})
}

/** Format e.g. 'Jul 16' */
export function formatMonthDay(dateStr: string): string {
	return toUtcNoon(dateStr).toLocaleDateString(DISPLAY_LOCALE, {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	})
}

/** partsToStr re-export for external use */
export { partsToStr }
