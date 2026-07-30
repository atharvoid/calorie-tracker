"use client"

import { cn } from "@/lib/utils"
import { Panel } from "@/components/ui/panel"
import { Skeleton } from "@/components/ui/skeleton"

type Kpi = {
	avgKcal: number | null
	avgTarget: number | null
	loggedDays: number
	rangeDays: number
	coverageLabel: string
	adherencePct: number | null
	adherentDays: number
	overDays: number
	underDays: number
	avgProteinG: number | null
}

type Props = { kpi: Kpi; loading?: boolean }

export function AnalyticsKpis({ kpi, loading = false }: Props) {
	if (loading) {
		return (
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-24 rounded-xl" />
				))}
			</div>
		)
	}

	const cards = [
		{
			label: "Avg. daily calories",
			value:
				kpi.avgKcal !== null ? `${kpi.avgKcal.toLocaleString("en-IN")} kcal` : "Not enough data",
			sub: kpi.coverageLabel,
			accent: false,
		},
		{
			label: "Target",
			value: kpi.avgTarget !== null ? `${kpi.avgTarget.toLocaleString("en-IN")} kcal` : "Not set",
			sub: "Daily goal",
			accent: false,
		},
		{
			label: "Adherence",
			value: kpi.adherencePct !== null ? `${kpi.adherencePct}%` : "—",
			sub:
				kpi.loggedDays > 0
					? `${kpi.adherentDays} on track, ${kpi.overDays} over, ${kpi.underDays} under`
					: "No logged days",
			accent: kpi.adherencePct !== null && kpi.adherencePct >= 70,
		},
		{
			label: "Avg. protein",
			value: kpi.avgProteinG !== null ? `${kpi.avgProteinG}g` : "—",
			sub: "Grams per logged day",
			accent: false,
		},
	]

	return (
		<div className="grid grid-cols-2 gap-3 max-[349px]:grid-cols-1 md:grid-cols-4">
			{cards.map((card) => (
				<Panel key={card.label} className="flex min-h-[90px] flex-col justify-between p-3.5">
					<div>
						<p className="text-muted text-2xs font-bold tracking-wider uppercase sm:text-xs">
							{card.label}
						</p>
						<p
							className={cn(
								"tabular mt-1 font-mono text-xl leading-none font-extrabold sm:text-2xl",
								card.accent ? "text-paid" : "text-primary"
							)}
						>
							{card.value}
						</p>
					</div>
					<p className="text-muted mt-1.5 text-2xs leading-tight sm:text-xs">{card.sub}</p>
				</Panel>
			))}
		</div>
	)
}
