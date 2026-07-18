import type { DailyNutritionSummary, MealGroupDTO } from "../nutrition-types"
import type { DayImprintInput } from "./types"

export function normalizeInput(
  summary: DailyNutritionSummary,
  mealGroups: MealGroupDTO[],
  timezone = "Asia/Kolkata"
): DayImprintInput {
  const target = {
    targetKcal: summary.goal.targetKcal,
    maintenanceKcal: summary.goal.maintenanceKcal,
    proteinTargetG: summary.goal.proteinTargetG,
    carbsTargetG: summary.goal.carbsTargetG,
    fatTargetG: summary.goal.fatTargetG,
  }

  const meals = mealGroups.map((group, index) => {
    // Attempt to parse clock times like "09:00", "9:00 AM", "14:30"
    let localTime: string | null = null
    if (group.timeHint) {
      const match = group.timeHint.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (match) {
        let hours = parseInt(match[1], 10)
        const minutes = match[2]
        const ampm = match[3]
        if (ampm) {
          if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12
          if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0
        }
        localTime = `${String(hours).padStart(2, "0")}:${minutes}`
      }
    }

    // Stable ID for the meal group
    const id = `${group.mealType || "Other"}-${index}`

    return {
      id,
      mealType: group.mealType,
      localTime,
      createdAt: group.items[0]?.createdAt || new Date().toISOString(),
      kcal: Math.round(group.subtotal.kcal),
      proteinG: Math.round(group.subtotal.proteinG),
      carbsG: Math.round(group.subtotal.carbsG),
      fatG: Math.round(group.subtotal.fatG),
      itemCount: group.subtotal.itemCount,
    }
  })

  return {
    date: summary.date,
    timezone,
    totals: summary.totals
      ? {
          kcal: Math.round(summary.totals.kcal),
          proteinG: Math.round(summary.totals.proteinG),
          carbsG: Math.round(summary.totals.carbsG),
          fatG: Math.round(summary.totals.fatG),
          itemCount: summary.totals.itemCount,
        }
      : null,
    target,
    meals,
  }
}
