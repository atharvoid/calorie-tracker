"use client"

import { Mascot } from "@/components/mascot"
import { Skeleton } from "@/components/ui/skeleton"

type TopFood = {
	name: string
	totalKcal: number
	totalProteinG: number
	count: number
}

type Props = {
	byKcal: TopFood[]
	byProtein: TopFood[]
	loading?: boolean
}

import { cn } from "@/lib/utils"

function FoodTable({
	foods,
	valueKey,
}: {
	foods: TopFood[]
	valueKey: "totalKcal" | "totalProteinG"
}) {
	if (foods.length === 0) {
		return (
			<div className="flex flex-col items-center gap-1.5 py-3">
				<Mascot pose="idle" className="h-8 w-8 opacity-70" />
				<p className="text-muted text-xs">No data yet.</p>
			</div>
		)
	}

	// Find max value for relative bar length scaling
	const maxVal = foods.reduce((max, f) => {
		const v = valueKey === "totalKcal" ? f.totalKcal : f.totalProteinG
		return v > max ? v : max
	}, 1)

	return (
		<div className="space-y-3.5 py-1">
			{foods.map((f, idx) => {
				const val = valueKey === "totalKcal" ? f.totalKcal : f.totalProteinG
				const pct = Math.max(3, Math.min(100, Math.round((val / maxVal) * 100)))
				const displayVal =
					valueKey === "totalKcal"
						? `${Math.round(f.totalKcal).toLocaleString("en-IN")} kcal`
						: `${f.totalProteinG.toFixed(1)}g`

				return (
					<div key={f.name} className="space-y-1">
						<div className="flex items-start justify-between gap-2 text-xs sm:text-sm">
							<span className="text-secondary min-w-0 flex-1 leading-snug font-medium break-words">
								<span className="text-muted text-2xs mr-1 font-mono">{idx + 1}.</span>
								{f.name}{" "}
								<span className="text-muted text-2xs font-normal whitespace-nowrap">
									({f.count}×)
								</span>
							</span>
							<span className="tabular text-primary shrink-0 font-mono text-xs font-bold sm:text-sm">
								{displayVal}
							</span>
						</div>

						{/* Restrained progress indicator bar */}
						<div className="bg-elevated/60 h-1.5 w-full overflow-hidden rounded-full">
							<div
								className={cn(
									"h-full rounded-full transition-all duration-500",
									valueKey === "totalKcal" ? "bg-accent" : "bg-partial"
								)}
								style={{ width: `${pct}%` }}
							/>
						</div>
					</div>
				)
			})}
		</div>
	)
}

export function TopFoods({ byKcal, byProtein, loading = false }: Props) {
	if (loading) {
		return (
			<div className="grid gap-6 md:grid-cols-2">
				<Skeleton className="h-40 rounded-xl" />
				<Skeleton className="h-40 rounded-xl" />
			</div>
		)
	}

	return (
		<div className="grid gap-6 md:grid-cols-2">
			<div>
				<p className="text-muted text-2xs mb-3 font-bold tracking-wider uppercase">
					Top foods by calories
				</p>
				<FoodTable foods={byKcal} valueKey="totalKcal" />
			</div>
			<div>
				<p className="text-muted text-2xs mb-3 font-bold tracking-wider uppercase">
					Top foods by protein
				</p>
				<FoodTable foods={byProtein} valueKey="totalProteinG" />
			</div>
		</div>
	)
}
