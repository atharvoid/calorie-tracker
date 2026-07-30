"use client"

import { useState } from "react"
import { Sparkles, Check, ChevronRight } from "lucide-react"
import { DayImprint } from "../imprint/day-imprint"
import type { DailyNutritionSummary, MealGroupDTO } from "@/lib/nutrition-types"

const SAMPLE_LOG = "2 boiled eggs, a slice of whole wheat toast, and 100g greek yogurt"

export function HeroDemo() {
	const [step, setStep] = useState<"input" | "extracted" | "saved">("input")
	const [inputText, setInputText] = useState("")

	const handleEstimate = () => {
		setInputText(SAMPLE_LOG)
		setStep("extracted")
	}

	// Pre-configured draft mock data
	const summary: DailyNutritionSummary = {
		date: "2026-07-18",
		totals: { kcal: 260, proteinG: 22, carbsG: 19, fatG: 10, itemCount: 3 },
		goal: {
			date: "2026-07-18",
			targetKcal: 2000,
			maintenanceKcal: 2500,
			proteinTargetG: 140,
			carbsTargetG: 220,
			fatTargetG: 65,
			toleranceKcal: null,
			source: "default",
		},
		remainingToTarget: 1740,
		targetDelta: -1740,
		maintenanceBalance: -2240,
		status: "under",
		mealCount: 1,
		assumptionCount: 0,
	}

	const mealGroups: MealGroupDTO[] = [
		{
			mealType: "Breakfast",
			timeHint: "08:30",
			items: [
				{
					id: "egg",
					name: "Boiled Eggs",
					grams: 100,
					kcal: 140,
					proteinG: 12,
					carbsG: 0,
					fatG: 10,
					notes: "Assumed 2 eggs",
					source: "web",
					createdAt: "2026-07-18T08:30:00Z",
				},
				{
					id: "toast",
					name: "Whole Wheat Toast",
					grams: 30,
					kcal: 60,
					proteinG: 2,
					carbsG: 15,
					fatG: 0,
					notes: "Assumed 1 slice",
					source: "web",
					createdAt: "2026-07-18T08:30:00Z",
				},
				{
					id: "yogurt",
					name: "Greek Yogurt",
					grams: 100,
					kcal: 60,
					proteinG: 8,
					carbsG: 4,
					fatG: 0,
					notes: "Assumed plain low fat",
					source: "web",
					createdAt: "2026-07-18T08:30:00Z",
				},
			],
			subtotal: { kcal: 260, proteinG: 22, carbsG: 19, fatG: 10, itemCount: 3 },
		},
	]

	return (
		<div className="border-subtle bg-surface mx-auto max-w-xl overflow-hidden rounded-xl border shadow-2xl transition-all duration-300">
			<div className="border-subtle bg-surface/40 flex items-center justify-between border-b p-4 font-mono text-xs">
				<span className="text-secondary">Interactive Demo</span>
				<span className="text-accent font-bold">
					Step {step === "input" ? "1" : step === "extracted" ? "2" : "3"} of 3
				</span>
			</div>

			<div className="space-y-4 p-5">
				{step === "input" && (
					<div className="space-y-4">
						<div>
							<label className="text-secondary mb-1.5 block font-mono text-xs font-semibold">
								What did you eat today?
							</label>
							<textarea
								value={inputText}
								onChange={(e) => setInputText(e.target.value)}
								placeholder="Type here or click the sample below…"
								className="border-subtle bg-elevated text-primary focus:ring-accent placeholder-muted/60 h-20 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
								disabled
							/>
						</div>

						<button
							onClick={handleEstimate}
							className="bg-accent hover:bg-accent-hover flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold text-[color:var(--accent-contrast)] transition-colors"
						>
							<Sparkles className="h-4 w-4" /> Try Sample Log
						</button>
						<p className="text-muted text-center font-mono text-2xs italic">
							Sample: &ldquo;{SAMPLE_LOG}&rdquo;
						</p>
					</div>
				)}

				{step === "extracted" && (
					<div className="space-y-4">
						<div className="border-accent/40 bg-surface text-primary rounded-lg border border-dashed p-3.5 shadow-sm">
							<span className="border-accent/30 bg-accent/10 text-accent mb-2 inline-block rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase">
								Draft Imprint forming
							</span>
							<p className="text-primary mb-3 font-sans text-xs leading-relaxed font-semibold">
								&ldquo;{SAMPLE_LOG}&rdquo;
							</p>

							{/* Draft Foods List */}
							<div className="border-subtle/40 space-y-2 border-t pt-2 text-xs">
								{mealGroups[0].items.map((item) => (
									<div
										key={item.id}
										className="text-secondary flex items-baseline justify-between font-mono text-2xs"
									>
										<span>
											{item.name} <span className="text-muted">({item.grams}g)</span>
										</span>
										<span className="text-primary font-bold">{item.kcal} kcal</span>
									</div>
								))}
							</div>
						</div>

						<div className="flex gap-2">
							<button
								onClick={() => setStep("input")}
								className="border-subtle text-secondary hover:text-primary hover:bg-elevated flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-xs font-bold transition-colors"
							>
								Reset
							</button>
							<button
								onClick={() => setStep("saved")}
								className="bg-accent hover:bg-accent-hover flex flex-[2] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold text-[color:var(--accent-contrast)] transition-colors"
							>
								<Check className="h-4 w-4" /> Confirm & Save to Diary
							</button>
						</div>
					</div>
				)}

				{step === "saved" && (
					<div className="animate-in fade-in zoom-in-95 space-y-4 duration-200">
						<div className="space-y-1 text-center">
							<p className="text-accent font-mono text-xs font-bold tracking-wider uppercase">
								Saved to your Daily Imprint
							</p>
							<p className="text-muted font-mono text-2xs">{summary.date}</p>
						</div>

						{/* Imprint Renderer */}
						<DayImprint summary={summary} mealGroups={mealGroups} />

						<button
							onClick={() => setStep("input")}
							className="border-subtle text-secondary hover:text-primary hover:bg-elevated flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition-colors"
						>
							Start over <ChevronRight className="h-4 w-4" />
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
