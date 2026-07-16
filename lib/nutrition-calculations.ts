/**
 * Pure nutrition calculation functions — no server imports, no AI calls.
 * All logic is deterministic TypeScript math.
 */
import type {
  NutritionTotals,
  ResolvedNutritionGoal,
  DailyNutritionStatus,
  DailyNutritionSummary,
} from "./nutrition-types"

// ── Types for DB rows (minimal shape needed for calculations) ────────────────

export type DbSettings = {
  maintenanceKcal: number | null
  targetKcal: number | null
  proteinTargetG: string | number | null
  carbsTargetG: string | number | null
  fatTargetG: string | number | null
  targetToleranceKcal: number | null
}

export type DbOverride = {
  maintenanceKcal: number | null
  targetKcal: number | null
  proteinTargetG: string | number | null
  carbsTargetG: string | number | null
  fatTargetG: string | number | null
}

export type DbMealItem = {
  kcal: string | number | null
  proteinG: string | number | null
  carbsG: string | number | null
  fatG: string | number | null
  notes: string | null
}

// ── Core helpers ─────────────────────────────────────────────────────────────

/** Safely parse Drizzle numeric strings to number. Returns 0 on null/NaN. */
export function numericToNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  if (typeof val === "number") return Number.isFinite(val) ? val : 0
  const parsed = parseFloat(val)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Sum macros across multiple meal items */
export function sumTotals(
  items: Array<{
    kcal: string | number | null
    proteinG: string | number | null
    carbsG: string | number | null
    fatG: string | number | null
  }>
): NutritionTotals {
  let kcal = 0
  let proteinG = 0
  let carbsG = 0
  let fatG = 0

  for (const item of items) {
    kcal += numericToNumber(item.kcal)
    proteinG += numericToNumber(item.proteinG)
    carbsG += numericToNumber(item.carbsG)
    fatG += numericToNumber(item.fatG)
  }

  return {
    kcal: Math.round(kcal),
    proteinG: Math.round(proteinG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    itemCount: items.length,
  }
}

/** Resolve nutrition goal for a date — override takes precedence over defaults */
export function resolveGoal(
  date: string,
  settings: DbSettings | null,
  override: DbOverride | null
): ResolvedNutritionGoal {
  // Check if we have any configured values at all
  const hasSettings =
    settings !== null &&
    (settings.maintenanceKcal !== null || settings.targetKcal !== null)

  if (!hasSettings && !override) {
    return {
      date,
      maintenanceKcal: null,
      targetKcal: null,
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
      toleranceKcal: null,
      source: "unconfigured",
    }
  }

  if (override) {
    const targetKcal =
      override.targetKcal ?? settings?.targetKcal ?? null
    const maintenanceKcal =
      override.maintenanceKcal ?? settings?.maintenanceKcal ?? null
    const toleranceKcal = computeTolerance(targetKcal, settings)
    return {
      date,
      maintenanceKcal,
      targetKcal,
      proteinTargetG:
        override.proteinTargetG !== null
          ? numericToNumber(override.proteinTargetG)
          : settings?.proteinTargetG !== null
          ? numericToNumber(settings?.proteinTargetG)
          : null,
      carbsTargetG:
        override.carbsTargetG !== null
          ? numericToNumber(override.carbsTargetG)
          : settings?.carbsTargetG !== null
          ? numericToNumber(settings?.carbsTargetG)
          : null,
      fatTargetG:
        override.fatTargetG !== null
          ? numericToNumber(override.fatTargetG)
          : settings?.fatTargetG !== null
          ? numericToNumber(settings?.fatTargetG)
          : null,
      toleranceKcal,
      source: "override",
    }
  }

  // Use default settings
  const targetKcal = settings!.targetKcal ?? null
  const maintenanceKcal = settings!.maintenanceKcal ?? null
  const toleranceKcal = computeTolerance(targetKcal, settings)
  return {
    date,
    maintenanceKcal,
    targetKcal,
    proteinTargetG:
      settings!.proteinTargetG !== null
        ? numericToNumber(settings!.proteinTargetG)
        : null,
    carbsTargetG:
      settings!.carbsTargetG !== null
        ? numericToNumber(settings!.carbsTargetG)
        : null,
    fatTargetG:
      settings!.fatTargetG !== null
        ? numericToNumber(settings!.fatTargetG)
        : null,
    toleranceKcal,
    source: "default",
  }
}

function computeTolerance(
  targetKcal: number | null,
  settings: DbSettings | null
): number | null {
  if (settings?.targetToleranceKcal !== null && settings?.targetToleranceKcal !== undefined) {
    return settings.targetToleranceKcal
  }
  if (targetKcal === null) return null
  return Math.max(100, Math.round(targetKcal * 0.05))
}

/**
 * Determine daily nutrition status.
 *
 * Rules (exact):
 * - No meals → 'no-data', NEVER 'under'
 * - Meals + no target → 'unconfigured'
 * - 'within' when abs(targetDelta) <= tolerance
 * - 'under' when targetDelta < -tolerance  (intake well below target)
 * - 'over'  when targetDelta >  tolerance
 */
export function computeStatus(
  totals: NutritionTotals | null,
  goal: ResolvedNutritionGoal
): DailyNutritionStatus {
  if (!totals || totals.itemCount === 0) return "no-data"
  if (goal.targetKcal === null) return "unconfigured"

  const delta = totals.kcal - goal.targetKcal
  const tolerance = goal.toleranceKcal ?? Math.max(100, Math.round(goal.targetKcal * 0.05))

  if (Math.abs(delta) <= tolerance) return "within"
  if (delta < -tolerance) return "under"
  return "over"
}

export function computeRemaining(
  totals: NutritionTotals | null,
  goal: ResolvedNutritionGoal
): {
  remainingToTarget: number | null
  targetDelta: number | null
  maintenanceBalance: number | null
} {
  if (!totals || totals.itemCount === 0) {
    return {
      remainingToTarget: goal.targetKcal !== null ? goal.targetKcal : null,
      targetDelta: null,
      maintenanceBalance: null,
    }
  }

  const targetDelta =
    goal.targetKcal !== null ? totals.kcal - goal.targetKcal : null

  const remainingToTarget =
    goal.targetKcal !== null
      ? Math.max(0, goal.targetKcal - totals.kcal)
      : null

  const maintenanceBalance =
    goal.maintenanceKcal !== null ? totals.kcal - goal.maintenanceKcal : null

  return { remainingToTarget, targetDelta, maintenanceBalance }
}

/** Compute a full DailyNutritionSummary from raw DB rows */
export function computeDailySummary(
  date: string,
  items: DbMealItem[],
  settings: DbSettings | null,
  override: DbOverride | null
): DailyNutritionSummary {
  const goal = resolveGoal(date, settings, override)
  const totals = items.length > 0 ? sumTotals(items) : null
  const status = computeStatus(totals, goal)
  const { remainingToTarget, targetDelta, maintenanceBalance } =
    computeRemaining(totals, goal)

  const assumptionCount = items.filter(
    (it) =>
      it.notes !== null &&
      it.notes.length > 0 &&
      /assumed|approx|portion/i.test(it.notes)
  ).length

  return {
    date,
    totals,
    goal,
    remainingToTarget,
    targetDelta,
    maintenanceBalance,
    status,
    mealCount: items.length,
    assumptionCount,
  }
}

/** Compute average kcal across logged days in a window */
export function computeWeeklyAverage(days: DailyNutritionSummary[]): {
  avgKcal: number | null
  loggedDays: number
  rangeDays: number
  coveragePercent: number
} {
  const rangeDays = days.length
  const loggedDays = days.filter((d) => d.totals !== null).length
  if (loggedDays === 0) {
    return { avgKcal: null, loggedDays: 0, rangeDays, coveragePercent: 0 }
  }
  const totalKcal = days.reduce(
    (sum, d) => sum + (d.totals?.kcal ?? 0),
    0
  )
  const coveragePercent =
    rangeDays > 0 ? Math.round((loggedDays / rangeDays) * 100) : 0
  return {
    avgKcal: Math.round(totalKcal / loggedDays),
    loggedDays,
    rangeDays,
    coveragePercent,
  }
}

/** Generate up to 3 deterministic insights from a daily summary — no AI */
export function computeInsights(summary: DailyNutritionSummary): string[] {
  const insights: string[] = []

  if (!summary.totals) return insights

  const { totals, goal, targetDelta, maintenanceBalance, assumptionCount } =
    summary

  // Insight 1: Calorie status vs target
  if (goal.targetKcal !== null && targetDelta !== null) {
    const abs = Math.abs(targetDelta)
    if (summary.status === "over") {
      insights.push(
        `You're ${abs} kcal over your ${goal.targetKcal} kcal target today.`
      )
    } else if (summary.status === "under") {
      insights.push(
        `You're ${abs} kcal under your ${goal.targetKcal} kcal target — consider a small meal or snack.`
      )
    } else {
      insights.push(
        `You're within your ${goal.targetKcal} kcal target — great consistency!`
      )
    }
  }

  // Insight 2: Protein status
  if (goal.proteinTargetG !== null && totals.proteinG > 0) {
    const proteinDelta = totals.proteinG - goal.proteinTargetG
    if (proteinDelta < -20) {
      insights.push(
        `Protein is ${Math.abs(Math.round(proteinDelta))}g short of your ${goal.proteinTargetG}g target. Add a protein-rich food.`
      )
    } else if (proteinDelta >= 0) {
      insights.push(
        `Good protein day — ${totals.proteinG}g logged vs ${goal.proteinTargetG}g target.`
      )
    }
  }

  // Insight 3: Maintenance balance
  if (
    insights.length < 3 &&
    maintenanceBalance !== null &&
    goal.maintenanceKcal !== null
  ) {
    if (maintenanceBalance > 0) {
      insights.push(
        `You're ${maintenanceBalance} kcal above maintenance (${goal.maintenanceKcal} kcal) — a slight surplus today.`
      )
    } else if (maintenanceBalance < -50) {
      insights.push(
        `You're ${Math.abs(maintenanceBalance)} kcal below maintenance — a deficit today.`
      )
    }
  }

  // Insight 3 fallback: assumptions
  if (insights.length < 3 && assumptionCount > 0) {
    insights.push(
      `${assumptionCount} item${assumptionCount > 1 ? "s" : ""} had estimated portions — review if accuracy matters.`
    )
  }

  return insights.slice(0, 3)
}
