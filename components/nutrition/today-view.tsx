"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2, Lightbulb, Plus } from "lucide-react"
import { Panel } from "@/components/ui/panel"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { CalorieProgress } from "./calorie-progress"
import { MacroSummary } from "./macro-summary"
import { MealGroup } from "./meal-group"
import { MealComposer } from "./meal-composer"
import { DayImprint } from "../imprint/day-imprint"
import { getActiveExperience } from "@/lib/experience-mode"
import { toast } from "sonner"
import { localDate, addDays, isFuture, isToday, formatShortDate } from "@/lib/nutrition-date"
import type { DailyNutritionSummary, MealGroupDTO } from "@/lib/nutrition-types"

const TZ = "Asia/Kolkata"

type DayData = {
	summary: DailyNutritionSummary
	mealGroups: MealGroupDTO[]
	insights: string[]
}

type Props = {
	initialDate?: string
	refreshKey?: number
}

export function TodayView({ initialDate, refreshKey }: Props) {
	const searchParams = useSearchParams()
	const experience = getActiveExperience(searchParams)
	const isImprint = experience === "imprint"

	const today = localDate(TZ)
	const [date, setDate] = useState(initialDate ?? today)
	const [data, setData] = useState<DayData | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showComposer, setShowComposer] = useState(false)
	const dateInputRef = useRef<HTMLInputElement>(null)

	const load = useCallback(async (d: string, silent = false) => {
		if (!silent) {
			setData(null)
			setLoading(true)
		}
		setError(null)
		try {
			const res = await fetch(`/api/nutrition/day?date=${d}`)
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
				throw new Error(body?.error?.message ?? "Failed to load")
			}
			const json = (await res.json()) as DayData
			setData(json)
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error")
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load(date)
	}, [date, load])

	useEffect(() => {
		if (refreshKey !== undefined && refreshKey > 0) {
			void load(date, true)
		}
	}, [refreshKey, date, load])

	// Listen to mobile header event to open meal composer
	useEffect(() => {
		const handleOpenComposer = () => {
			setShowComposer(true)
		}
		window.addEventListener("open_meal_composer", handleOpenComposer)
		return () => {
			window.removeEventListener("open_meal_composer", handleOpenComposer)
		}
	}, [])

	// Exposed for realtime updates
	const refresh = useCallback(() => {
		void load(date)
	}, [date, load])

	function handleCommitted(result: any) {
		setShowComposer(false)

		// If sheets failed but DB succeeded, show warning
		if (result.syncWarning) {
			toast.warning("Meal saved, but Google Sheet sync failed.", {
				description: result.syncWarning,
			})
		} else {
			toast.success(`Meal saved to ${formatShortDate(date)}.`)
		}

		// Dispatch local event for instant sibling/parent update
		window.dispatchEvent(new CustomEvent("local_nutrition_changed", { detail: { date } }))

		// Reload local day data
		void load(date)
	}

	function goToPrev() {
		setDate((d) => addDays(d, -1))
	}
	function goToNext() {
		if (!isFuture(addDays(date, 1), TZ)) setDate((d) => addDays(d, 1))
	}
	function goToToday() {
		setDate(today)
	}

	const nextDisabled = isFuture(addDays(date, 1), TZ)
	const dateLabel = isToday(date, TZ) ? "Today" : formatShortDate(date)

	const handleDateClick = () => {
		if (dateInputRef.current) {
			if (typeof dateInputRef.current.showPicker === "function") {
				dateInputRef.current.showPicker()
			} else {
				dateInputRef.current.click()
			}
		}
	}

	function handleDeleteItem(id: string) {
		if (!data) return
		setData({
			...data,
			mealGroups: data.mealGroups
				.map((g) => ({
					...g,
					items: g.items.filter((it) => it.id !== id),
					subtotal: {
						...g.subtotal,
						itemCount: g.items.filter((it) => it.id !== id).length,
					},
				}))
				.filter((g) => g.items.length > 0),
		})
		// Reload to get accurate totals
		setTimeout(() => void load(date), 300)
	}

	return (
		<div className="space-y-4">
			{/* Date navigator */}
			<div className="bg-surface border-subtle flex items-center justify-between rounded-xl border p-1">
				<button
					onClick={goToPrev}
					className="text-muted hover:text-primary hover:bg-elevated flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
					aria-label="Previous day"
				>
					<ChevronLeft className="h-5 w-5" />
				</button>

				<div
					onClick={handleDateClick}
					className="hover:bg-elevated/35 flex-1 cursor-pointer rounded-lg px-2 py-1 text-center transition-colors select-none"
					role="button"
					aria-label="Select date"
				>
					<p className="text-primary text-sm leading-tight font-semibold sm:text-base">
						{dateLabel}
					</p>
					<p className="text-muted mt-0.5 text-2xs tracking-wide">{date}</p>
					<input
						ref={dateInputRef}
						type="date"
						max={today}
						value={date}
						onChange={(e) => {
							if (e.target.value) setDate(e.target.value)
						}}
						className="sr-only"
						aria-hidden="true"
					/>
				</div>

				<div className="flex items-center gap-1">
					<button
						onClick={goToNext}
						disabled={nextDisabled}
						className="text-muted hover:text-primary hover:bg-elevated flex h-11 w-11 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30"
						aria-label="Next day"
					>
						<ChevronRight className="h-5 w-5" />
					</button>

					{!isToday(date, TZ) && (
						<button
							onClick={goToToday}
							className="text-accent hover:text-accent-hover hover:bg-accent/5 border-accent/15 flex h-11 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors"
						>
							Today
						</button>
					)}
				</div>
			</div>

			{/* Log a meal action */}
			{!showComposer && (
				<div className="flex justify-end">
					<button
						onClick={() => setShowComposer(true)}
						className="border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 flex cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors"
					>
						<Plus className="h-4 w-4" />
						Log a meal
					</button>
				</div>
			)}

			{showComposer && (
				<MealComposer
					logDate={date}
					sourceContext={initialDate ? "history" : "today"}
					onCommitted={handleCommitted}
					onCancel={() => setShowComposer(false)}
				/>
			)}

			{/* Loading state */}
			{loading && !data && (
				<div className="space-y-4">
					{isImprint && <Skeleton className="h-[220px] rounded-xl" />}
					<Skeleton className="h-[76px] rounded-xl" />
					<Skeleton className="h-[96px] rounded-xl" />
					<div className="space-y-2">
						<Skeleton className="h-3 w-16 rounded" />
						<Skeleton className="h-[56px] rounded-xl" />
						<Skeleton className="h-[56px] rounded-xl" />
					</div>
				</div>
			)}

			{/* Error state */}
			{!loading && error && (
				<Panel>
					<p className="text-danger text-sm">{error}</p>
					<button onClick={refresh} className="text-accent mt-2 text-xs hover:underline">
						Try again
					</button>
				</Panel>
			)}

			{/* Main content */}
			{!loading && !error && data && (
				<>
					{isImprint && (
						<DayImprint
							summary={data.summary}
							mealGroups={data.mealGroups}
							onLogMeal={() => setShowComposer(true)}
						/>
					)}

					<Panel>
						<CalorieProgress summary={data.summary} />
					</Panel>

					<Panel>
						<MacroSummary totals={data.summary.totals} goal={data.summary.goal} />
					</Panel>

					{/* Insights — below macros */}
					{data.insights.length > 0 && (
						<Panel>
							<div className="mb-3 flex items-center gap-2">
								<Lightbulb className="text-accent h-4 w-4" />
								<p className="text-primary text-sm font-medium">Insights</p>
							</div>
							<ul className="space-y-2">
								{data.insights.slice(0, 2).map((insight, i) => (
									<li key={i} className="text-secondary flex gap-2 text-sm">
										<span className="text-accent mt-0.5">•</span>
										<span>{insight}</span>
									</li>
								))}
							</ul>
						</Panel>
					)}

					{/* Meal groups */}
					{data.mealGroups.length > 0 ? (
						<div className="space-y-2">
							<p className="text-muted px-1 text-xs font-medium tracking-wide uppercase">Meals</p>
							{data.mealGroups.map((group, i) => (
								<MealGroup
									key={group.mealType ?? `group-${i}`}
									group={group}
									onDeleteItem={handleDeleteItem}
								/>
							))}
						</div>
					) : (
						<EmptyState
							title="No meals logged yet"
							hint={
								isToday(date, TZ)
									? "Send a message to your Telegram bot to log your meals."
									: "No meals were logged on this day."
							}
							className="h-[160px]"
						/>
					)}
				</>
			)}
		</div>
	)
}
