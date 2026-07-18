import { SCENE_VERSION, LANE_A_Y, LANE_B_Y, VIEWBOX } from "./constants"
import { resolveMinutes, computeDimensions, computeMacroShares, generateContourPath, type PrePlacedMeal } from "./geometry"
import { generateSeededPRNG, fnv1a } from "./seed"
import { generateAccessibleSummary } from "./summary"
import type { DayImprintInput, DayImprintScene, ImprintMealShape, ImprintAggregateShape, ImprintShape, ImprintTimeTick } from "./types"

export function buildScene(input: DayImprintInput): DayImprintScene {
  const date = input.date
  const totals = input.totals
  const target = input.target

  // ── 1. Empty: no meals logged, no totals ──────────────────────────────────
  if (input.meals.length === 0 && totals === null) {
    return {
      version: SCENE_VERSION,
      viewBox: VIEWBOX,
      date,
      state: "empty",
      timeTicks: generateTimeTicks(),
      shapes: [],
      totalLine: {
        consumed: 0,
        target: target.targetKcal,
        maintenance: target.maintenanceKcal,
      },
      accessibleSummary: "No meals logged for this day.",
      suppressTimeAxis: true,
    }
  }

  // ── 2. Aggregate: totals known but no meal-level data ─────────────────────
  //    Produces a single centered shape with no time position claim.
  //    suppressTimeAxis = true so no 06:00/12:00/18:00 axis is drawn.
  if (input.meals.length === 0 && totals !== null) {
    const { width, height } = computeDimensions(totals.kcal, target.targetKcal, target.maintenanceKcal)
    const { proteinShare, carbShare, fatShare } = computeMacroShares(totals.proteinG, totals.carbsG, totals.fatG)
    const centerX = 500 // horizontal midpoint of 1000-unit viewBox
    const centerY = (LANE_A_Y + LANE_B_Y) / 2 // vertical midpoint between lanes

    const contourCount = Math.min(Math.max(3, 3 + Math.round(proteinShare * 5)), 8)
    const contours: string[] = []
    const prng = generateSeededPRNG(SCENE_VERSION, date, "aggregate", totals.kcal, totals.itemCount)
    for (let j = 0; j < contourCount; j++) {
      const scale = contourCount > 1 ? 1.0 - (1.0 - 0.28) * (j / (contourCount - 1)) : 1.0
      contours.push(generateContourPath(centerX, centerY, width, height, scale, carbShare, prng))
    }

    const aggregateShape: ImprintAggregateShape = {
      kind: "aggregate",
      kcal: totals.kcal,
      centerX,
      centerY,
      width,
      height,
      contours,
      proteinShare,
      carbShare,
      fatShare,
      itemCount: totals.itemCount,
    }

    const consumed = totals.kcal
    const state = target.targetKcal === null
      ? "partial"
      : consumed > target.targetKcal ? "over-target" : "targeted"

    const scene: DayImprintScene = {
      version: SCENE_VERSION,
      viewBox: VIEWBOX,
      date,
      state,
      timeTicks: [],
      shapes: [aggregateShape],
      totalLine: {
        consumed,
        target: target.targetKcal,
        maintenance: target.maintenanceKcal,
      },
      accessibleSummary: "",
      suppressTimeAxis: true,
    }
    scene.accessibleSummary = generateAccessibleSummary(scene, input)
    return scene
  }

  // ── 3. Full scene: meal-level data available ──────────────────────────────

  // 3a. Pre-resolve visual minutes & offsets to handle collision
  const resolvedMinutesArray = resolveMinutes(input.meals)
  let prePlacedMeals: PrePlacedMeal[] = input.meals.map((m, i) => {
    const { width, height } = computeDimensions(m.kcal, target.targetKcal, target.maintenanceKcal)
    return {
      ...m,
      resolvedMinute: resolvedMinutesArray[i],
      width,
      height,
    }
  })

  // Sort by resolved visual minutes, then stable ID
  prePlacedMeals.sort((a, b) => {
    if (a.resolvedMinute !== b.resolvedMinute) return a.resolvedMinute - b.resolvedMinute
    return a.id.localeCompare(b.id)
  })

  // If there are more than 8 meals, group excess into "Additional" shape
  if (prePlacedMeals.length > 8) {
    const primaryMeals = prePlacedMeals.slice(0, 7)
    const excessMeals = prePlacedMeals.slice(7)
    const totalExcessKcal = excessMeals.reduce((sum, m) => sum + m.kcal, 0)
    const totalExcessProtein = excessMeals.reduce((sum, m) => sum + m.proteinG, 0)
    const totalExcessCarbs = excessMeals.reduce((sum, m) => sum + m.carbsG, 0)
    const totalExcessFat = excessMeals.reduce((sum, m) => sum + m.fatG, 0)
    const totalExcessItems = excessMeals.reduce((sum, m) => sum + m.itemCount, 0)
    const avgMinute = Math.round(excessMeals.reduce((sum, m) => sum + m.resolvedMinute, 0) / excessMeals.length)

    const { width, height } = computeDimensions(totalExcessKcal, target.targetKcal, target.maintenanceKcal)

    primaryMeals.push({
      id: "excess-additional",
      mealType: "Additional",
      localTime: null,
      createdAt: excessMeals[0].createdAt,
      kcal: totalExcessKcal,
      proteinG: totalExcessProtein,
      carbsG: totalExcessCarbs,
      fatG: totalExcessFat,
      itemCount: totalExcessItems,
      resolvedMinute: avgMinute,
      width,
      height,
    })
    prePlacedMeals = primaryMeals
  }

  // 3b. Assign lanes and compute coordinates/shapes
  const mealShapes: ImprintMealShape[] = []
  const placedLanes: { A: PrePlacedMeal[]; B: PrePlacedMeal[] } = { A: [], B: [] }

  prePlacedMeals.forEach((meal) => {
    const centerX = 60 + (meal.resolvedMinute / 1440) * 880

    // Compute overlap scores for Lane A vs Lane B
    const computeOverlap = (laneMeals: PrePlacedMeal[]) => {
      let score = 0
      laneMeals.forEach((lm) => {
        const lmX = 60 + (lm.resolvedMinute / 1440) * 880
        const minDistance = (meal.width + lm.width) / 2
        const actualDistance = Math.abs(centerX - lmX)
        if (actualDistance < minDistance) {
          score += minDistance - actualDistance
        }
      })
      return score
    }

    const overlapA = computeOverlap(placedLanes.A)
    const overlapB = computeOverlap(placedLanes.B)

    let lane: "A" | "B" = "A"
    if (overlapA > overlapB) {
      lane = "B"
    } else if (overlapA < overlapB) {
      lane = "A"
    } else {
      // Tie-breaker using stable seed parity
      const seed = fnv1a(meal.id)
      lane = seed % 2 === 0 ? "A" : "B"
    }

    placedLanes[lane].push(meal)

    const centerY = lane === "A" ? LANE_A_Y : LANE_B_Y
    const { proteinShare, carbShare, fatShare } = computeMacroShares(meal.proteinG, meal.carbsG, meal.fatG)

    // Generate contours count (3 to 8)
    const contourCount = Math.min(Math.max(3, 3 + Math.round(proteinShare * 5)), 8)
    const contours: string[] = []
    const prng = generateSeededPRNG(SCENE_VERSION, date, meal.id, meal.kcal, meal.itemCount)

    for (let j = 0; j < contourCount; j++) {
      const scale = contourCount > 1 ? 1.0 - (1.0 - 0.28) * (j / (contourCount - 1)) : 1.0
      contours.push(generateContourPath(centerX, centerY, meal.width, meal.height, scale, carbShare, prng))
    }

    mealShapes.push({
      kind: "meal",
      id: meal.id,
      mealType: meal.mealType,
      localTime: meal.localTime,
      kcal: meal.kcal,
      centerX,
      centerY,
      width: meal.width,
      height: meal.height,
      lane,
      contours,
      proteinShare,
      carbShare,
      fatShare,
      itemCount: meal.itemCount,
    })
  })

  // 3c. Resolve scene state
  let state: "empty" | "partial" | "targeted" | "over-target" = "partial"
  const consumed = totals?.kcal || 0
  const targetKcal = target.targetKcal

  if (targetKcal === null) {
    state = "partial"
  } else if (consumed > targetKcal) {
    state = "over-target"
  } else {
    state = "targeted"
  }

  const shapes: ImprintShape[] = mealShapes

  // 3d. Build full scene DTO
  const scene: DayImprintScene = {
    version: SCENE_VERSION,
    viewBox: VIEWBOX,
    date,
    state,
    timeTicks: generateTimeTicks(),
    shapes,
    totalLine: {
      consumed,
      target: targetKcal,
      maintenance: target.maintenanceKcal,
    },
    accessibleSummary: "",
    suppressTimeAxis: false,
  }

  scene.accessibleSummary = generateAccessibleSummary(scene, input)
  return scene
}

function generateTimeTicks(): ImprintTimeTick[] {
  return [
    { minute: 360, x: 60 + (360 / 1440) * 880, label: "06:00" },
    { minute: 720, x: 60 + (720 / 1440) * 880, label: "12:00" },
    { minute: 1080, x: 60 + (1080 / 1440) * 880, label: "18:00" },
  ]
}
