"use client"

import { cn } from "@/lib/utils"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"

type Props = {
  summary: DailyNutritionSummary
  loading?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  "no-data": "No meals yet",
  unconfigured: "Set your target",
  under: "Under target",
  within: "Within target",
  over: "Over target",
}

const STATUS_COLOR: Record<string, string> = {
  "no-data": "text-muted",
  unconfigured: "text-pending",
  under: "text-partial",
  within: "text-paid",
  over: "text-danger",
}

const STATUS_BG: Record<string, string> = {
  "no-data": "bg-elevated",
  unconfigured: "bg-pending/10",
  under: "bg-partial/10",
  within: "bg-paid/10",
  over: "bg-danger/10",
}

export function CalorieProgress({ summary, loading = false }: Props) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-elevated" />
        <div className="h-3 w-full rounded-full bg-elevated" />
        <div className="h-4 w-32 rounded bg-elevated" />
      </div>
    )
  }

  const { totals, goal, remainingToTarget, targetDelta, maintenanceBalance, status } = summary
  const consumed = totals?.kcal ?? 0
  const target = goal.targetKcal
  const maintenance = goal.maintenanceKcal

  // Progress bar calculation (capped at 100%)
  const progressPct = target !== null && consumed > 0
    ? Math.min(100, Math.round((consumed / target) * 100))
    : 0
  const isOver = status === "over"

  return (
    <div className="space-y-4">
      {/* Main calorie display */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Calories Today</p>
          <p className="mt-1 font-mono text-5xl font-bold tabular text-primary">
            {consumed.toLocaleString("en-IN")}
          </p>
          <p className="mt-0.5 text-sm text-muted">kcal consumed</p>
        </div>

        {/* Status badge */}
        <div
          className={cn(
            "ml-auto mb-1 rounded-full px-3 py-1 text-xs font-semibold",
            STATUS_BG[status] ?? "bg-elevated",
            STATUS_COLOR[status] ?? "text-muted"
          )}
          aria-label={STATUS_LABEL[status]}
        >
          {STATUS_LABEL[status] ?? status}
        </div>
      </div>

      {/* Progress bar */}
      {target !== null && (
        <div>
          <div
            className="relative h-2.5 w-full overflow-hidden rounded-full bg-elevated"
            role="progressbar"
            aria-valuenow={consumed}
            aria-valuemin={0}
            aria-valuemax={target}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isOver ? "bg-danger" : status === "within" ? "bg-paid" : "bg-partial"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>0</span>
            <span>{target.toLocaleString("en-IN")} kcal target</span>
          </div>
        </div>
      )}

      {/* Remaining / over amount */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {target !== null && (
          <div className="rounded-xl bg-elevated p-3">
            <p className="text-xs text-muted">
              {isOver ? "Over target" : "Remaining"}
            </p>
            <p className={cn(
              "mt-1 font-mono text-lg font-semibold tabular",
              isOver ? "text-danger" : "text-primary"
            )}>
              {isOver
                ? `+${Math.abs(targetDelta ?? 0).toLocaleString("en-IN")}`
                : (remainingToTarget ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted">kcal</p>
          </div>
        )}

        {target !== null && (
          <div className="rounded-xl bg-elevated p-3">
            <p className="text-xs text-muted">Target</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular text-primary">
              {target.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted">kcal / day</p>
          </div>
        )}

        {maintenance !== null && (
          <div className="rounded-xl bg-elevated p-3">
            <p className="text-xs text-muted">vs Maintenance</p>
            <p className={cn(
              "mt-1 font-mono text-lg font-semibold tabular",
              (maintenanceBalance ?? 0) > 0 ? "text-pending" : "text-paid"
            )}>
              {(maintenanceBalance ?? 0) > 0 ? "+" : ""}{(maintenanceBalance ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted">kcal ({maintenance.toLocaleString("en-IN")} maint.)</p>
          </div>
        )}
      </div>

      {/* No target configured */}
      {status === "unconfigured" && (
        <p className="text-xs text-muted">
          Set your daily target in{" "}
          <span className="text-accent">Settings</span> to track progress.
        </p>
      )}
    </div>
  )
}
