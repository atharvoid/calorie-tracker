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
			<div className="animate-pulse space-y-4">
				<div className="bg-elevated h-8 w-48 rounded" />
				<div className="bg-elevated h-3 w-full rounded-full" />
				<div className="bg-elevated h-4 w-32 rounded" />
			</div>
		)
	}

	const { totals, goal, remainingToTarget, targetDelta, maintenanceBalance, status } = summary
	const consumed = totals?.kcal ?? 0
	const target = goal.targetKcal
	const maintenance = goal.maintenanceKcal

	// Progress bar calculation (capped at 100%)
	const progressPct =
		target !== null && consumed > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0
	const isOver = status === "over"

	return (
		<div className="space-y-4">
			{/* Main calorie display Header */}
			<div className="flex items-center justify-between">
				<p className="text-muted text-xs font-semibold tracking-wider uppercase">Calories Today</p>

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
			<div className="flex flex-wrap items-baseline gap-1.5">
				<span className="text-primary font-mono text-4xl font-extrabold tracking-tight whitespace-nowrap sm:text-5xl">
					{consumed.toLocaleString("en-IN")}
				</span>
				<span className="text-muted text-xs font-medium whitespace-nowrap sm:text-sm">
					{target !== null ? `of ${target.toLocaleString("en-IN")} kcal target` : "kcal consumed"}
				</span>
			</div>

			{/* Progress bar */}
			{target !== null && (
				<div className="space-y-1.5">
					<div
						className="bg-elevated relative h-2.5 w-full overflow-hidden rounded-full"
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
					<div className="text-muted flex justify-between text-[10px] font-medium sm:text-xs">
						<span>0 kcal</span>
						<span>{progressPct}% filled</span>
						<span>{target.toLocaleString("en-IN")} kcal</span>
					</div>
				</div>
			)}

			{/* Remaining / over amount cards */}
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{target !== null && (
					<div className="bg-elevated/50 border-subtle/30 flex flex-col justify-between rounded-xl border p-2.5 sm:p-3">
						<p className="text-muted text-[10px] font-medium tracking-wider uppercase sm:text-xs">
							{isOver ? "Over target" : "Remaining"}
						</p>
						<p
							className={cn(
								"tabular mt-1 font-mono text-base leading-none font-bold sm:text-lg",
								isOver ? "text-danger" : "text-primary"
							)}
						>
							{isOver
								? `+${Math.abs(targetDelta ?? 0).toLocaleString("en-IN")}`
								: (remainingToTarget ?? 0).toLocaleString("en-IN")}
						</p>
						<span className="text-muted mt-0.5 text-[9px] sm:text-[10px]">kcal</span>
					</div>
				)}

				{target !== null && (
					<div className="bg-elevated/50 border-subtle/30 flex flex-col justify-between rounded-xl border p-2.5 sm:p-3">
						<p className="text-muted text-[10px] font-medium tracking-wider uppercase sm:text-xs">
							Target
						</p>
						<p className="tabular text-primary mt-1 font-mono text-base leading-none font-bold sm:text-lg">
							{target.toLocaleString("en-IN")}
						</p>
						<span className="text-muted mt-0.5 text-[9px] sm:text-[10px]">kcal / day</span>
					</div>
				)}

				{maintenance !== null && (
					<div className="bg-elevated/50 border-subtle/30 col-span-2 flex flex-col justify-between rounded-xl border p-2.5 sm:col-span-1 sm:p-3">
						<p className="text-muted text-[10px] font-medium tracking-wider uppercase sm:text-xs">
							vs Maintenance
						</p>
						<p
							className={cn(
								"tabular mt-1 font-mono text-base leading-none font-bold sm:text-lg",
								(maintenanceBalance ?? 0) > 0 ? "text-pending" : "text-paid"
							)}
						>
							{(maintenanceBalance ?? 0) > 0 ? "+" : ""}
							{(maintenanceBalance ?? 0).toLocaleString("en-IN")}
						</p>
						<span className="text-muted mt-0.5 text-[9px] sm:text-[10px]">
							kcal ({maintenance.toLocaleString("en-IN")} maint.)
						</span>
					</div>
				)}
			</div>

			{/* No target configured */}
			{status === "unconfigured" && (
				<p className="text-muted text-[11px] leading-relaxed">
					Set your daily target in <span className="text-accent font-semibold">Settings</span> to
					track progress.
				</p>
			)}
		</div>
	)
}
