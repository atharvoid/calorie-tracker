// Nutrition domain types — pure data shapes, no server imports

export type NutritionTotals = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  itemCount: number
}

export type ResolvedNutritionGoal = {
  date: string
  maintenanceKcal: number | null
  targetKcal: number | null
  proteinTargetG: number | null
  carbsTargetG: number | null
  fatTargetG: number | null
  toleranceKcal: number | null
  source: "override" | "default" | "unconfigured"
}

export type DailyNutritionStatus =
  | "no-data"
  | "unconfigured"
  | "under"
  | "within"
  | "over"

export type DailyNutritionSummary = {
  date: string
  totals: NutritionTotals | null
  goal: ResolvedNutritionGoal
  remainingToTarget: number | null
  targetDelta: number | null
  maintenanceBalance: number | null
  status: DailyNutritionStatus
  mealCount: number
  assumptionCount: number
}

export type MealItemDTO = {
  id: string
  name: string
  grams: number | null
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  notes: string | null
  source: string
  createdAt: string
}

export type MealGroupDTO = {
  mealType: string | null
  timeHint: string | null
  items: MealItemDTO[]
  subtotal: NutritionTotals
}
