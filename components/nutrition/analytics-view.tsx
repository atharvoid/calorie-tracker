"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Panel } from "@/components/ui/panel"
import { Skeleton } from "@/components/ui/skeleton"
import { AnalyticsKpis } from "./analytics-kpis"
import { CalorieTrendChart } from "./calorie-trend-chart"
import { TopFoods } from "./top-foods"
import { MealContribution } from "./meal-contribution"
import { RhythmStrip } from "./rhythm-strip"
import { getActiveExperience } from "@/lib/experience-mode"
import { cn } from "@/lib/utils"
import {
	buildPatternObservation,
	renderPatternObservation,
} from "@/lib/nutrition-pattern-observation"

type RangeOption = "7d" | "4w" | "12w" | "3m"

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
	// Range-aware fields from updated analytics DTO
	averageIntakeKcal?: number | null
	averageTargetKcal?: number | null
	averageTargetDeltaKcal?: number | null
	averageToleranceKcal?: number | null
	targetEligibleDays?: number
}

type TrendPoint = {
	date: string
	kcal: number | null
	targetKcal: number | null
	maintenanceKcal: number | null
	status: string
}

type TopFood = {
	name: string
	totalKcal: number
	totalProteinG: number
	count: number
}

type MealContrib = { mealType: string; kcal: number; pct: number }

type ApiResponse = {
	kpi: Kpi
	trendPoints: TrendPoint[]
	topFoodsByKcal: TopFood[]
	topFoodsByProtein: TopFood[]
	mealContribution: MealContrib[]
}

const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
	{ value: "7d", label: "7D" },
	{ value: "4w", label: "4W" },
	{ value: "12w", label: "12W" },
	{ value: "3m", label: "3M" },
]

type Props = {
	refreshKey?: number
}

export function AnalyticsView({ refreshKey }: Props) {
	const searchParams = useSearchParams()
	const experience = getActiveExperience(searchParams)
	const isImprint = experience === "imprint"

	const [range, setRange] = useState<RangeOption>("4w")
	const [data, setData] = useState<ApiResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async (r: RangeOption, silent = false) => {
		if (!silent) setLoading(true)
		setError(null)
		try {
			const res = await fetch(`/api/nutrition/analytics?range=${r}`)
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
				throw new Error(body?.error?.message ?? "Failed to load analytics")
			}
			const json = (await res.json()) as ApiResponse
			setData(json)
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unknown error")
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load(range)
	}, [range, load])

	useEffect(() => {
		if (refreshKey !== undefined && refreshKey > 0) {
			void load(range, true)
		}
	}, [refreshKey, range, load])

	return (
		<div className="space-y-6">
			{/* Range controls */}
			<div className="flex items-center justify-between">
				<div className="rounded-btn border-subtle bg-surface flex border p-0.5">
					{RANGE_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							onClick={() => setRange(opt.value)}
							className={cn(
								"rounded-[8px] px-3 py-1 text-sm",
								range === opt.value
									? "bg-elevated text-primary font-medium"
									: "text-muted hover:text-primary"
							)}
						>
							{opt.label}
						</button>
					))}
				</div>

				{data && <p className="text-muted text-xs">{data.kpi.coverageLabel}</p>}
			</div>

			{/* Error state */}
			{error && !loading && (
				<Panel>
					<p className="text-danger text-sm">{error}</p>
				</Panel>
			)}

			{/* Plain-Language Observation & Rhythm Strip (imprint mode only) */}
			{isImprint && (
				<Panel>
					<h3 className="text-primary mb-2 font-mono text-sm font-bold">Daily Rhythm</h3>
					{loading ? (
						<Skeleton className="h-[48px] rounded-xl" />
					) : (
						<div className="space-y-4">
							<p className="text-secondary text-xs leading-relaxed">
								{(() => {
									if (!data) return ""
									const {
										loggedDays,
										rangeDays,
										averageIntakeKcal,
										averageTargetDeltaKcal,
										averageToleranceKcal,
										targetEligibleDays,
									} = data.kpi

									const obs = buildPatternObservation({
										loggedDays,
										rangeDays,
										targetEligibleDays: targetEligibleDays ?? 0,
										averageIntakeKcal: averageIntakeKcal ?? null,
										averageTargetDeltaKcal: averageTargetDeltaKcal ?? null,
										averageToleranceKcal: averageToleranceKcal ?? null,
									})

									return renderPatternObservation(obs)
								})()}
							</p>
							<RhythmStrip trendPoints={data?.trendPoints ?? []} loading={loading} />
						</div>
					)}
				</Panel>
			)}

			{/* KPI summary (top on classic, bottom on imprint) */}
			{!isImprint && (
				<AnalyticsKpis
					kpi={
						data?.kpi ?? {
							avgKcal: null,
							avgTarget: null,
							loggedDays: 0,
							rangeDays: 0,
							coverageLabel: "",
							adherencePct: null,
							adherentDays: 0,
							overDays: 0,
							underDays: 0,
							avgProteinG: null,
						}
					}
					loading={loading}
				/>
			)}

			{/* Calorie trend chart */}
			<Panel>
				<h3 className="text-primary mb-3 font-mono text-sm font-bold">Calorie Trend</h3>
				{loading ? (
					<Skeleton className="h-[220px] rounded-xl" />
				) : (
					<CalorieTrendChart data={data?.trendPoints ?? []} />
				)}
			</Panel>

			{/* Top foods */}
			<Panel>
				<h3 className="text-primary mb-3 font-mono text-sm font-bold">Top Foods</h3>
				<TopFoods
					byKcal={data?.topFoodsByKcal ?? []}
					byProtein={data?.topFoodsByProtein ?? []}
					loading={loading}
				/>
			</Panel>

			{/* Meal contribution */}
			<Panel>
				<h3 className="text-primary mb-3 font-mono text-sm font-bold">Meal Breakdown</h3>
				{loading ? (
					<Skeleton className="h-[180px] rounded-xl" />
				) : (
					<MealContribution data={data?.mealContribution ?? []} />
				)}
			</Panel>

			{/* Demoted KPI summary for Imprint experience */}
			{isImprint && (
				<div className="border-subtle/30 border-t pt-4">
					<p className="text-secondary mb-3 font-mono text-xs font-semibold">
						Overall Period Stats
					</p>
					<AnalyticsKpis
						kpi={
							data?.kpi ?? {
								avgKcal: null,
								avgTarget: null,
								loggedDays: 0,
								rangeDays: 0,
								coverageLabel: "",
								adherencePct: null,
								adherentDays: 0,
								overDays: 0,
								underDays: 0,
								avgProteinG: null,
							}
						}
						loading={loading}
					/>
				</div>
			)}
		</div>
	)
}
