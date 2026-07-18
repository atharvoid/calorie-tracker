"use client"

import { useEffect, useState } from "react"
import type { DailyNutritionSummary, MealGroupDTO } from "@/lib/nutrition-types"
import { normalizeInput } from "@/lib/imprint/normalize"
import { buildScene } from "@/lib/imprint/scene"
import { DayImprintStatic } from "./day-imprint-static"
import { DayImprintAnimated } from "./day-imprint-animated"
import { ImprintEmpty } from "./imprint-empty"
import { ImprintErrorBoundary } from "./imprint-error-boundary"

interface DayImprintProps {
  summary: DailyNutritionSummary
  mealGroups: MealGroupDTO[]
  highlightedMealId?: string | null
  onMealClick?: (mealId: string) => void
  onLogMeal?: () => void
}

export function DayImprint({
  summary,
  mealGroups,
  highlightedMealId,
  onMealClick,
  onLogMeal,
}: DayImprintProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  const input = normalizeInput(summary, mealGroups)
  const scene = buildScene(input)

  if (scene.state === "empty") {
    return <ImprintEmpty onLogMeal={onLogMeal} />
  }

  return (
    <ImprintErrorBoundary fallbackText={scene.accessibleSummary}>
      {reducedMotion ? (
        <DayImprintStatic
          scene={scene}
          highlightedMealId={highlightedMealId}
          onMealClick={onMealClick}
        />
      ) : (
        <DayImprintAnimated
          scene={scene}
          highlightedMealId={highlightedMealId}
          onMealClick={onMealClick}
        />
      )}
    </ImprintErrorBoundary>
  )
}
