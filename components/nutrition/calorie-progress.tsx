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
      {/* Main calorie display Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Calories Today</p>
        
        {/* Status badge */}
        <div
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase",
            STATUS_BG[status] ?? "bg-elevated",
            STATUS_COLOR[status] ?? "text-muted"
          )}
          aria-label={STATUS_LABEL[status]}
        >
          {STATUS_LABEL[status] ?? status}
        </div>
      </div>

      {/* Large calorie value + target label */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-primary whitespace-nowrap">
          {consumed.toLocaleString("en-IN")}
        </span>
        <span className="text-xs sm:text-sm text-muted font-medium whitespace-nowrap">
          {target !== null ? `of ${target.toLocaleString("en-IN")} kcal target` : "kcal consumed"}
        </span>
      </div>

      {/* Progress bar */}
      {target !== null && (
        <div className="space-y-1.5">
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
          <div className="flex justify-between text-[10px] sm:text-xs text-muted font-medium">
            <span>0 kcal</span>
            <span>{progressPct}% filled</span>
            <span>{target.toLocaleString("en-IN")} kcal</span>
          </div>
        </div>
      )}

      {/* Remaining / over amount cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {target !== null && (
          <div className="rounded-xl bg-elevated/50 border border-subtle/30 p-2.5 sm:p-3 flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider">
              {isOver ? "Over target" : "Remaining"}
            </p>
            <p className={cn(
              "mt-1 font-mono text-base sm:text-lg font-bold tabular leading-none",
              isOver ? "text-danger" : "text-primary"
            )}>
              {isOver
                ? `+${Math.abs(targetDelta ?? 0).toLocaleString("en-IN")}`
                : (remainingToTarget ?? 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[9px] sm:text-[10px] text-muted mt-0.5">kcal</span>
          </div>
        )}

        {target !== null && (
          <div className="rounded-xl bg-elevated/50 border border-subtle/30 p-2.5 sm:p-3 flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider">Target</p>
            <p className="mt-1 font-mono text-base sm:text-lg font-bold tabular text-primary leading-none">
              {target.toLocaleString("en-IN")}
            </p>
            <span className="text-[9px] sm:text-[10px] text-muted mt-0.5">kcal / day</span>
          </div>
        )}

        {maintenance !== null && (
          <div className="col-span-2 sm:col-span-1 rounded-xl bg-elevated/50 border border-subtle/30 p-2.5 sm:p-3 flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider">vs Maintenance</p>
            <p className={cn(
              "mt-1 font-mono text-base sm:text-lg font-bold tabular leading-none",
              (maintenanceBalance ?? 0) > 0 ? "text-pending" : "text-paid"
            )}>
              {(maintenanceBalance ?? 0) > 0 ? "+" : ""}{(maintenanceBalance ?? 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[9px] sm:text-[10px] text-muted mt-0.5">
              kcal ({maintenance.toLocaleString("en-IN")} maint.)
            </span>
          </div>
        )}
      </div>

      {/* No target configured */}
      {status === "unconfigured" && (
        <p className="text-[11px] text-muted leading-relaxed">
          Set your daily target in{" "}
          <span className="text-accent font-semibold">Settings</span> to track progress.
        </p>
      )}
    </div>
  )
}
