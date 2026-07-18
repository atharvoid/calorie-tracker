import { SAFE, LANE_A_Y, LANE_B_Y, FALLBACK_MINUTES, COLLISION_OFFSET_MINUTES } from "./constants"
import { generateSeededPRNG } from "./seed"

export interface PrePlacedMeal {
  id: string
  mealType: string | null
  localTime: string | null
  createdAt: string
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  itemCount: number
  resolvedMinute: number
  width: number
  height: number
}

// Map time or meal category to local minutes
export function resolveMinutes(meals: Array<{ mealType: string | null; localTime: string | null }>): number[] {
  const result: number[] = []
  const counts: Record<number, number> = {}

  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i]
    let minute = 720 // default Other 12:00

    if (meal.localTime) {
      const parts = meal.localTime.split(":")
      if (parts.length === 2) {
        minute = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
      }
    } else if (meal.mealType && FALLBACK_MINUTES[meal.mealType] !== undefined) {
      minute = FALLBACK_MINUTES[meal.mealType]
    }

    counts[minute] = (counts[minute] || 0) + 1
    result.push(minute)
  }

  // Handle duplicate minutes offset by COLLISION_OFFSET_MINUTES
  const tracked: Record<number, number> = {}
  return result.map((min) => {
    const count = tracked[min] || 0
    tracked[min] = count + 1
    if (count > 0) {
      // Offset alternate occurrences: +18, -18, +36, -36...
      const multiplier = Math.ceil(count / 2)
      const sign = count % 2 === 1 ? 1 : -1
      let offsetMin = min + sign * multiplier * COLLISION_OFFSET_MINUTES
      // Clamp to daily minutes [0, 1440]
      if (offsetMin < 0) offsetMin = 0
      if (offsetMin > 1440) offsetMin = 1440
      return offsetMin
    }
    return min
  })
}

export function computeDimensions(
  kcal: number,
  targetKcal: number | null,
  maintenanceKcal: number | null
): { width: number; height: number } {
  const referenceKcal = targetKcal ?? maintenanceKcal ?? 2000
  const mealRatio = Math.min(Math.max(kcal / Math.max(referenceKcal, 1), 0), 0.75)
  const width = Math.min(Math.max(72, 72 + 230 * Math.sqrt(mealRatio)), 250)
  const height = Math.min(Math.max(52, 52 + 120 * Math.sqrt(mealRatio)), 150)
  return { width, height }
}

export function computeMacroShares(
  proteinG: number,
  carbsG: number,
  fatG: number
): { proteinShare: number; carbShare: number; fatShare: number } {
  const proteinEnergy = proteinG * 4
  const carbEnergy = carbsG * 4
  const fatEnergy = fatG * 9
  const macroEnergy = Math.max(proteinEnergy + carbEnergy + fatEnergy, 1)

  return {
    proteinShare: proteinEnergy / macroEnergy,
    carbShare: carbEnergy / macroEnergy,
    fatShare: fatEnergy / macroEnergy,
  }
}

// Generate ellipse points and formats as smooth SVG path string
export function generateContourPath(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  scale: number,
  carbShare: number,
  prng: () => number,
  pointCount = 36
): string {
  const points: { x: number; y: number }[] = []
  const carbSkew = (carbShare - 0.33) * 42

  const phaseA = prng() * Math.PI * 2
  const phaseB = prng() * Math.PI * 2

  for (let i = 0; i < pointCount; i++) {
    const theta = (i * Math.PI * 2) / pointCount
    const jitter = (prng() - 0.5) * 0.036 // [-0.018, 0.018]
    const baseNoise = 1 + 0.055 * Math.sin(3 * theta + phaseA) + 0.035 * Math.sin(5 * theta + phaseB) + jitter

    let x = centerX + Math.cos(theta) * (width / 2) * scale * baseNoise + carbSkew * Math.pow(Math.sin(theta), 2) * scale
    let y = centerY + Math.sin(theta) * (height / 2) * scale * baseNoise

    // Hard bounds clamping to safe areas (0 to 1000 viewport)
    x = Math.min(Math.max(SAFE.left + 5, x), 1000 - SAFE.right - 5)
    y = Math.min(Math.max(SAFE.top + 5, y), 520 - SAFE.bottom - 5)

    points.push({ x, y })
  }

  // Smooth SVG path generation using Catmull-Rom or basic bezier curves
  // To keep path strings simple and highly performant, we do standard cubic bezier connection
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    // midpoint
    const mx = (p1.x + p2.x) / 2
    const my = (p1.y + p2.y) / 2
    path += ` Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${mx.toFixed(1)} ${my.toFixed(1)}`
  }
  path += " Z"
  return path
}
