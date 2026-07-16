"use client"

import { cn } from "@/lib/utils"
import type { NutritionTotals, ResolvedNutritionGoal } from "@/lib/nutrition-types"

type Props = {
  totals: NutritionTotals | null
  goal: ResolvedNutritionGoal
  loading?: boolean
}

type MacroRow = {
  label: string
  value: number
  target: number | null
  unit: string
  color: string
}

export function MacroSummary({ totals, goal, loading = false }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-elevated" />
        ))}
      </div>
    )
  }

  const macros: MacroRow[] = [
    {
      label: "Protein",
      value: totals?.proteinG ?? 0,
      target: goal.proteinTargetG,
      unit: "g",
      color: "bg-partial",
    },
    {
      label: "Carbs",
      value: totals?.carbsG ?? 0,
      target: goal.carbsTargetG,
      unit: "g",
      color: "bg-pending",
    },
    {
      label: "Fat",
      value: totals?.fatG ?? 0,
      target: goal.fatTargetG,
      unit: "g",
      color: "bg-accent",
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Macros</p>
      {macros.map(({ label, value, target, unit, color }) => {
        const pct = target !== null && value > 0
          ? Math.min(100, Math.round((value / target) * 100))
          : null

        return (
          <div key={label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">{label}</span>
              <span className="font-mono tabular text-primary">
                {value.toFixed(1)}{unit}
                {target !== null && (
                  <span className="ml-1 text-muted">/ {target.toFixed(0)}{unit}</span>
                )}
              </span>
            </div>
            {pct !== null && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", color)}
                  style={{ width: `${pct}%` }}
                  aria-label={`${label} ${pct}% of target`}
                />
              </div>
            )}
          </div>
        )
      })}

      {!totals && (
        <p className="text-xs text-muted">No meals logged yet.</p>
      )}
    </div>
  )
}
