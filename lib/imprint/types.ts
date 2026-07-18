// ── Input ──────────────────────────────────────────────────────────────────

export type DayImprintInput = {
  date: string
  timezone: string
  totals: {
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
    itemCount: number
  } | null
  target: {
    targetKcal: number | null
    maintenanceKcal: number | null
    proteinTargetG: number | null
    carbsTargetG: number | null
    fatTargetG: number | null
  }
  meals: Array<{
    id: string
    mealType: string | null
    localTime: string | null
    createdAt: string
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
    itemCount: number
  }>
}

// ── Output shapes ──────────────────────────────────────────────────────────

/**
 * A meal-derived shape. All fields originate from a real logged meal.
 * May be interactive (clickable to jump to meal in timeline).
 */
export type ImprintMealShape = {
  kind: "meal"
  id: string
  mealType: string | null
  localTime: string | null
  kcal: number
  centerX: number
  centerY: number
  width: number
  height: number
  lane: "A" | "B"
  contours: string[] // SVG paths
  proteinShare: number
  carbShare: number
  fatShare: number
  itemCount: number
}

/**
 * A daily-totals-derived aggregate shape.
 * Used when meal-level timing is not available (e.g. history summary rows).
 * Must NOT be given a fake meal ID, meal type, or time position.
 * Must NOT be rendered as an interactive meal link.
 * Time axis is suppressed when this shape is present without meal shapes.
 */
export type ImprintAggregateShape = {
  kind: "aggregate"
  kcal: number
  centerX: number
  centerY: number
  width: number
  height: number
  contours: string[] // SVG paths
  proteinShare: number
  carbShare: number
  fatShare: number
  itemCount: number
}

/** Discriminated union of all possible rendered shapes */
export type ImprintShape = ImprintMealShape | ImprintAggregateShape

export type ImprintTimeTick = {
  minute: number
  x: number
  label: string
}

export type DayImprintScene = {
  version: number
  viewBox: string
  date: string
  state: "empty" | "partial" | "targeted" | "over-target"
  timeTicks: ImprintTimeTick[]
  /**
   * Shape array uses the discriminated ImprintShape union.
   * Renderers must check `shape.kind` before accessing meal-specific fields.
   */
  shapes: ImprintShape[]
  totalLine: {
    consumed: number
    target: number | null
    maintenance: number | null
  }
  /** Accessible description rendered as aria-label on the SVG root */
  accessibleSummary: string
  /** True when the time axis should be suppressed (aggregate-only scene) */
  suppressTimeAxis: boolean
}
