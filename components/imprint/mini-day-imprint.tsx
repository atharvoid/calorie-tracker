"use client"

import type { DailyNutritionSummary, MealGroupDTO } from "@/lib/nutrition-types"
import { normalizeInput } from "@/lib/imprint/normalize"
import { buildScene } from "@/lib/imprint/scene"
import { VIEWBOX, SAFE } from "@/lib/imprint/constants"

interface MiniDayImprintProps {
  summary: DailyNutritionSummary
  mealGroups: MealGroupDTO[]
  width?: number
  height?: number
}

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "var(--action-accent, #10B981)",
  Lunch: "var(--action-accent, #10B981)",
  Dinner: "var(--action-accent, #10B981)",
  Snack: "var(--action-accent, #10B981)",
  Other: "var(--action-accent, #10B981)",
  Additional: "var(--action-accent, #10B981)",
}

export function MiniDayImprint({ summary, mealGroups, width = 60, height = 32 }: MiniDayImprintProps) {
  const input = normalizeInput(summary, mealGroups)
  const scene = buildScene(input)

  if (scene.state === "empty") {
    return (
      <div
        className="border border-subtle bg-elevated/20 rounded flex items-center justify-center"
        style={{ width, height }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted/40" />
      </div>
    )
  }

  return (
    <svg
      viewBox={VIEWBOX}
      style={{ width, height }}
      className="border border-subtle bg-surface rounded select-none shrink-0"
      aria-label={scene.accessibleSummary}
      role="img"
    >
      {/* Mini timeline line */}
      <line
        x1={SAFE.left}
        y1={520 - SAFE.bottom}
        x2={1000 - SAFE.right}
        y2={520 - SAFE.bottom}
        stroke="var(--border-subtle)"
        strokeWidth="2.5"
      />

      {/* Simplified shapes - outer 2 contours only, no labels, no ticks */}
      {scene.shapes.map((shape, idx) => {
        const color = shape.kind === "meal"
          ? (MEAL_COLORS[shape.mealType || "Other"] || "var(--action-accent, #10B981)")
          : "var(--action-accent, #10B981)"
        const washOpacity = shape.fatShare * 0.12 + 0.04
        const key = shape.kind === "meal" ? shape.id : `aggregate-${idx}`
        // Max 2 contours for mini version to respect node budget
        const contoursToDraw = shape.contours.slice(0, 2)

        return (
          <g key={key}>
            {contoursToDraw.length > 0 && (
              <path d={contoursToDraw[0]} fill={color} fillOpacity={washOpacity} stroke="none" />
            )}
            {contoursToDraw.map((contour, i) => (
              <path
                key={i}
                d={contour}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeOpacity={0.8 - i * 0.2}
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
