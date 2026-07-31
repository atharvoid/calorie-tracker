"use client"

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
	sundayOfWeek,
	addDays,
	dateRange,
	formatWeekLabel,
	isToday,
	isFuture,
	formatWeekday,
	formatMonthDay,
	mondayOfWeek,
	localDate,
} from "@/lib/nutrition-date"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"

const TZ = "Asia/Kolkata"

const STATUS_DOT: Record<string, string> = {
	"no-data": "bg-elevated",
	unconfigured: "bg-muted",
	under: "bg-partial",
	within: "bg-paid",
	over: "bg-danger",
}

type Props = {
	/** Currently selected week's Monday date */
	weekMonday: string
	/** All summaries for this week (may have missing days) */
	summaries: DailyNutritionSummary[]
	/** Selected day */
	selectedDate: string | null
	onSelectDate: (date: string) => void
	onWeekChange: (monday: string) => void
}

export function WeekNavigator({
	weekMonday,
	summaries,
	selectedDate,
	onSelectDate,
	onWeekChange,
}: Props) {
	const sunday = sundayOfWeek(weekMonday)
	const weekDates = dateRange(weekMonday, sunday)
	const summaryByDate = new Map(summaries.map((s) => [s.date, s]))

	function goPrev() {
		onWeekChange(addDays(weekMonday, -7))
	}
	function goNext() {
		const nextMonday = addDays(weekMonday, 7)
		// Don't navigate to a future week where all days are in the future
		const nextSunday = addDays(weekMonday, 13)
		if (!isFuture(nextSunday, TZ) || !isFuture(nextMonday, TZ)) {
			onWeekChange(nextMonday)
		}
	}

	const allNextFuture = isFuture(addDays(weekMonday, 7), TZ)

	const selectedSummary = selectedDate ? summaryByDate.get(selectedDate) : null

	return (
		<div>
			{/* Week header */}
			<div className="mb-3 flex items-center justify-between">
				<Tooltip>
					<TooltipTrigger
						onClick={goPrev}
						className="text-muted hover:text-primary hover:bg-elevated focus-visible:ring-accent ease-premium flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
						aria-label="Previous week"
					>
						<ChevronLeft className="h-4.5 w-4.5" />
					</TooltipTrigger>
					<TooltipContent>Previous week</TooltipContent>
				</Tooltip>
				<p className="text-secondary text-sm font-semibold">
					{formatWeekLabel(weekMonday, sunday)}
				</p>
				<Tooltip>
					<TooltipTrigger
						onClick={goNext}
						disabled={allNextFuture}
						className="text-muted hover:text-primary hover:bg-elevated focus-visible:ring-accent ease-premium flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
						aria-label="Next week"
					>
						<ChevronRight className="h-4.5 w-4.5" />
					</TooltipTrigger>
					<TooltipContent>Next week</TooltipContent>
				</Tooltip>
			</div>

			{/* Quick Navigation Controls */}
			<div className="border-subtle/50 mb-4 flex items-center justify-between border-b pb-2 text-xs">
				<button
					onClick={() => onWeekChange(mondayOfWeek(localDate(TZ)))}
					className="text-accent cursor-pointer border-0 bg-transparent font-semibold hover:underline focus:outline-none"
				>
					This week
				</button>
				<button
					onClick={() => {
						const input = document.getElementById("history-date-picker") as HTMLInputElement
						if (input) {
							if (typeof input.showPicker === "function") {
								input.showPicker()
							} else {
								input.click()
							}
						}
					}}
					className="text-secondary hover:text-primary flex cursor-pointer items-center gap-1 border-0 bg-transparent font-semibold focus:outline-none"
				>
					<Calendar className="h-3.5 w-3.5" />
					Jump to date
					<input
						id="history-date-picker"
						type="date"
						max={localDate(TZ)}
						value={selectedDate || ""}
						onChange={(e) => {
							if (e.target.value) onSelectDate(e.target.value)
						}}
						className="sr-only"
						aria-hidden="true"
					/>
				</button>
			</div>

			{/* Day grid */}
			<div className="grid grid-cols-7 gap-1">
				{weekDates.map((date) => {
					const summary = summaryByDate.get(date)
					const future = isFuture(date, TZ)
					const today = isToday(date, TZ)
					const selected = date === selectedDate
					const hasData = summary?.totals !== null && summary !== undefined
					const kcal = summary?.totals?.kcal ?? null
					const status = summary?.status ?? "no-data"

					return (
						<button
							key={date}
							onClick={() => !future && onSelectDate(date)}
							disabled={future}
							aria-label={`${date}${today ? " (today)" : ""}: ${kcal !== null ? `${kcal} kcal, ${status}` : "no data"}`}
							className={cn(
								"focus-visible:ring-accent ease-premium flex min-h-16 flex-col items-center rounded-xl px-1 py-2 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none",
								selected ? "bg-accent/10 ring-accent ring-1" : "hover:bg-elevated",
								future && "cursor-not-allowed opacity-40",
								today && !selected && "ring-muted/50 ring-1"
							)}
						>
							<span className="text-muted text-2xs font-semibold uppercase sm:text-xs">
								{formatWeekday(date).slice(0, 1)}
							</span>
							<span
								className={cn("mt-0.5 text-sm font-bold", today ? "text-accent" : "text-secondary")}
							>
								{formatMonthDay(date).split(" ")[0]}
							</span>

							{/* Status dot */}
							<span
								className={cn(
									"mt-1.5 h-1.5 w-1.5 rounded-full",
									STATUS_DOT[status] ?? "bg-elevated"
								)}
								aria-hidden
							/>

							{/* kcal or em dash - hidden on mobile, shown on tablet/desktop */}
							<span className="tabular text-muted text-2xs mt-0.5 hidden font-mono sm:inline">
								{hasData ? `${(kcal ?? 0).toLocaleString("en-IN")}` : "—"}
							</span>
						</button>
					)
				})}
			</div>

			{/* Selected Day Calorie Summary below strip (mobile only) */}
			{selectedSummary && (
				<div className="border-subtle/50 mt-3 flex items-center justify-between border-t pt-2 text-xs sm:hidden">
					<span className="text-secondary font-medium">
						Selected: <span className="text-primary font-semibold">{selectedDate}</span>
					</span>
					<span className="tabular text-primary font-mono font-bold">
						{selectedSummary.totals !== null ? (
							<>
								{selectedSummary.totals.kcal.toLocaleString("en-IN")} kcal
								{selectedSummary.goal.targetKcal !== null && (
									<span className="text-muted text-2xs ml-1 font-normal">
										/ {selectedSummary.goal.targetKcal.toLocaleString("en-IN")} target
									</span>
								)}
							</>
						) : (
							"Not logged"
						)}
					</span>
				</div>
			)}
		</div>
	)
}
