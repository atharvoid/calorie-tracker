import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getSettings,
  getMealItemsForRange,
  getDayOverridesForRange,
} from "@/lib/nutrition-queries"
import {
  computeDailySummary,
  computeWeeklyAverage,
  numericToNumber,
} from "@/lib/nutrition-calculations"
import { dateRange, addDays, localDate } from "@/lib/nutrition-date"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"

export const runtime = "nodejs"

type ErrorBody = { error: { code: string; message: string } }
function errResponse(code: string, message: string, status: number): NextResponse<ErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status })
}

type TopFood = { name: string; totalKcal: number; totalProteinG: number; count: number }
type MealContribution = { mealType: string; kcal: number; pct: number }
type TrendPoint = {
  date: string
  kcal: number | null
  targetKcal: number | null
  maintenanceKcal: number | null
  status: string
}
type MacroPoint = { date: string; proteinG: number | null; carbsG: number | null; fatG: number | null }

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

  const params = req.nextUrl.searchParams
  const rangeParam = params.get("range") ?? "4w"
  const metric = params.get("metric") ?? "kcal"
  const tz = "Asia/Kolkata"
  const today = localDate(tz)

  let start: string
  let end: string

  if (rangeParam === "custom") {
    start = params.get("start") ?? addDays(today, -27)
    end = params.get("end") ?? today
  } else {
    end = today
    switch (rangeParam) {
      case "7d": start = addDays(today, -6); break
      case "4w": start = addDays(today, -27); break
      case "12w": start = addDays(today, -83); break
      case "3m": start = addDays(today, -89); break
      default: start = addDays(today, -27)
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return errResponse("INVALID_DATE", "Dates must be YYYY-MM-DD", 400)
  }

  const dates = dateRange(start, end)
  if (dates.length > 366) {
    return errResponse("RANGE_TOO_LARGE", "Max 366 days", 400)
  }

  const userId = session.user.id
  const [allItems, settings, allOverrides] = await Promise.all([
    getMealItemsForRange(userId, start, end),
    getSettings(userId),
    getDayOverridesForRange(userId, start, end),
  ])

  const itemsByDate = new Map<string, typeof allItems>()
  for (const item of allItems) {
    const arr = itemsByDate.get(item.date)
    if (arr) arr.push(item)
    else itemsByDate.set(item.date, [item])
  }

  const overrideByDate = new Map(allOverrides.map((o) => [o.date, o]))

  const summaries: DailyNutritionSummary[] = dates.map((date) =>
    computeDailySummary(
      date,
      itemsByDate.get(date) ?? [],
      settings,
      overrideByDate.get(date) ?? null
    )
  )

  const weeklyAvg = computeWeeklyAverage(summaries)

  // KPI summary
  const loggedSummaries = summaries.filter((s) => s.totals !== null)
  const avgTarget = settings?.targetKcal ?? null
  const adherentDays = loggedSummaries.filter((s) => s.status === "within").length
  const overDays = loggedSummaries.filter((s) => s.status === "over").length
  const underDays = loggedSummaries.filter((s) => s.status === "under").length

  const adherencePct =
    loggedSummaries.length > 0
      ? Math.round((adherentDays / loggedSummaries.length) * 100)
      : null

  const avgProtein =
    loggedSummaries.length > 0
      ? Math.round(
          loggedSummaries.reduce((s, d) => s + (d.totals?.proteinG ?? 0), 0) /
            loggedSummaries.length
        )
      : null

  const kpi = {
    avgKcal: weeklyAvg.avgKcal,
    avgTarget,
    loggedDays: weeklyAvg.loggedDays,
    rangeDays: weeklyAvg.rangeDays,
    coverageLabel: `${weeklyAvg.loggedDays} of ${weeklyAvg.rangeDays} days logged`,
    adherencePct,
    adherentDays,
    overDays,
    underDays,
    avgProteinG: avgProtein,
  }

  // Trend points for chart
  const trendPoints: TrendPoint[] = summaries.map((s) => ({
    date: s.date,
    kcal: s.totals?.kcal ?? null,
    targetKcal: s.goal.targetKcal,
    maintenanceKcal: s.goal.maintenanceKcal,
    status: s.status,
  }))

  // Macro series
  let macroSeries: (TrendPoint | MacroPoint)[] = []
  if (metric === "kcal") {
    macroSeries = trendPoints
  } else {
    macroSeries = summaries.map((s) => ({
      date: s.date,
      proteinG: s.totals?.proteinG ?? null,
      carbsG: s.totals?.carbsG ?? null,
      fatG: s.totals?.fatG ?? null,
    }))
  }

  // Top foods (name matching: trim+lowercase)
  const foodMap = new Map<string, TopFood>()
  for (const item of allItems) {
    const key = item.name.trim().toLowerCase()
    const existing = foodMap.get(key)
    const kcal = numericToNumber(item.kcal)
    const protein = numericToNumber(item.proteinG)
    if (existing) {
      existing.totalKcal += kcal
      existing.totalProteinG += protein
      existing.count++
    } else {
      foodMap.set(key, {
        name: item.name.trim(),
        totalKcal: kcal,
        totalProteinG: protein,
        count: 1,
      })
    }
  }
  const allFoods = [...foodMap.values()]
  const topByKcal = [...allFoods]
    .sort((a, b) => b.totalKcal - a.totalKcal)
    .slice(0, 10)
  const topByProtein = [...allFoods]
    .sort((a, b) => b.totalProteinG - a.totalProteinG)
    .slice(0, 10)

  // Meal contribution
  const mealContribMap = new Map<string, number>()
  for (const item of allItems) {
    const key = item.mealType ?? "Other"
    mealContribMap.set(key, (mealContribMap.get(key) ?? 0) + numericToNumber(item.kcal))
  }
  const totalContribKcal = [...mealContribMap.values()].reduce((s, v) => s + v, 0)
  const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"]
  const mealContribution: MealContribution[] = [...mealContribMap.entries()]
    .sort(
      (a, b) =>
        (MEAL_ORDER.indexOf(a[0]) === -1 ? 99 : MEAL_ORDER.indexOf(a[0])) -
        (MEAL_ORDER.indexOf(b[0]) === -1 ? 99 : MEAL_ORDER.indexOf(b[0]))
    )
    .map(([mealType, kcal]) => ({
      mealType,
      kcal: Math.round(kcal),
      pct: totalContribKcal > 0 ? Math.round((kcal / totalContribKcal) * 100) : 0,
    }))

  return NextResponse.json({
    kpi,
    trendPoints,
    macroSeries,
    topFoodsByKcal: topByKcal,
    topFoodsByProtein: topByProtein,
    mealContribution,
    start,
    end,
  })
}
