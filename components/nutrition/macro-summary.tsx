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
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Macros</p>
      
      {/* 3-column responsive grid on mobile, falling back to vertical list on very narrow screens */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 max-[349px]:grid-cols-1">
        {macros.map(({ label, value, target, unit, color }) => {
          const pct = target !== null && value > 0
            ? Math.min(100, Math.round((value / target) * 100))
            : null

          return (
            <div key={label} className="rounded-xl bg-elevated border border-subtle p-2 sm:p-3 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider">{label}</p>
                <p className="mt-1 font-mono text-sm sm:text-base font-bold tabular text-white whitespace-nowrap">
                  {value.toFixed(1)}
                  <span className="text-[10px] text-muted font-normal ml-0.5">{unit}</span>
                </p>
                {target !== null && (
                  <p className="text-[9px] sm:text-[10px] text-muted tabular leading-none mt-0.5">
                    / {target.toFixed(0)}{unit} target
                  </p>
                )}
              </div>
              
              {pct !== null && (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-base">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", color)}
                      style={{ width: `${pct}%` }}
                      aria-label={`${label} ${pct}% of target`}
                    />
                  </div>
                  <span className="text-[9px] text-muted font-medium mt-0.5 block text-right">{pct}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!totals && (
        <p className="text-xs text-muted">No meals logged yet.</p>
      )}
    </div>
  )
}
