"use client"

import { MiniDayImprint } from "../imprint/mini-day-imprint"
import type { DailyNutritionSummary, MealGroupDTO } from "@/lib/nutrition-types"

interface TrendPoint {
	date: string
	kcal: number | null
	targetKcal: number | null
	maintenanceKcal: number | null
	status: DailyNutritionSummary["status"]
}

interface RhythmStripProps {
	trendPoints: TrendPoint[]
	loading: boolean
}

export function RhythmStrip({ trendPoints, loading }: RhythmStripProps) {
	if (loading) {
		return (
			<div className="bg-elevated/40 text-muted flex h-[48px] animate-pulse items-center justify-center rounded-xl font-mono text-xs">
				Loading rhythm strip…
			</div>
		)
	}

	// Generate a mock list of days to display in the strip.
	// Note: to prevent horizontal overflow on smaller screens, we limit to last 14 days on mobile, or full range on desktop
	const displayPoints = trendPoints.slice(-14)

	return (
		<div className="space-y-2">
			<div className="flex scrollbar-none flex-nowrap items-center gap-1.5 overflow-x-auto pb-2">
				{displayPoints.map((point) => {
					const mockSummary: DailyNutritionSummary = {
						date: point.date,
						totals:
							point.kcal !== null
								? {
										kcal: point.kcal,
										proteinG: Math.round(point.kcal * 0.08), // mock ratio for display
										carbsG: Math.round(point.kcal * 0.1),
										fatG: Math.round(point.kcal * 0.04),
										itemCount: 3,
									}
								: null,
						goal: {
							date: point.date,
							targetKcal: point.targetKcal,
							maintenanceKcal: point.maintenanceKcal,
							proteinTargetG: null,
							carbsTargetG: null,
							fatTargetG: null,
							toleranceKcal: null,
							source: "default",
						},
						remainingToTarget: null,
						targetDelta: null,
						maintenanceBalance: null,
						status: point.status,
						mealCount: point.kcal ? 3 : 0,
						assumptionCount: 0,
					}

					const mockMealGroups: MealGroupDTO[] = mockSummary.totals
						? [
								{
									mealType: "Lunch",
									timeHint: "13:00",
									items: [],
									subtotal: mockSummary.totals,
								},
							]
						: []

					// Formatting date label as Day letter + number
					const dayLabel = new Date(point.date)
						.toLocaleDateString("en-US", { weekday: "short" })
						.slice(0, 1)
					const dateNum = point.date.split("-")[2]

					return (
						<div key={point.date} className="flex shrink-0 flex-col items-center gap-1">
							<span className="text-muted font-mono text-[9px] font-bold uppercase">
								{dayLabel}
							</span>
							<MiniDayImprint
								summary={mockSummary}
								mealGroups={mockMealGroups}
								width={48}
								height={30}
							/>
							<span className="text-secondary mt-0.5 font-mono text-[9px] font-bold">
								{dateNum}
							</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}
