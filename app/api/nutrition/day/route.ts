import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getSettings,
  getDayOverride,
  getMealItemsForDate,
} from "@/lib/nutrition-queries"
import {
  computeDailySummary,
  computeInsights,
  numericToNumber,
} from "@/lib/nutrition-calculations"
import type { MealGroupDTO, MealItemDTO } from "@/lib/nutrition-types"

export const runtime = "nodejs"

type ErrorBody = {
  error: { code: string; message: string }
}

function errResponse(
  code: string,
  message: string,
  status: number
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

  const date = req.nextUrl.searchParams.get("date")
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errResponse("INVALID_DATE", "date param must be YYYY-MM-DD", 400)
  }

  const userId = session.user.id

  // Fetch all data in parallel (3 independent queries)
  const [items, settings, override] = await Promise.all([
    getMealItemsForDate(userId, date),
    getSettings(userId),
    getDayOverride(userId, date),
  ])

  // Compute summary
  const summary = computeDailySummary(date, items, settings, override)
  const insights = computeInsights(summary)

  // Build meal groups
  const groupMap = new Map<string, (typeof items)[number][]>()
  for (const item of items) {
    const key = item.mealType ?? "Other"
    const existing = groupMap.get(key)
    if (existing) {
      existing.push(item)
    } else {
      groupMap.set(key, [item])
    }
  }

  const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"]
  const mealGroups: MealGroupDTO[] = []

  // Ensure meal order is consistent
  const sortedKeys = [...groupMap.keys()].sort(
    (a, b) =>
      (MEAL_ORDER.indexOf(a) === -1 ? 99 : MEAL_ORDER.indexOf(a)) -
      (MEAL_ORDER.indexOf(b) === -1 ? 99 : MEAL_ORDER.indexOf(b))
  )

  for (const key of sortedKeys) {
    const groupItems = groupMap.get(key) ?? []
    const firstItem = items.find((it) => (it.mealType ?? "Other") === key)

    const dtos: MealItemDTO[] = groupItems.map((it) => ({
      id: it.id,
      name: it.name,
      grams: it.grams !== null ? numericToNumber(it.grams) : null,
      kcal: numericToNumber(it.kcal),
      proteinG: numericToNumber(it.proteinG),
      carbsG: numericToNumber(it.carbsG),
      fatG: numericToNumber(it.fatG),
      notes: it.notes,
      source: it.source,
      createdAt: it.createdAt.toISOString(),
    }))

    const subtotalKcal = dtos.reduce((s, it) => s + it.kcal, 0)
    const subtotalProtein = dtos.reduce((s, it) => s + it.proteinG, 0)
    const subtotalCarbs = dtos.reduce((s, it) => s + it.carbsG, 0)
    const subtotalFat = dtos.reduce((s, it) => s + it.fatG, 0)

    mealGroups.push({
      mealType: firstItem?.mealType ?? null,
      timeHint: firstItem?.timeHint ?? null,
      items: dtos,
      subtotal: {
        kcal: Math.round(subtotalKcal),
        proteinG: Math.round(subtotalProtein * 10) / 10,
        carbsG: Math.round(subtotalCarbs * 10) / 10,
        fatG: Math.round(subtotalFat * 10) / 10,
        itemCount: dtos.length,
      },
    })
  }

  return NextResponse.json({ summary, mealGroups, insights })
}
