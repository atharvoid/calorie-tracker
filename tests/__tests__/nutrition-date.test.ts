import { describe, it, expect } from "vitest"
import {
  localDate,
  parseLocalDate,
  addDays,
  mondayOfWeek,
  sundayOfWeek,
  dateRange,
  formatWeekLabel,
  isToday,
  isFuture,
} from "@/lib/nutrition-date"

// ── parseLocalDate ──────────────────────────────────────────────────────────

describe("parseLocalDate", () => {
  it("parses a valid date string", () => {
    const parts = parseLocalDate("2026-07-16")
    expect(parts.year).toBe(2026)
    expect(parts.month).toBe(7)
    expect(parts.day).toBe(16)
  })

  it("throws on invalid format", () => {
    expect(() => parseLocalDate("16-07-2026")).toThrow()
    expect(() => parseLocalDate("2026/07/16")).toThrow()
    expect(() => parseLocalDate("not-a-date")).toThrow()
  })

  it("throws on invalid month/day values", () => {
    expect(() => parseLocalDate("2026-13-01")).toThrow()
    expect(() => parseLocalDate("2026-07-32")).toThrow()
  })
})

// ── addDays ─────────────────────────────────────────────────────────────────

describe("addDays", () => {
  it("adds days correctly within same month", () => {
    expect(addDays("2026-07-16", 3)).toBe("2026-07-19")
  })

  it("subtracts days correctly", () => {
    expect(addDays("2026-07-16", -5)).toBe("2026-07-11")
  })

  it("wraps month boundary forward correctly", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01")
  })

  it("wraps month boundary backward correctly", () => {
    expect(addDays("2026-08-01", -1)).toBe("2026-07-31")
  })

  it("wraps year boundary correctly", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31")
  })

  it("handles leap year February 29", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29")
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01")
  })

  it("adding 0 days returns same date", () => {
    expect(addDays("2026-07-16", 0)).toBe("2026-07-16")
  })
})

// ── mondayOfWeek / sundayOfWeek ─────────────────────────────────────────────

describe("mondayOfWeek", () => {
  it("returns Monday when given a Wednesday (mid-week)", () => {
    // 2026-07-16 is a Thursday, so Monday is 2026-07-13
    expect(mondayOfWeek("2026-07-16")).toBe("2026-07-13")
  })

  it("returns same date when given Monday", () => {
    expect(mondayOfWeek("2026-07-13")).toBe("2026-07-13")
  })

  it("returns correct Monday when given Sunday", () => {
    // Sunday 2026-07-19: Monday should be 2026-07-13 (6 days back)
    expect(mondayOfWeek("2026-07-19")).toBe("2026-07-13")
  })

  it("wraps across month boundary correctly", () => {
    // 2026-08-01 (Saturday): Monday of that week is 2026-07-27
    expect(mondayOfWeek("2026-08-01")).toBe("2026-07-27")
  })
})

describe("sundayOfWeek", () => {
  it("returns Sunday from any day of the week", () => {
    // Week of 2026-07-13 (Mon) to 2026-07-19 (Sun)
    expect(sundayOfWeek("2026-07-16")).toBe("2026-07-19")
    expect(sundayOfWeek("2026-07-13")).toBe("2026-07-19")
    expect(sundayOfWeek("2026-07-19")).toBe("2026-07-19")
  })
})

// ── dateRange ───────────────────────────────────────────────────────────────

describe("dateRange", () => {
  it("enumerates dates inclusive", () => {
    const range = dateRange("2026-07-14", "2026-07-16")
    expect(range).toEqual(["2026-07-14", "2026-07-15", "2026-07-16"])
  })

  it("returns single date when start equals end", () => {
    expect(dateRange("2026-07-16", "2026-07-16")).toEqual(["2026-07-16"])
  })

  it("returns empty when start is after end", () => {
    expect(dateRange("2026-07-17", "2026-07-16")).toEqual([])
  })

  it("caps at 366 entries", () => {
    const range = dateRange("2020-01-01", "2025-12-31")
    expect(range.length).toBe(366)
  })

  it("wraps month boundaries correctly", () => {
    const range = dateRange("2026-07-30", "2026-08-02")
    expect(range).toEqual(["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"])
  })
})

// ── formatWeekLabel ─────────────────────────────────────────────────────────

describe("formatWeekLabel", () => {
  it("formats same-month week", () => {
    expect(formatWeekLabel("2026-07-13", "2026-07-19")).toBe("13–19 Jul 2026")
  })

  it("formats cross-month week", () => {
    expect(formatWeekLabel("2026-07-27", "2026-08-02")).toBe("27 Jul – 2 Aug 2026")
  })

  it("formats cross-year week", () => {
    expect(formatWeekLabel("2025-12-29", "2026-01-04")).toBe(
      "29 Dec 2025 – 4 Jan 2026"
    )
  })
})

// ── Asia/Kolkata date at UTC midnight ───────────────────────────────────────

describe("Asia/Kolkata timezone handling", () => {
  it("localDate returns IST date string not UTC", () => {
    // We can't fully test this in isolation without mocking Date,
    // but we can verify the format is correct
    const date = localDate("Asia/Kolkata")
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("isToday returns true for today's date in IST", () => {
    const today = localDate("Asia/Kolkata")
    expect(isToday(today, "Asia/Kolkata")).toBe(true)
  })

  it("isFuture returns false for today", () => {
    const today = localDate("Asia/Kolkata")
    expect(isFuture(today, "Asia/Kolkata")).toBe(false)
  })

  it("isFuture returns true for a far future date", () => {
    expect(isFuture("2099-12-31", "Asia/Kolkata")).toBe(true)
  })

  it("isFuture returns false for a past date", () => {
    expect(isFuture("2020-01-01", "Asia/Kolkata")).toBe(false)
  })
})
