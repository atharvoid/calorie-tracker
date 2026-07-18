/**
 * pattern-observation.test.ts
 *
 * Unit tests for lib/nutrition-pattern-observation.ts
 *
 * Verifies exact output strings for all required wording rules.
 * No React, no DOM, no network, no locale-dependent formatting.
 */

import { describe, it, expect } from "vitest"
import {
  buildPatternObservation,
  renderPatternObservation,
  type PatternObservationInput,
} from "../../lib/nutrition-pattern-observation"

// ── Helpers ──────────────────────────────────────────────────────────────────

function make(overrides: Partial<PatternObservationInput> = {}): PatternObservationInput {
  return {
    loggedDays: 6,
    rangeDays: 7,
    targetEligibleDays: 6,
    averageIntakeKcal: 2140,
    averageTargetDeltaKcal: 120,
    averageToleranceKcal: null,
    ...overrides,
  }
}

// ── Zero logged days ──────────────────────────────────────────────────────────

describe("zero logged days", () => {
  it("returns 'No days were logged in this period.'", () => {
    const obs = buildPatternObservation(make({ loggedDays: 0, targetEligibleDays: 0, averageIntakeKcal: null, averageTargetDeltaKcal: null }))
    expect(obs.coverage).toBe("No days were logged in this period.")
    expect(obs.intake).toBeUndefined()
    expect(obs.targetComparison).toBeUndefined()
  })
})

// ── Fewer than four logged days ───────────────────────────────────────────────

describe("fewer than four logged days — coverage only", () => {
  it("1 of 7 days was logged (singular grammar)", () => {
    const obs = buildPatternObservation(make({ loggedDays: 1, targetEligibleDays: 1, averageIntakeKcal: 2000 }))
    expect(obs.coverage).toBe("1 of 7 days was logged.")
    expect(obs.intake).toBeUndefined()
    expect(obs.targetComparison).toBeUndefined()
  })

  it("2 of 7 days were logged", () => {
    const obs = buildPatternObservation(make({ loggedDays: 2, targetEligibleDays: 2, averageIntakeKcal: 1800 }))
    expect(obs.coverage).toBe("2 of 7 days were logged.")
    expect(obs.intake).toBeUndefined()
  })

  it("3 of 7 days were logged — no trend interpretation", () => {
    const obs = buildPatternObservation(make({ loggedDays: 3, targetEligibleDays: 3, averageIntakeKcal: 2000 }))
    expect(obs.coverage).toBe("3 of 7 days were logged.")
    expect(obs.intake).toBeUndefined()
    expect(obs.targetComparison).toBeUndefined()
  })

  it("1 of 28 days was logged (longer range period)", () => {
    const obs = buildPatternObservation(make({ loggedDays: 1, rangeDays: 28, targetEligibleDays: 1, averageIntakeKcal: 1900 }))
    expect(obs.coverage).toBe("1 of 28 days was logged.")
  })
})

// ── Four or more days: trend eligible ────────────────────────────────────────

describe("four or more logged days — trend interpretation available", () => {
  it("exactly 4 days: trend becomes eligible — produces intake sentence", () => {
    const obs = buildPatternObservation(make({
      loggedDays: 4,
      rangeDays: 7,
      targetEligibleDays: 0,
      averageIntakeKcal: 2100,
      averageTargetDeltaKcal: null,
    }))
    expect(obs.coverage).toBe("Average intake was 2,100 kcal across 4 logged days in this 7-day period.")
    expect(obs.targetComparison).toBeUndefined()
  })
})

// ── No configured targets ─────────────────────────────────────────────────────

describe("no configured targets", () => {
  it("returns intake sentence only — no target comparison", () => {
    const obs = buildPatternObservation(make({
      targetEligibleDays: 0,
      averageTargetDeltaKcal: null,
      averageToleranceKcal: null,
    }))
    expect(obs.coverage).toBe("Average intake was 2,140 kcal across 6 logged days in this 7-day period.")
    expect(obs.targetComparison).toBeUndefined()
  })
})

// ── Every logged day has a target ─────────────────────────────────────────────

describe("every logged day is target-eligible", () => {
  it("120 kcal above target — no tolerance", () => {
    const obs = buildPatternObservation(make({
      averageTargetDeltaKcal: 120,
      averageToleranceKcal: null,
    }))
    expect(obs.coverage).toBe("Average intake was 2,140 kcal across 6 logged days in this 7-day period.")
    expect(obs.targetComparison).toBe("This is 120 kcal above the average configured target.")
  })

  it("below target — negative delta", () => {
    const obs = buildPatternObservation(make({
      averageTargetDeltaKcal: -250,
      averageToleranceKcal: null,
    }))
    expect(obs.targetComparison).toBe("This is 250 kcal below the average configured target.")
  })

  it("exactly at tolerance boundary — reported as within tolerance", () => {
    const obs = buildPatternObservation(make({
      averageTargetDeltaKcal: 100,
      averageToleranceKcal: 100,
    }))
    expect(obs.targetComparison).toBe("This is within the configured tolerance.")
  })

  it("inside tolerance — reported as within tolerance", () => {
    const obs = buildPatternObservation(make({
      averageTargetDeltaKcal: 80,
      averageToleranceKcal: 150,
    }))
    expect(obs.targetComparison).toBe("This is within the configured tolerance.")
  })

  it("above tolerance — reports exact delta", () => {
    const obs = buildPatternObservation(make({
      averageTargetDeltaKcal: 200,
      averageToleranceKcal: 100,
    }))
    expect(obs.targetComparison).toBe("This is 200 kcal above the average configured target.")
  })

  it("delta of zero — reports 0 kcal above target (not 'within tolerance' without toleranceKcal)", () => {
    const obs = buildPatternObservation(make({
      averageTargetDeltaKcal: 0,
      averageToleranceKcal: null,
    }))
    expect(obs.targetComparison).toBe("This is 0 kcal above the average configured target.")
  })

  it("delta of zero with tolerance — reports within tolerance", () => {
    const obs = buildPatternObservation(make({
      averageTargetDeltaKcal: 0,
      averageToleranceKcal: 50,
    }))
    expect(obs.targetComparison).toBe("This is within the configured tolerance.")
  })
})

// ── Partial target eligibility ─────────────────────────────────────────────────

describe("partial target eligibility — targetEligibleDays !== loggedDays", () => {
  it("6 logged, 4 eligible, above target — uses separate 'Across N days' sentence", () => {
    const obs = buildPatternObservation(make({
      loggedDays: 6,
      targetEligibleDays: 4,
      averageTargetDeltaKcal: 120,
      averageToleranceKcal: null,
    }))
    expect(obs.coverage).toBe("Average intake was 2,140 kcal across 6 logged days in this 7-day period.")
    expect(obs.targetComparison).toBe("Across 4 days with a configured target, average intake was 120 kcal above the average configured target.")
    // No separate eligibility note — the sentence is self-disclosing
    expect(obs.targetEligibilityNote).toBeUndefined()
  })

  it("6 logged, 4 eligible, within tolerance — uses 'Across N days' within-tolerance form", () => {
    const obs = buildPatternObservation(make({
      loggedDays: 6,
      targetEligibleDays: 4,
      averageTargetDeltaKcal: 50,
      averageToleranceKcal: 100,
    }))
    expect(obs.targetComparison).toBe("Across 4 days with a configured target, average intake was within the configured tolerance.")
  })

  it("1 eligible day — singular grammar in 'Across 1 day with a configured target'", () => {
    const obs = buildPatternObservation(make({
      loggedDays: 6,
      targetEligibleDays: 1,
      averageTargetDeltaKcal: 200,
      averageToleranceKcal: null,
    }))
    expect(obs.targetComparison).toBe("Across 1 day with a configured target, average intake was 200 kcal above the average configured target.")
  })

  it("below target with partial eligibility", () => {
    const obs = buildPatternObservation(make({
      loggedDays: 7,
      rangeDays: 7,
      targetEligibleDays: 5,
      averageTargetDeltaKcal: -180,
      averageToleranceKcal: null,
    }))
    expect(obs.targetComparison).toBe("Across 5 days with a configured target, average intake was 180 kcal below the average configured target.")
  })
})

// ── Correct denominator copy ───────────────────────────────────────────────────

describe("correct copy denominator", () => {
  it("uses 'across 6 logged days in this 7-day period' — not 'across 6 of 7'", () => {
    const obs = buildPatternObservation(make({ loggedDays: 6, rangeDays: 7 }))
    expect(obs.coverage).toContain("across 6 logged days in this 7-day period")
    expect(obs.coverage).not.toContain("6 of 7")
  })

  it("uses 'across 4 logged days in this 28-day period' for 4-week range", () => {
    const obs = buildPatternObservation(make({ loggedDays: 4, rangeDays: 28, targetEligibleDays: 0, averageIntakeKcal: 1900, averageTargetDeltaKcal: null }))
    expect(obs.coverage).toContain("across 4 logged days in this 28-day period")
  })
})

// ── Missing or null fields ────────────────────────────────────────────────────

describe("missing average intake", () => {
  it("returns coverage-only when averageIntakeKcal is null at ≥4 days", () => {
    const obs = buildPatternObservation(make({ averageIntakeKcal: null, averageTargetDeltaKcal: null }))
    expect(obs.coverage).toContain("days were logged")
    expect(obs.intake).toBeUndefined()
    expect(obs.targetComparison).toBeUndefined()
  })
})

describe("missing delta", () => {
  it("returns intake sentence only when delta is null but targetEligibleDays > 0", () => {
    const obs = buildPatternObservation(make({
      targetEligibleDays: 4,
      averageTargetDeltaKcal: null,
    }))
    expect(obs.targetComparison).toBeUndefined()
  })
})

// ── rangeDays defensive validation ───────────────────────────────────────────

describe("rangeDays defensive cases", () => {
  it("rangeDays equals loggedDays — still uses correct denominator", () => {
    const obs = buildPatternObservation(make({ loggedDays: 7, rangeDays: 7, targetEligibleDays: 7 }))
    expect(obs.coverage).toContain("across 7 logged days in this 7-day period")
  })

  it("large rangeDays (12w = 84 days) produces correct sentence", () => {
    const obs = buildPatternObservation(make({ loggedDays: 60, rangeDays: 84, targetEligibleDays: 60, averageIntakeKcal: 2050 }))
    expect(obs.coverage).toContain("across 60 logged days in this 84-day period")
  })
})

// ── Rounded positive and negative calorie deltas ──────────────────────────────

describe("rounding of calorie deltas", () => {
  it("rounds positive delta to integer", () => {
    const obs = buildPatternObservation(make({ averageTargetDeltaKcal: 145.7 }))
    expect(obs.targetComparison).toContain("146 kcal above")
  })

  it("rounds negative delta to integer", () => {
    const obs = buildPatternObservation(make({ averageTargetDeltaKcal: -99.4 }))
    expect(obs.targetComparison).toContain("99 kcal below")
  })
})

// ── Missing days never treated as zero intake ─────────────────────────────────

describe("missing days never treated as zero intake", () => {
  it("loggedDays < rangeDays: denominator uses rangeDays for period label, loggedDays for count", () => {
    // 3 days logged out of 28 — coverage only (< 4)
    const obs = buildPatternObservation(make({
      loggedDays: 3,
      rangeDays: 28,
      averageIntakeKcal: 2000,
      targetEligibleDays: 3,
    }))
    // Coverage sentence must reference 3, not 28
    expect(obs.coverage).toBe("3 of 28 days were logged.")
    expect(obs.intake).toBeUndefined()
  })

  it("6 logged of 7 — period label uses 7, intake denominator uses 6 (not 7)", () => {
    const obs = buildPatternObservation(make({ loggedDays: 6, rangeDays: 7, targetEligibleDays: 0, averageIntakeKcal: 2100, averageTargetDeltaKcal: null }))
    expect(obs.coverage).toBe("Average intake was 2,100 kcal across 6 logged days in this 7-day period.")
    // Must not say 7-day average treating missing day as zero
    expect(obs.coverage).not.toContain("across 7 logged")
  })
})

// ── renderPatternObservation (integration) ────────────────────────────────────

describe("renderPatternObservation — joined output", () => {
  it("joins coverage and targetComparison with a space", () => {
    const obs = buildPatternObservation(make())
    const text = renderPatternObservation(obs)
    expect(text).toContain("Average intake was 2,140 kcal across 6 logged days in this 7-day period.")
    expect(text).toContain("This is 120 kcal above the average configured target.")
  })

  it("returns just coverage when no target", () => {
    const obs = buildPatternObservation(make({ targetEligibleDays: 0, averageTargetDeltaKcal: null }))
    const text = renderPatternObservation(obs)
    expect(text).toBe("Average intake was 2,140 kcal across 6 logged days in this 7-day period.")
  })
})
