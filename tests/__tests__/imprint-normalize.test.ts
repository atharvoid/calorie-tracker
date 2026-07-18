import { describe, expect, it } from "vitest"
import { normalizeInput } from "../../lib/imprint/normalize"
import type { DailyNutritionSummary, MealGroupDTO } from "../../lib/nutrition-types"

describe("imprint-normalize", () => {
  const mockSummary: DailyNutritionSummary = {
    date: "2026-07-18",
    totals: { kcal: 1850, proteinG: 135, carbsG: 195, fatG: 52, itemCount: 9 },
    goal: {
      date: "2026-07-18",
      targetKcal: 2000,
      maintenanceKcal: 2500,
      proteinTargetG: 140,
      carbsTargetG: 220,
      fatTargetG: 65,
      toleranceKcal: null,
      source: "default",
    },
    remainingToTarget: 150,
    targetDelta: -150,
    maintenanceBalance: -650,
    status: "under",
    mealCount: 4,
    assumptionCount: 0,
  }

  const mockMealGroups: MealGroupDTO[] = [
    {
      mealType: "Breakfast",
      timeHint: "9:00 AM",
      items: [
        {
          id: "item-1",
          name: "Eggs",
          grams: 100,
          kcal: 140,
          proteinG: 12,
          carbsG: 1,
          fatG: 10,
          notes: null,
          source: "web",
          createdAt: "2026-07-18T09:00:00Z",
        },
      ],
      subtotal: { kcal: 140, proteinG: 12, carbsG: 1, fatG: 10, itemCount: 1 },
    },
  ]

  it("successfully adapts DTOs to imprint input shape", () => {
    const input = normalizeInput(mockSummary, mockMealGroups)
    expect(input.date).toBe("2026-07-18")
    expect(input.totals?.kcal).toBe(1850)
    expect(input.target.targetKcal).toBe(2000)
    expect(input.meals).toHaveLength(1)
    expect(input.meals[0].localTime).toBe("09:00")
    expect(input.meals[0].mealType).toBe("Breakfast")
  })

  it("handles PM times and 12 AM/PM correctly", () => {
    const pmGroups: MealGroupDTO[] = [
      {
        mealType: "Dinner",
        timeHint: "8:30 PM",
        items: [],
        subtotal: { kcal: 500, proteinG: 30, carbsG: 40, fatG: 20, itemCount: 2 },
      },
      {
        mealType: "Lunch",
        timeHint: "12:00 PM",
        items: [],
        subtotal: { kcal: 600, proteinG: 40, carbsG: 50, fatG: 15, itemCount: 2 },
      },
    ]

    const input = normalizeInput(mockSummary, pmGroups)
    expect(input.meals[0].localTime).toBe("20:30")
    expect(input.meals[1].localTime).toBe("12:00")
  })
})
