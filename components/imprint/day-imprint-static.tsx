"use client"

import { VIEWBOX, SAFE } from "../../lib/imprint/constants"
import type { DayImprintScene, ImprintShape } from "../../lib/imprint/types"

interface DayImprintStaticProps {
  scene: DayImprintScene
  highlightedMealId?: string | null
  onMealClick?: (mealId: string) => void
}

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "var(--meal-breakfast, #69765B)",
  Lunch: "var(--meal-lunch, #555A8C)",
  Dinner: "var(--meal-dinner, #9B6252)",
  Snack: "var(--meal-snack, #E5673F)",
  Other: "var(--meal-other, #6E6A61)",
  Additional: "var(--meal-other, #6E6A61)",
}

const AGGREGATE_COLOR = "var(--imprint-ink-muted, #6E6A61)"

function renderShape(
  shape: ImprintShape,
  highlightedMealId: string | null | undefined,
  onMealClick: ((id: string) => void) | undefined
) {
  if (shape.kind === "meal") {
    const color = MEAL_COLORS[shape.mealType || "Other"] || "var(--imprint-ink-muted)"
    const isHighlighted = highlightedMealId === shape.id
    const hasHighlightSelection = highlightedMealId !== undefined && highlightedMealId !== null
    const opacity = hasHighlightSelection ? (isHighlighted ? 1.0 : 0.35) : 1.0
    const washOpacity = shape.fatShare * 0.12 + 0.04

    return (
      <g
        key={shape.id}
        onClick={() => onMealClick?.(shape.id)}
        className="cursor-pointer transition-all duration-300"
        style={{ opacity }}
        role="button"
        aria-label={`${shape.mealType ?? "Meal"} — ${shape.kcal} kcal`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onMealClick?.(shape.id) }}
      >
        {shape.contours.length > 0 && (
          <path d={shape.contours[0]} fill={color} fillOpacity={washOpacity} stroke="none" aria-hidden="true" />
        )}
        {shape.contours.map((contour, i) => (
          <path
            key={i}
            d={contour}
            fill="none"
            stroke={color}
            strokeWidth={isHighlighted ? "1.5" : "1"}
            strokeOpacity={0.8 - i * 0.07}
            aria-hidden="true"
          />
        ))}
        <g className="text-muted/60" aria-hidden="true">
          {Array.from({ length: Math.min(shape.itemCount, 8) }).map((_, idx) => {
            const notchX = shape.centerX - 12 + idx * 3.5
            return (
              <line
                key={idx}
                x1={notchX} y1={shape.centerY + shape.height / 2 + 10}
                x2={notchX} y2={shape.centerY + shape.height / 2 + 16}
                stroke={color} strokeWidth="1"
              />
            )
          })}
          {shape.itemCount > 8 && (
            <text x={shape.centerX + 18} y={shape.centerY + shape.height / 2 + 16} className="text-[9px] font-mono fill-current font-bold">
              +{shape.itemCount - 8}
            </text>
          )}
        </g>
        <text x={shape.centerX} y={shape.centerY - shape.height / 2 - 12} textAnchor="middle" className="text-[10px] font-mono font-bold fill-current" style={{ fill: color }}>
          {shape.mealType || "Other"}
        </text>
        {shape.localTime && (
          <text x={shape.centerX} y={shape.centerY - shape.height / 2 - 2} textAnchor="middle" className="text-[8px] font-mono text-muted fill-current opacity-70">
            {shape.localTime}
          </text>
        )}
      </g>
    )
  }

  // kind === "aggregate": not clickable, no meal label, no time
  const washOpacity = shape.fatShare * 0.12 + 0.04
  return (
    <g key="aggregate" aria-hidden="true">
      {shape.contours.length > 0 && (
        <path d={shape.contours[0]} fill={AGGREGATE_COLOR} fillOpacity={washOpacity} stroke="none" />
      )}
      {shape.contours.map((contour, i) => (
        <path key={i} d={contour} fill="none" stroke={AGGREGATE_COLOR} strokeWidth="1" strokeOpacity={0.8 - i * 0.07} />
      ))}
      <g>
        {Array.from({ length: Math.min(shape.itemCount, 8) }).map((_, idx) => {
          const notchX = shape.centerX - 12 + idx * 3.5
          return (
            <line key={idx}
              x1={notchX} y1={shape.centerY + shape.height / 2 + 10}
              x2={notchX} y2={shape.centerY + shape.height / 2 + 16}
              stroke={AGGREGATE_COLOR} strokeWidth="1"
            />
          )
        })}
      </g>
    </g>
  )
}

export function DayImprintStatic({ scene, highlightedMealId, onMealClick }: DayImprintStaticProps) {
  return (
    <div className="w-full relative">
      <svg
        viewBox={VIEWBOX}
        className="w-full h-auto border border-subtle bg-surface rounded-xl select-none"
        aria-label={scene.accessibleSummary}
        role="img"
      >
        {/* Background ruled lines */}
        <g stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="1 3" aria-hidden="true">
          <line x1={SAFE.left} y1={100} x2={1000 - SAFE.right} y2={100} />
          <line x1={SAFE.left} y1={200} x2={1000 - SAFE.right} y2={200} />
          <line x1={SAFE.left} y1={300} x2={1000 - SAFE.right} y2={300} />
          <line x1={SAFE.left} y1={400} x2={1000 - SAFE.right} y2={400} />
        </g>

        {/* Timeline Baseline */}
        <line
          x1={SAFE.left} y1={520 - SAFE.bottom}
          x2={1000 - SAFE.right} y2={520 - SAFE.bottom}
          stroke="var(--border-subtle)" strokeWidth="1.5" aria-hidden="true"
        />

        {/* Time Ticks — suppressed for aggregate-only scenes */}
        {!scene.suppressTimeAxis && scene.timeTicks.map((tick) => (
          <g key={tick.minute} className="text-muted/60 font-mono" aria-hidden="true">
            <line
              x1={tick.x} y1={SAFE.top} x2={tick.x} y2={520 - SAFE.bottom}
              stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="2 3"
            />
            <text x={tick.x} y={520 - SAFE.bottom + 20} textAnchor="middle" className="text-[10px] fill-current font-bold">
              {tick.label}
            </text>
          </g>
        ))}

        {/* Shapes — discriminated union render */}
        {scene.shapes.map((shape) => renderShape(shape, highlightedMealId, onMealClick))}
      </svg>
    </div>
  )
}
