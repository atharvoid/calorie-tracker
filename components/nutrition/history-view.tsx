"use client"

import { useCallback, useEffect, useState } from "react"
import { Panel } from "@/components/ui/panel"
import { Skeleton } from "@/components/ui/skeleton"
import { WeekNavigator } from "./week-navigator"
import { TodayView } from "./today-view"
import { HistoryTable } from "./history-table"
import { mondayOfWeek, sundayOfWeek, localDate, isFuture } from "@/lib/nutrition-date"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"

const TZ = "Asia/Kolkata"

type SortOption = "newest" | "oldest" | "kcal-high" | "kcal-low"
type FilterOption = "all" | "logged" | "under" | "within" | "over"

type ApiResponse = { summaries: DailyNutritionSummary[]; total: number }

type Props = {
	refreshKey?: number
}

export function HistoryView({ refreshKey }: Props) {
	const today = localDate(TZ)
	const [weekMonday, setWeekMonday] = useState(() => mondayOfWeek(today))
	const [selectedDate, setSelectedDate] = useState<string | null>(today)
	const [weekSummaries, setWeekSummaries] = useState<DailyNutritionSummary[]>([])
	const [weekLoading, setWeekLoading] = useState(true)
	const [sort, setSort] = useState<SortOption>("newest")
	const [filter, setFilter] = useState<FilterOption>("logged")
	const [historyData, setHistoryData] = useState<DailyNutritionSummary[]>([])
	const [historyLoading, setHistoryLoading] = useState(true)

	// Load current week summaries
	const loadWeek = useCallback(async (monday: string, silent = false) => {
		const sunday = sundayOfWeek(monday)
		if (!silent) setWeekLoading(true)
		try {
			const res = await fetch(
				`/api/nutrition/history?start=${monday}&end=${sunday}&sort=oldest&status=all`
			)
			if (!res.ok) return
			const json = (await res.json()) as ApiResponse
			setWeekSummaries(json.summaries)
		} finally {
			setWeekLoading(false)
		}
	}, [])

	useEffect(() => {
		const isSilent = refreshKey !== undefined && refreshKey > 0
		void loadWeek(weekMonday, isSilent)
	}, [weekMonday, loadWeek, refreshKey])

	// Load last 4 weeks history for table
	const loadHistory = useCallback(
		async (s: SortOption, f: FilterOption, silent = false) => {
			const end = today
			// Go back 28 days
			const start = new Date()
			start.setDate(start.getDate() - 28)
			const startStr = start.toLocaleDateString("en-CA", { timeZone: TZ })

			if (!silent) setHistoryLoading(true)
			try {
				const res = await fetch(
					`/api/nutrition/history?start=${startStr}&end=${end}&sort=${s}&status=${f}`
				)
				if (!res.ok) return
				const json = (await res.json()) as ApiResponse
				setHistoryData(json.summaries)
			} finally {
				setHistoryLoading(false)
			}
		},
		[today]
	)

	useEffect(() => {
		const isSilent = refreshKey !== undefined && refreshKey > 0
		void loadHistory(sort, filter, isSilent)
	}, [sort, filter, loadHistory, refreshKey])

	function handleWeekChange(monday: string) {
		setWeekMonday(monday)
		// Auto-select first non-future day in the new week
		const sunday = sundayOfWeek(monday)
		const nonFuture = !isFuture(sunday, TZ) ? sunday : !isFuture(today, TZ) ? today : null
		setSelectedDate(nonFuture)
	}

	function handleSelectDate(d: string) {
		setSelectedDate(d)
		const newMonday = mondayOfWeek(d)
		if (newMonday !== weekMonday) {
			setWeekMonday(newMonday)
		}
	}

	return (
		<div className="space-y-6">
			{/* Week navigator */}
			<Panel>
				{weekLoading && weekSummaries.length === 0 ? (
					<div className="flex h-24 items-center justify-around">
						{[...Array(7)].map((_, i) => (
							<div key={i} className="flex flex-col items-center gap-1.5">
								<Skeleton className="h-2 w-4 rounded" />
								<Skeleton className="h-10 w-12 rounded-lg" />
								<Skeleton className="h-2 w-3 rounded" />
							</div>
						))}
					</div>
				) : (
					<WeekNavigator
						weekMonday={weekMonday}
						summaries={weekSummaries}
						selectedDate={selectedDate}
						onSelectDate={handleSelectDate}
						onWeekChange={handleWeekChange}
					/>
				)}
			</Panel>

			{/* Selected day detail */}
			{selectedDate && (
				<div>
					<TodayView key={selectedDate} initialDate={selectedDate} refreshKey={refreshKey} />
				</div>
			)}

			{/* History table */}
			<div>
				<p className="text-primary mb-3 text-sm font-medium">Last 28 days</p>
				{historyLoading && historyData.length === 0 ? (
					<div className="space-y-2.5">
						<Skeleton className="h-10 rounded-lg" />
						<Skeleton className="h-12 rounded-lg" />
						<Skeleton className="h-12 rounded-lg" />
						<Skeleton className="h-12 rounded-lg" />
						<Skeleton className="h-12 rounded-lg" />
					</div>
				) : (
					<HistoryTable
						summaries={historyData}
						sort={sort}
						filter={filter}
						onSortChange={setSort}
						onFilterChange={setFilter}
						onSelectDate={handleSelectDate}
					/>
				)}
			</div>
		</div>
	)
}
