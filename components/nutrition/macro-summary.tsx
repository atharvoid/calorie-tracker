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
			<div className="animate-pulse space-y-3">
				{[0, 1, 2].map((i) => (
					<div key={i} className="bg-elevated h-10 rounded-lg" />
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
			<p className="text-muted text-xs font-semibold tracking-wider uppercase">Macros</p>

			{/* 3-column responsive grid on mobile, falling back to vertical list on very narrow screens */}
			<div className="grid grid-cols-3 gap-2 max-[349px]:grid-cols-1 sm:gap-4">
				{macros.map(({ label, value, target, unit, color }) => {
					const pct =
						target !== null && value > 0 ? Math.min(100, Math.round((value / target) * 100)) : null

					return (
						<div
							key={label}
							className="bg-elevated border-subtle flex flex-col justify-between rounded-xl border p-2 sm:p-3"
						>
							<div>
								<p className="text-muted text-2xs font-medium tracking-wider uppercase">{label}</p>
								<p className="tabular text-primary mt-1 font-mono text-sm font-bold whitespace-nowrap sm:text-base">
									{value.toFixed(1)}
									<span className="text-muted text-2xs ml-0.5 font-normal">{unit}</span>
								</p>
								{target !== null && (
									<p className="text-muted tabular sm:text-2xs mt-0.5 text-[9px] leading-none">
										/ {target.toFixed(0)}
										{unit} target
									</p>
								)}
							</div>

							{pct !== null && (
								<div className="mt-2">
									<div className="bg-canvas h-1.5 w-full overflow-hidden rounded-full">
										<div
											className={cn("h-full rounded-full transition-all duration-500", color)}
											style={{ width: `${pct}%` }}
											aria-label={`${label} ${pct}% of target`}
										/>
									</div>
									<span className="text-muted mt-0.5 block text-right text-[9px] font-medium">
										{pct}%
									</span>
								</div>
							)}
						</div>
					)
				})}
			</div>

			{!totals && <p className="text-muted text-xs">No meals logged yet.</p>}
		</div>
	)
}
