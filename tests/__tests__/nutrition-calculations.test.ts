import { describe, it, expect } from "vitest"
import {
  numericToNumber,
  sumTotals,
  resolveGoal,
  computeStatus,
  computeRemaining,
  computeDailySummary,
  computeWeeklyAverage,
  computeInsights,
  type DbSettings,
  type DbOverride,
  type DbMealItem,
} from "@/lib/nutrition-calculations"

// ── numericToNumber ─────────────────────────────────────────────────────────

describe("numericToNumber", () => {
  it("returns 0 for null", () => expect(numericToNumber(null)).toBe(0))
  it("returns 0 for undefined", () => expect(numericToNumber(undefined)).toBe(0))
  it("parses a numeric string", () => expect(numericToNumber("123.5")).toBe(123.5))
  it("passes through a valid number", () => expect(numericToNumber(42)).toBe(42))
  it("returns 0 for NaN string", () => expect(numericToNumber("not-a-number")).toBe(0))
  it("returns 0 for Infinity", () => expect(numericToNumber(Infinity)).toBe(0))
  it("parses '0'", () => expect(numericToNumber("0")).toBe(0))
  it("handles negative numbers", () => expect(numericToNumber("-5.5")).toBe(-5.5))
})

// ── sumTotals ───────────────────────────────────────────────────────────────

describe("sumTotals", () => {
  it("sums multiple items correctly", () => {
    const items = [
      { kcal: "200", proteinG: "25", carbsG: "30", fatG: "5" },
      { kcal: "300", proteinG: "15", carbsG: "40", fatG: "10" },
    ]
    const result = sumTotals(items)
    expect(result.kcal).toBe(500)
    expect(result.proteinG).toBe(40)
    expect(result.carbsG).toBe(70)
    expect(result.fatG).toBe(15)
    expect(result.itemCount).toBe(2)
  })

  it("handles empty array", () => {
    const result = sumTotals([])
    expect(result.kcal).toBe(0)
    expect(result.itemCount).toBe(0)
  })

  it("handles null values as 0", () => {
    const result = sumTotals([{ kcal: null, proteinG: null, carbsG: null, fatG: null }])
    expect(result.kcal).toBe(0)
    expect(result.proteinG).toBe(0)
  })

  it("rounds kcal to integer, macros to 1 decimal", () => {
    const result = sumTotals([{ kcal: "100.7", proteinG: "25.35", carbsG: "10", fatG: "5" }])
    expect(result.kcal).toBe(101)
    expect(result.proteinG).toBe(25.4)
  })
})

// ── resolveGoal ─────────────────────────────────────────────────────────────

const BASE_SETTINGS: DbSettings = {
  maintenanceKcal: 2400,
  targetKcal: 2100,
  proteinTargetG: "150",
  carbsTargetG: null,
  fatTargetG: null,
  targetToleranceKcal: null,
}

describe("resolveGoal", () => {
  it("returns unconfigured when no settings and no override", () => {
    const goal = resolveGoal("2026-07-16", null, null)
    expect(goal.source).toBe("unconfigured")
    expect(goal.targetKcal).toBeNull()
    expect(goal.maintenanceKcal).toBeNull()
  })

  it("returns defaults from settings", () => {
    const goal = resolveGoal("2026-07-16", BASE_SETTINGS, null)
    expect(goal.source).toBe("default")
    expect(goal.targetKcal).toBe(2100)
    expect(goal.maintenanceKcal).toBe(2400)
    expect(goal.proteinTargetG).toBe(150)
  })

  it("override targetKcal takes precedence over settings", () => {
    const override: DbOverride = {
      targetKcal: 1800,
      maintenanceKcal: null,
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
    }
    const goal = resolveGoal("2026-07-16", BASE_SETTINGS, override)
    expect(goal.source).toBe("override")
    expect(goal.targetKcal).toBe(1800)
    // Falls back to settings maintenance when override has null
    expect(goal.maintenanceKcal).toBe(2400)
  })

  it("override falls back to settings for null fields", () => {
    const override: DbOverride = {
      targetKcal: null,
      maintenanceKcal: null,
      proteinTargetG: "200",
      carbsTargetG: null,
      fatTargetG: null,
    }
    const goal = resolveGoal("2026-07-16", BASE_SETTINGS, override)
    expect(goal.proteinTargetG).toBe(200)
    expect(goal.targetKcal).toBe(2100) // falls back to settings
  })

  it("computes default tolerance as max(100, 5% of target)", () => {
    const goal = resolveGoal("2026-07-16", BASE_SETTINGS, null)
    // 5% of 2100 = 105, max(100, 105) = 105
    expect(goal.toleranceKcal).toBe(105)
  })

  it("uses configured tolerance when set", () => {
    const settingsWithTolerance: DbSettings = { ...BASE_SETTINGS, targetToleranceKcal: 200 }
    const goal = resolveGoal("2026-07-16", settingsWithTolerance, null)
    expect(goal.toleranceKcal).toBe(200)
  })
})

// ── computeStatus ───────────────────────────────────────────────────────────

describe("computeStatus", () => {
  const goal = resolveGoal("2026-07-16", BASE_SETTINGS, null) // target=2100, tol=105

  it("returns no-data when totals is null", () => {
    expect(computeStatus(null, goal)).toBe("no-data")
  })

  it("returns no-data when itemCount is 0", () => {
    const totals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, itemCount: 0 }
    expect(computeStatus(totals, goal)).toBe("no-data")
  })

  it("NEVER returns under for no meals (spec requirement)", () => {
    expect(computeStatus(null, goal)).not.toBe("under")
  })

  it("returns unconfigured when target is null with meals", () => {
    const unconfiguredGoal = resolveGoal("2026-07-16", null, null)
    const totals = { kcal: 1500, proteinG: 100, carbsG: 150, fatG: 50, itemCount: 5 }
    expect(computeStatus(totals, unconfiguredGoal)).toBe("unconfigured")
  })

  it("returns within when kcal is exactly at target", () => {
    const totals = { kcal: 2100, proteinG: 100, carbsG: 200, fatG: 50, itemCount: 5 }
    expect(computeStatus(totals, goal)).toBe("within")
  })

  it("returns within when kcal is within tolerance", () => {
    // target=2100, tol=105 → within = [1995, 2205]
    const totals = { kcal: 2000, proteinG: 100, carbsG: 200, fatG: 50, itemCount: 5 }
    expect(computeStatus(totals, goal)).toBe("within") // 100 < 105 tolerance
  })

  it("returns under when kcal is below tolerance boundary", () => {
    // 2100 - 106 = 1994, which is below tolerance boundary of 1995
    const totals = { kcal: 1994, proteinG: 80, carbsG: 180, fatG: 40, itemCount: 3 }
    expect(computeStatus(totals, goal)).toBe("under")
  })

  it("returns over when kcal is above tolerance boundary", () => {
    // 2100 + 106 = 2206, which is above tolerance boundary of 2205
    const totals = { kcal: 2206, proteinG: 150, carbsG: 250, fatG: 80, itemCount: 8 }
    expect(computeStatus(totals, goal)).toBe("over")
  })
})

// ── computeRemaining ────────────────────────────────────────────────────────

describe("computeRemaining", () => {
  const goal = resolveGoal("2026-07-16", BASE_SETTINGS, null) // target=2100, maint=2400

  it("returns target as remaining when no meals", () => {
    const { remainingToTarget } = computeRemaining(null, goal)
    expect(remainingToTarget).toBe(2100)
  })

  it("calculates remaining correctly when under target", () => {
    const totals = { kcal: 1500, proteinG: 80, carbsG: 150, fatG: 50, itemCount: 4 }
    const { remainingToTarget, targetDelta, maintenanceBalance } = computeRemaining(totals, goal)
    expect(remainingToTarget).toBe(600) // 2100 - 1500
    expect(targetDelta).toBe(-600) // 1500 - 2100
    expect(maintenanceBalance).toBe(-900) // 1500 - 2400
  })

  it("returns 0 remaining (not negative) when over target", () => {
    const totals = { kcal: 2500, proteinG: 150, carbsG: 250, fatG: 80, itemCount: 8 }
    const { remainingToTarget, targetDelta } = computeRemaining(totals, goal)
    expect(remainingToTarget).toBe(0) // never negative
    expect(targetDelta).toBe(400) // 2500 - 2100
  })

  it("maintenanceBalance is null when no maintenance set", () => {
    const noMaintGoal = resolveGoal("2026-07-16", { ...BASE_SETTINGS, maintenanceKcal: null }, null)
    const totals = { kcal: 2000, proteinG: 100, carbsG: 200, fatG: 50, itemCount: 5 }
    const { maintenanceBalance } = computeRemaining(totals, noMaintGoal)
    expect(maintenanceBalance).toBeNull()
  })
})

// ── computeDailySummary ─────────────────────────────────────────────────────

describe("computeDailySummary", () => {
  const items: DbMealItem[] = [
    { kcal: "500", proteinG: "40", carbsG: "60", fatG: "15", notes: "assumed home-cooked" },
    { kcal: "300", proteinG: "20", carbsG: "30", fatG: "10", notes: null },
  ]

  it("computes correct totals", () => {
    const result = computeDailySummary("2026-07-16", items, BASE_SETTINGS, null)
    expect(result.totals?.kcal).toBe(800)
    expect(result.totals?.proteinG).toBe(60)
    expect(result.mealCount).toBe(2)
  })

  it("counts assumption items correctly", () => {
    const result = computeDailySummary("2026-07-16", items, BASE_SETTINGS, null)
    expect(result.assumptionCount).toBe(1) // only first item has 'assumed' note
  })

  it("returns null totals for empty items", () => {
    const result = computeDailySummary("2026-07-16", [], BASE_SETTINGS, null)
    expect(result.totals).toBeNull()
    expect(result.status).toBe("no-data")
  })
})

// ── computeWeeklyAverage ────────────────────────────────────────────────────

describe("computeWeeklyAverage", () => {
  it("divides by logged days not total days", () => {
    const days = [
      computeDailySummary("2026-07-14", [{ kcal: "2000", proteinG: "100", carbsG: "200", fatG: "60", notes: null }], BASE_SETTINGS, null),
      computeDailySummary("2026-07-15", [], BASE_SETTINGS, null), // no meals
      computeDailySummary("2026-07-16", [{ kcal: "1800", proteinG: "90", carbsG: "180", fatG: "50", notes: null }], BASE_SETTINGS, null),
    ]
    const result = computeWeeklyAverage(days)
    expect(result.loggedDays).toBe(2)
    expect(result.rangeDays).toBe(3)
    expect(result.avgKcal).toBe(1900) // (2000+1800)/2 = 1900
    expect(result.coveragePercent).toBe(67) // 2/3 = 67%
  })

  it("returns null avgKcal when no logged days", () => {
    const days = [computeDailySummary("2026-07-16", [], null, null)]
    const result = computeWeeklyAverage(days)
    expect(result.avgKcal).toBeNull()
    expect(result.loggedDays).toBe(0)
  })
})

// ── computeInsights ─────────────────────────────────────────────────────────

describe("computeInsights", () => {
  it("returns empty array when no totals", () => {
    const summary = computeDailySummary("2026-07-16", [], BASE_SETTINGS, null)
    expect(computeInsights(summary)).toHaveLength(0)
  })

  it("returns max 3 insights", () => {
    const items: DbMealItem[] = [
      { kcal: "1500", proteinG: "80", carbsG: "200", fatG: "40", notes: null },
    ]
    const summary = computeDailySummary("2026-07-16", items, BASE_SETTINGS, null)
    const insights = computeInsights(summary)
    expect(insights.length).toBeLessThanOrEqual(3)
  })

  it("does not include shaming language", () => {
    const items: DbMealItem[] = [
      { kcal: "2800", proteinG: "120", carbsG: "300", fatG: "90", notes: null },
    ]
    const summary = computeDailySummary("2026-07-16", items, BASE_SETTINGS, null)
    const insights = computeInsights(summary)
    const text = insights.join(" ").toLowerCase()
    // No moralizing words
    expect(text).not.toContain("bad")
    expect(text).not.toContain("good food")
    expect(text).not.toContain("guilty")
    expect(text).not.toContain("weight loss")
  })
})
