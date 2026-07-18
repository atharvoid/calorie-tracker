/**
 * lib/nutrition-pattern-observation.ts
 *
 * Pure function that converts numeric analytics facts into the approved
 * Patterns observation copy. No React, no browser APIs, no network calls,
 * no locale-dependent date formatting.
 *
 * The Analytics API owns the numeric facts.
 * This module owns the presentation language.
 * The React component only renders the result.
 */

export type PatternObservationInput = {
  loggedDays: number
  rangeDays: number
  /** Days from loggedDays that also had a configured calorie target */
  targetEligibleDays: number
  averageIntakeKcal: number | null
  /** Average (intake - target) over days that had both intake AND target */
  averageTargetDeltaKcal: number | null
  /** Average configured tolerance, or null if none was set */
  averageToleranceKcal: number | null
}

export type PatternObservation = {
  /** Coverage-only sentence. Always present. */
  coverage: string
  /** Intake sentence. Present only when loggedDays >= 4 and intake is available. */
  intake?: string
  /** Target comparison sentence. Present only when delta data is available. */
  targetComparison?: string
  /** Partial eligibility disclosure. Present only when targetEligibleDays differs from loggedDays. */
  targetEligibilityNote?: string
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function plural(count: number, singular: string, pluralForm = singular + "s"): string {
  return count === 1 ? singular : pluralForm
}

function formatKcal(n: number): string {
  // No locale dependency — plain en-US comma formatting
  return n.toLocaleString("en-US")
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildPatternObservation(input: PatternObservationInput): PatternObservation {
  const {
    loggedDays,
    rangeDays,
    targetEligibleDays,
    averageIntakeKcal,
    averageTargetDeltaKcal,
    averageToleranceKcal,
  } = input

  // ── Zero logged days ───────────────────────────────────────────────────────
  if (loggedDays === 0) {
    return { coverage: "No days were logged in this period." }
  }

  // ── Fewer than four logged days: coverage only ─────────────────────────────
  // Approved wording: "1 of 7 days was logged." (day count is always plural;
  // only the verb changes: "was" for 1, "were" for > 1)
  if (loggedDays < 4) {
    const wasWere = loggedDays === 1 ? "was" : "were"
    return {
      coverage: `${loggedDays} of ${rangeDays} days ${wasWere} logged.`,
    }
  }

  // ── Enough data for a trend interpretation ────────────────────────────────

  // Safety: if intake is somehow missing at ≥4 days, return coverage-only
  if (averageIntakeKcal === null || averageIntakeKcal === undefined) {
    return {
      coverage: `${loggedDays} of ${rangeDays} days were logged.`,
    }
  }

  const dayWord = plural(loggedDays, "day")
  const intakeSentence = `Average intake was ${formatKcal(averageIntakeKcal)} kcal across ${loggedDays} logged ${dayWord} in this ${rangeDays}-day period.`

  // ── No target configured at all ────────────────────────────────────────────
  if (targetEligibleDays === 0) {
    return {
      coverage: intakeSentence,
      intake: undefined,
      targetComparison: undefined,
    }
  }

  // ── Delta and tolerance not available ─────────────────────────────────────
  if (averageTargetDeltaKcal === null || averageTargetDeltaKcal === undefined) {
    return {
      coverage: intakeSentence,
    }
  }

  const absDelta = Math.abs(Math.round(averageTargetDeltaKcal))
  // Zero delta is treated as "above" (non-negative, not a deficit)
  const direction = averageTargetDeltaKcal >= 0 ? "above" : "below"
  const eligibleDayWord = plural(targetEligibleDays, "day")

  const withinTolerance =
    averageToleranceKcal !== null &&
    averageToleranceKcal !== undefined &&
    absDelta <= averageToleranceKcal

  let targetComparisonSentence: string

  // ── All logged days are target-eligible ──────────────────────────────────
  if (targetEligibleDays === loggedDays) {
    if (withinTolerance) {
      targetComparisonSentence = `This is within the configured tolerance.`
    } else {
      targetComparisonSentence = `This is ${formatKcal(absDelta)} kcal ${direction} the average configured target.`
    }
    return {
      coverage: intakeSentence,
      targetComparison: targetComparisonSentence,
    }
  }

  // ── Partial target eligibility: separate sentence so denominator is truthful ──
  const acrossClause = `Across ${targetEligibleDays} ${eligibleDayWord} with a configured target`

  if (withinTolerance) {
    targetComparisonSentence = `${acrossClause}, average intake was within the configured tolerance.`
  } else {
    targetComparisonSentence = `${acrossClause}, average intake was ${formatKcal(absDelta)} kcal ${direction} the average configured target.`
  }

  return {
    coverage: intakeSentence,
    targetComparison: targetComparisonSentence,
  }
}

/**
 * Renders the observation parts into a single readable string for display.
 * The React component should use this or render the parts individually.
 */
export function renderPatternObservation(obs: PatternObservation): string {
  const parts: string[] = [obs.coverage]
  if (obs.intake) parts.push(obs.intake)
  if (obs.targetComparison) parts.push(obs.targetComparison)
  if (obs.targetEligibilityNote) parts.push(obs.targetEligibilityNote)
  return parts.join(" ")
}
