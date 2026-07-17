import { describe, it, expect } from "vitest"
import { parseTelegramDate } from "@/lib/telegram"
import { localDate, addDays, formatShortDate } from "@/lib/nutrition-date"

const TZ = "Asia/Kolkata"

describe("Telegram Date Parsing", () => {
  it("correctly parses relative date 'yesterday'", () => {
    const today = localDate(TZ)
    const expectedDate = addDays(today, -1)
    const result = parseTelegramDate("yesterday breakfast was 2 eggs", TZ)
    
    expect(result).not.toBeNull()
    expect(result!.date).toBe(expectedDate)
    expect(result!.cleanText).toBe("breakfast was 2 eggs")
    expect(result!.label).toBe("Yesterday")
  })

  it("correctly parses absolute date 'YYYY-MM-DD'", () => {
    const result = parseTelegramDate("on 2026-07-10 lunch was rice and dal", TZ)
    
    expect(result).not.toBeNull()
    expect(result!.date).toBe("2026-07-10")
    expect(result!.cleanText).toBe("lunch was rice and dal")
    expect(result!.label).toBe(formatShortDate("2026-07-10"))
  })

  it("correctly parses 'on DD Month' format", () => {
    const today = localDate(TZ)
    const currentYear = today.split("-")[0]
    const expectedDate = `${currentYear}-07-15`
    
    const result = parseTelegramDate("on 15 July dinner was chicken breast", TZ)
    
    expect(result).not.toBeNull()
    expect(result!.date).toBe(expectedDate)
    expect(result!.cleanText).toBe("dinner was chicken breast")
    expect(result!.label).toBe(formatShortDate(expectedDate))
  })

  it("returns null for no date format matched", () => {
    const result = parseTelegramDate("had some sushi and soup", TZ)
    expect(result).toBeNull()
  })
})
