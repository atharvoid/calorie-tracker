"use client"

import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"

const STATUS_LABEL: Record<string, string> = {
	"no-data": "—",
	unconfigured: "No target",
	under: "Under",
	within: "On track",
	over: "Over",
}

const STATUS_COLOR: Record<string, string> = {
	"no-data": "text-muted",
	unconfigured: "text-muted",
	under: "text-partial",
	within: "text-paid",
	over: "text-danger",
}

const STATUS_DOT: Record<string, string> = {
	"no-data": "bg-elevated",
	unconfigured: "bg-muted",
	under: "bg-partial",
	within: "bg-paid",
	over: "bg-danger",
}

type SortOption = "newest" | "oldest" | "kcal-high" | "kcal-low"
type FilterOption = "all" | "logged" | "under" | "within" | "over"

type Props = {
	summaries: DailyNutritionSummary[]
	sort: SortOption
	filter: FilterOption
	onSortChange: (sort: SortOption) => void
	onFilterChange: (filter: FilterOption) => void
	onSelectDate?: (date: string) => void
}

export function HistoryTable({
	summaries,
	sort,
	filter,
	onSortChange,
	onFilterChange,
	onSelectDate,
}: Props) {
	const SORT_OPTIONS: { value: SortOption; label: string }[] = [
		{ value: "newest", label: "Newest first" },
		{ value: "oldest", label: "Oldest first" },
		{ value: "kcal-high", label: "Highest calories" },
		{ value: "kcal-low", label: "Lowest calories" },
	]

	const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
		{ value: "all", label: "All days" },
		{ value: "logged", label: "Logged only" },
		{ value: "under", label: "Under target" },
		{ value: "within", label: "On track" },
		{ value: "over", label: "Over target" },
	]

	return (
		<div className="space-y-3">
			{/* Controls */}
			<div className="flex flex-wrap gap-2">
				<select
					value={sort}
					onChange={(e) => onSortChange(e.target.value as SortOption)}
					className="border-subtle bg-elevated text-secondary rounded-lg border px-3 py-1.5 text-xs"
					aria-label="Sort by"
				>
					{SORT_OPTIONS.map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>

				<select
					value={filter}
					onChange={(e) => onFilterChange(e.target.value as FilterOption)}
					className="border-subtle bg-elevated text-secondary rounded-lg border px-3 py-1.5 text-xs"
					aria-label="Filter by status"
				>
					{FILTER_OPTIONS.map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
			</div>

			{summaries.length === 0 && (
				<EmptyState
					title="No data matches your filter"
					hint="Try a different sort or filter option."
					className="h-[200px]"
				/>
			)}

			{/* Desktop table */}
			<div className="border-subtle hidden overflow-x-auto rounded-xl border sm:block">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-subtle border-b">
							{["Date", "Calories", "Target", "Status", "Protein", "Carbs", "Fat", "Items"].map(
								(h) => (
									<th
										key={h}
										className="text-muted px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase"
									>
										{h}
									</th>
								)
							)}
						</tr>
					</thead>
					<tbody>
						{summaries.map((s) => (
							<tr
								key={s.date}
								onClick={() => onSelectDate?.(s.date)}
								className="border-subtle hover:bg-elevated/20 cursor-pointer border-b transition-colors last:border-0"
							>
								<td className="text-secondary px-3 py-2">{s.date}</td>
								<td className="tabular text-primary px-3 py-2 font-mono">
									{s.totals !== null ? s.totals.kcal.toLocaleString("en-IN") : "—"}
								</td>
								<td className="tabular text-secondary px-3 py-2 font-mono">
									{s.goal.targetKcal !== null ? s.goal.targetKcal.toLocaleString("en-IN") : "—"}
								</td>
								<td
									className={cn(
										"px-3 py-2 text-xs font-medium",
										STATUS_COLOR[s.status] ?? "text-muted"
									)}
								>
									<div className="flex items-center gap-2">
										<span
											className={cn(
												"h-1.5 w-1.5 shrink-0 rounded-full",
												STATUS_DOT[s.status] ?? "bg-elevated"
											)}
											aria-hidden
										/>
										<span>{STATUS_LABEL[s.status] ?? s.status}</span>
									</div>
								</td>
								<td className="tabular text-secondary px-3 py-2 font-mono">
									{s.totals !== null ? `${s.totals.proteinG.toFixed(1)}g` : "—"}
								</td>
								<td className="tabular text-secondary px-3 py-2 font-mono">
									{s.totals !== null ? `${s.totals.carbsG.toFixed(1)}g` : "—"}
								</td>
								<td className="tabular text-secondary px-3 py-2 font-mono">
									{s.totals !== null ? `${s.totals.fatG.toFixed(1)}g` : "—"}
								</td>
								<td className="tabular text-secondary px-3 py-2 font-mono">
									{s.mealCount > 0 ? s.mealCount : "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Mobile cards — no SVG, status badge only */}
			<div className="space-y-2.5 sm:hidden">
				{summaries.map((s) => (
					<div
						key={s.date}
						onClick={() => onSelectDate?.(s.date)}
						className="border-subtle bg-surface hover:bg-elevated/20 flex cursor-pointer flex-col justify-between gap-2 rounded-xl border p-3.5 transition-all active:scale-[0.99]"
					>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-primary text-sm font-bold">{s.date}</p>
								<span
									className={cn(
										"mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase",
										s.status === "within"
											? "bg-paid/10 text-paid"
											: s.status === "over"
												? "bg-danger/10 text-danger"
												: s.status === "under"
													? "bg-partial/10 text-partial"
													: "bg-elevated text-muted"
									)}
								>
									{STATUS_LABEL[s.status] ?? s.status}
								</span>
							</div>

							<div className="text-right">
								<p className="tabular text-primary font-mono text-base leading-none font-extrabold">
									{s.totals !== null ? `${s.totals.kcal.toLocaleString("en-IN")}` : "—"}{" "}
									<span className="text-muted text-2xs font-normal">kcal</span>
								</p>
								{s.goal.targetKcal !== null && (
									<p className="text-muted text-2xs mt-1 font-medium">
										of {s.goal.targetKcal.toLocaleString("en-IN")} target
									</p>
								)}
							</div>
						</div>

						{s.totals !== null && (
							<div className="border-subtle/50 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
								<div className="text-muted tabular text-2xs flex gap-2.5 font-semibold">
									<span>
										P: <strong className="text-secondary">{s.totals.proteinG.toFixed(0)}g</strong>
									</span>
									<span>
										C: <strong className="text-secondary">{s.totals.carbsG.toFixed(0)}g</strong>
									</span>
									<span>
										F: <strong className="text-secondary">{s.totals.fatG.toFixed(0)}g</strong>
									</span>
								</div>

								<span className="text-muted bg-elevated/80 rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
									{s.mealCount} {s.mealCount === 1 ? "meal" : "meals"}
								</span>
							</div>
						)}

						{s.totals === null && (
							<div className="border-subtle/50 text-muted text-2xs border-t pt-2 italic">
								No meals logged for this date. Tap to log.
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
