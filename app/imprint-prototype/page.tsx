"use client"

import { useState, useEffect } from "react"
import { MOCK_FIXTURES } from "@/lib/imprint/fixtures"
import { DayImprint } from "@/components/imprint/day-imprint"
import { DayImprintStatic } from "@/components/imprint/day-imprint-static"
import { ImprintLegend } from "@/components/imprint/imprint-legend"
import { buildScene } from "@/lib/imprint/scene"
import { fnv1a } from "@/lib/imprint/seed"
import type { DailyNutritionSummary, MealGroupDTO, NutritionTotals } from "@/lib/nutrition-types"

export default function ImprintPrototypePage() {
	const [selectedKey, setSelectedKey] = useState<string>("fourBalanced")
	const [themeMode, setThemeMode] = useState<"classic" | "imprint">("imprint")
	const [motionMode, setMotionMode] = useState<"animated" | "static">("animated")
	const [viewportWidth, setViewportWidth] = useState<string>("100%")

	useEffect(() => {
		const previous = document.documentElement.dataset.experience
		if (themeMode === "imprint") {
			document.documentElement.dataset.experience = "imprint"
		} else {
			delete document.documentElement.dataset.experience
		}
		return () => {
			if (previous !== undefined) {
				document.documentElement.dataset.experience = previous
			} else {
				delete document.documentElement.dataset.experience
			}
		}
	}, [themeMode])

	const fixture = MOCK_FIXTURES[selectedKey]

	// Construct summary and mealGroups DTO structure from fixture
	const totalKcal = fixture.totals?.kcal ?? 0
	const totals: NutritionTotals | null = fixture.totals
		? {
				kcal: totalKcal,
				proteinG: fixture.totals.proteinG,
				carbsG: fixture.totals.carbsG,
				fatG: fixture.totals.fatG,
				itemCount: fixture.totals.itemCount,
			}
		: null

	const summary: DailyNutritionSummary = {
		date: fixture.date,
		totals,
		goal: {
			date: fixture.date,
			targetKcal: fixture.target.targetKcal,
			maintenanceKcal: fixture.target.maintenanceKcal,
			proteinTargetG: fixture.target.proteinTargetG,
			carbsTargetG: fixture.target.carbsTargetG,
			fatTargetG: fixture.target.fatTargetG,
			toleranceKcal: null,
			source: fixture.target.targetKcal ? "default" : "unconfigured",
		},
		remainingToTarget: fixture.target.targetKcal
			? Math.max(0, fixture.target.targetKcal - totalKcal)
			: null,
		targetDelta: fixture.target.targetKcal ? totalKcal - fixture.target.targetKcal : null,
		maintenanceBalance: fixture.target.maintenanceKcal
			? totalKcal - fixture.target.maintenanceKcal
			: null,
		status: totals
			? fixture.target.targetKcal
				? totalKcal > fixture.target.targetKcal
					? "over"
					: "under"
				: "unconfigured"
			: "no-data",
		mealCount: fixture.meals.length,
		assumptionCount: 0,
	}

	// Map meals into MealGroupDTO[] structure
	const mealGroups: MealGroupDTO[] = fixture.meals.map((m) => ({
		mealType: m.mealType,
		timeHint: m.localTime || null,
		items: Array.from({ length: m.itemCount }).map((_, idx) => ({
			id: `${m.id}-item-${idx}`,
			name: `Mock Food Item ${idx + 1}`,
			grams: 100,
			kcal: Math.round(m.kcal / m.itemCount),
			proteinG: Math.round(m.proteinG / m.itemCount),
			carbsG: Math.round(m.carbsG / m.itemCount),
			fatG: Math.round(m.fatG / m.itemCount),
			notes: "Mock item for layout test",
			source: "web",
			createdAt: m.createdAt,
		})),
		subtotal: {
			kcal: m.kcal,
			proteinG: m.proteinG,
			carbsG: m.carbsG,
			fatG: m.fatG,
			itemCount: m.itemCount,
		},
	}))

	const scene = buildScene(fixture)
	const sceneHash = fnv1a(JSON.stringify(scene)).toString(16)

	return (
		<div className={themeMode === "imprint" ? "theme-imprint" : ""}>
			<div className="bg-canvas text-primary min-h-screen p-6 transition-colors duration-300">
				<div className="mx-auto max-w-4xl space-y-6">
					{/* Header Controls */}
					<div className="border-subtle bg-surface flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
						<h1 className="font-mono text-sm font-bold">Daily Imprint Prototype Gate</h1>
						<div className="flex flex-wrap gap-3">
							{/* Scenario selector */}
							<select
								value={selectedKey}
								onChange={(e) => setSelectedKey(e.target.value)}
								className="border-subtle bg-elevated text-primary rounded border px-2.5 py-1 font-mono text-xs outline-none"
							>
								{Object.keys(MOCK_FIXTURES).map((key) => (
									<option key={key} value={key}>
										{key}
									</option>
								))}
							</select>

							{/* Theme selector */}
							<div className="border-subtle flex overflow-hidden rounded border font-mono text-xs">
								<button
									onClick={() => setThemeMode("imprint")}
									className={`px-2.5 py-1 ${
										themeMode === "imprint" ? "bg-accent text-white" : "bg-elevated text-secondary"
									}`}
								>
									Warm Paper
								</button>
								<button
									onClick={() => setThemeMode("classic")}
									className={`px-2.5 py-1 ${
										themeMode === "classic" ? "bg-accent text-white" : "bg-elevated text-secondary"
									}`}
								>
									Dark Classic
								</button>
							</div>

							{/* Motion selector */}
							<div className="border-subtle flex overflow-hidden rounded border font-mono text-xs">
								<button
									onClick={() => setMotionMode("animated")}
									className={`px-2.5 py-1 ${
										motionMode === "animated"
											? "bg-accent text-white"
											: "bg-elevated text-secondary"
									}`}
								>
									Animated
								</button>
								<button
									onClick={() => setMotionMode("static")}
									className={`px-2.5 py-1 ${
										motionMode === "static" ? "bg-accent text-white" : "bg-elevated text-secondary"
									}`}
								>
									Static
								</button>
							</div>

							{/* Width selector */}
							<select
								value={viewportWidth}
								onChange={(e) => setViewportWidth(e.target.value)}
								className="border-subtle bg-elevated text-primary rounded border px-2.5 py-1 font-mono text-xs outline-none"
							>
								<option value="100%">Full Width</option>
								<option value="430px">430px (Max Mobile)</option>
								<option value="375px">375px (Medium Mobile)</option>
								<option value="320px">320px (Min Mobile)</option>
							</select>
						</div>
					</div>

					{/* Viewport Sandbox container */}
					<div className="border-subtle bg-surface/10 flex justify-center rounded-xl border border-dashed p-4">
						<div style={{ width: viewportWidth }} className="space-y-4 transition-all duration-300">
							<div className="text-muted flex items-center justify-between px-1 font-mono text-[10px]">
								<span>Viewport: {viewportWidth === "100%" ? "Fluid" : viewportWidth}</span>
								<span>
									Scene FNV-1a Hash: <span className="text-accent font-bold">{sceneHash}</span>
								</span>
							</div>

							{/* Master Renderer */}
							{motionMode === "static" ? (
								<DayImprintStatic scene={scene} />
							) : (
								<DayImprint summary={summary} mealGroups={mealGroups} />
							)}

							<ImprintLegend />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
