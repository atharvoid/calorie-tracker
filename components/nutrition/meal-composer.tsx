"use client"

import { useState } from "react"
import { Loader2, Sparkles, X, Check, AlertCircle } from "lucide-react"
import { formatShortDate } from "@/lib/nutrition-date"
import type { NutritionResult } from "@/lib/nutrition"

type CommitNutritionResult = {
	rowCount: number
	date: string
	spreadsheetId: string
	syncWarning?: string
	insertedIds: string[]
}

type MealComposerProps = {
	logDate: string
	sourceContext: "today" | "history"
	onCommitted: (result: CommitNutritionResult) => void
	onCancel: () => void
}

export function MealComposer({
	logDate,
	sourceContext: _sourceContext,
	onCommitted,
	onCancel,
}: MealComposerProps) {
	const [text, setText] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [preview, setPreview] = useState<NutritionResult | null>(null)
	const [committing, setCommitting] = useState(false)

	const formattedDate = formatShortDate(logDate)

	async function handleEstimate() {
		if (!text.trim()) return
		setLoading(true)
		setError(null)
		setPreview(null)
		try {
			const res = await fetch("/api/nutrition/extract", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, logDate }),
			})
			const data = await res.json()
			if (!res.ok) {
				throw new Error(data.error?.message || "Failed to extract nutrition estimate")
			}
			setPreview(data)
		} catch (err: any) {
			setError(err.message || "Failed to parse meal description")
		} finally {
			setLoading(false)
		}
	}

	async function handleSave() {
		if (!preview) return
		setCommitting(true)
		setError(null)
		try {
			const res = await fetch("/api/nutrition/day", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ nutrition: preview, logDate }),
			})
			const data = await res.json()
			if (!res.ok) {
				throw new Error(data.error?.message || "Failed to save meals")
			}
			onCommitted(data)
		} catch (err: any) {
			setError(err.message || "Failed to save meals")
		} finally {
			setCommitting(false)
		}
	}

	return (
		<div className="bg-background fixed inset-0 z-50 flex min-h-dvh flex-col overflow-hidden md:relative md:inset-auto md:z-0 md:min-h-0 md:overflow-visible md:bg-transparent">
			{/* Scrollable Content Container */}
			<div className="bg-canvas/40 md:bg-surface border-subtle md:rounded-card flex-1 overflow-y-auto border px-4 py-6 pb-28 shadow-lg md:relative md:p-5 md:pb-0">
				<button
					onClick={onCancel}
					className="text-muted hover:text-primary hover:bg-elevated absolute top-4 right-4 rounded-lg p-1.5 transition-colors"
					aria-label="Close"
				>
					<X className="h-5 w-5" />
				</button>

				<div className="mb-4">
					<h3 className="text-primary flex items-center gap-1.5 text-base font-bold">
						Log meal for <span className="text-accent">{formattedDate}</span>
					</h3>
					<p className="text-muted mt-0.5 text-xs">
						Describe what you ate in natural language (English, Hinglish).
					</p>
				</div>

				<div className="space-y-4">
					{!preview ? (
						<div className="flex flex-col space-y-2">
							<textarea
								value={text}
								onChange={(e) => setText(e.target.value)}
								disabled={loading || committing}
								placeholder="e.g. 2 fried eggs with 2 slices of whole wheat toast and a cup of black coffee for breakfast"
								className="border-subtle bg-surface text-primary placeholder-muted focus:border-accent min-h-[140px] w-full resize-none rounded-lg border p-3 text-base transition-all focus:outline-none disabled:opacity-50"
								autoFocus
							/>
							{text.length > 400 && (
								<span className="text-muted text-2xs self-end">{text.length}/500</span>
							)}
						</div>
					) : (
						<div className="border-subtle bg-elevated/10 space-y-4 rounded-lg border p-4">
							<div className="border-subtle flex items-center justify-between border-b pb-2">
								<span className="text-muted text-xs font-semibold tracking-wider uppercase">
									Nutrition Estimate Preview
								</span>
								<span className="text-accent text-xs">
									Target date: <span className="font-semibold">{logDate}</span>
								</span>
							</div>

							<div className="space-y-4">
								{preview.meals.map((meal, mIdx) => (
									<div key={mIdx} className="space-y-1.5">
										<div className="flex items-center gap-2">
											<span className="text-primary text-xs font-bold">
												{meal.meal_type || "Other"}
											</span>
											{meal.time_hint && (
												<span className="text-muted bg-elevated text-2xs rounded px-1.5 py-0.5 font-medium">
													{meal.time_hint}
												</span>
											)}
										</div>

										<ul className="space-y-1">
											{meal.items.map((item, iIdx) => (
												<li
													key={iIdx}
													className="text-secondary border-subtle/50 flex flex-col justify-between border-b pb-1.5 text-xs last:border-0 sm:flex-row sm:items-center"
												>
													<div className="flex flex-col">
														<span className="text-primary font-medium">
															{item.name}
															{item.grams != null && (
																<span className="text-muted text-2xs ml-1">({item.grams}g)</span>
															)}
														</span>
														{item.notes && (
															<span className="text-muted text-2xs italic">{item.notes}</span>
														)}
													</div>
													<div className="text-2xs mt-1 flex items-center gap-3 font-mono sm:mt-0">
														<span className="text-primary font-semibold">{item.kcal} kcal</span>
														<span className="text-muted">
															P {item.protein_g}g | C {item.carbs_g}g | F {item.fat_g}g
														</span>
													</div>
												</li>
											))}
										</ul>
									</div>
								))}
							</div>

							<div className="border-subtle text-primary bg-elevated/20 flex flex-wrap items-center justify-between gap-2 rounded-lg border-t p-2.5 pt-3 font-mono text-xs font-semibold">
								<span>Extracted Totals:</span>
								<div className="flex gap-3">
									<span className="text-primary">
										{preview.meals.reduce(
											(acc, m) => acc + m.items.reduce((s, it) => s + it.kcal, 0),
											0
										)}{" "}
										kcal
									</span>
									<span className="text-muted">
										P{" "}
										{Math.round(
											preview.meals.reduce(
												(acc, m) => acc + m.items.reduce((s, it) => s + it.protein_g, 0),
												0
											)
										)}
										g | C{" "}
										{Math.round(
											preview.meals.reduce(
												(acc, m) => acc + m.items.reduce((s, it) => s + it.carbs_g, 0),
												0
											)
										)}
										g | F{" "}
										{Math.round(
											preview.meals.reduce(
												(acc, m) => acc + m.items.reduce((s, it) => s + it.fat_g, 0),
												0
											)
										)}
										g
									</span>
								</div>
							</div>
						</div>
					)}

					{error && (
						<div className="bg-danger/5 border-danger/25 text-danger flex gap-2 rounded-lg border p-3 text-xs">
							<AlertCircle className="h-4 w-4 shrink-0" />
							<span>{error}</span>
						</div>
					)}
				</div>
			</div>

			{/* Sticky Bottom Action Area on Mobile, Relative Panel Footing on Desktop */}
			<div className="border-subtle bg-surface/95 fixed right-0 bottom-0 left-0 z-10 flex items-center justify-end gap-2 border-t px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-md md:relative md:right-auto md:bottom-auto md:left-auto md:mt-2 md:border-0 md:bg-transparent md:p-0 md:pt-4 md:pb-0">
				<button
					type="button"
					onClick={onCancel}
					disabled={loading || committing}
					className="border-subtle bg-surface text-secondary hover:text-primary hover:bg-elevated flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border px-4 py-2.5 text-center text-xs font-semibold transition-all disabled:opacity-50 md:flex-initial"
				>
					Cancel
				</button>

				{preview && (
					<button
						type="button"
						onClick={() => setPreview(null)}
						disabled={committing}
						className="border-subtle bg-surface text-secondary hover:text-primary hover:bg-elevated flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border px-4 py-2.5 text-center text-xs font-semibold transition-all disabled:opacity-50 md:flex-initial"
					>
						Edit
					</button>
				)}

				{!preview ? (
					<button
						type="button"
						onClick={handleEstimate}
						disabled={loading || !text.trim()}
						className="bg-accent hover:bg-accent-hover flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-50 md:flex-initial"
					>
						{loading ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Sparkles className="h-3.5 w-3.5" />
						)}
						Estimate
					</button>
				) : (
					<button
						type="button"
						onClick={handleSave}
						disabled={committing}
						className="bg-paid hover:bg-paid-hover flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-50 md:flex-initial"
					>
						{committing ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Check className="h-3.5 w-3.5" />
						)}
						Save to {logDate}
					</button>
				)}
			</div>
		</div>
	)
}
