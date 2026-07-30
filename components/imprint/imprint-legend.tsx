"use client"

import { useState, useEffect } from "react"
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react"

export function ImprintLegend() {
	const [isOpen, setIsOpen] = useState(false)

	// Show legend automatically once per session
	useEffect(() => {
		const shown = sessionStorage.getItem("imprint_legend_shown")
		if (!shown) {
			setIsOpen(true)
			sessionStorage.setItem("imprint_legend_shown", "true")
		}
	}, [])

	return (
		<div className="border-subtle bg-surface overflow-hidden rounded-xl border text-xs">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="text-secondary hover:text-primary flex w-full items-center justify-between p-3.5 font-mono font-bold transition-colors focus:outline-none"
			>
				<div className="flex items-center gap-2">
					<HelpCircle className="text-accent h-4 w-4" />
					<span>How to read the Imprint</span>
				</div>
				{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
			</button>

			{isOpen && (
				<div className="border-subtle/40 text-secondary grid grid-cols-1 gap-4 border-t px-4 pt-1 pb-4 leading-relaxed sm:grid-cols-2">
					<div className="space-y-2">
						<div className="flex items-start gap-3">
							<span className="bg-accent mt-1.5 h-2 w-2 shrink-0 rounded-full" />
							<div>
								<span className="text-primary block font-bold">Meal Energy</span>
								The width & height of the island correspond directly to the calorie count.
							</div>
						</div>
						<div className="flex items-start gap-3">
							<span className="bg-accent mt-1.5 h-2 w-2 shrink-0 rounded-full" />
							<div>
								<span className="text-primary block font-bold">Protein Content</span>
								The number of nested outline contours increases with higher protein ratios.
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex items-start gap-3">
							<span className="bg-accent mt-1.5 h-2 w-2 shrink-0 rounded-full" />
							<div>
								<span className="text-primary block font-bold">Carbohydrate Ratio</span>
								Higher carbohydrate concentration skews and leans the shape horizontally.
							</div>
						</div>
						<div className="flex items-start gap-3">
							<span className="bg-accent mt-1.5 h-2 w-2 shrink-0 rounded-full" />
							<div>
								<span className="text-primary block font-bold">Fat Density</span>
								The opacity of the color wash inside the shape represents fat energy percentage.
							</div>
						</div>
					</div>
				</div>
			)}

			{/*
        Estimated disclosure — persistent and always in the DOM.
        Placed outside the collapsible body so screen readers encounter it
        regardless of whether the legend panel is open or closed.
        Not repeated per-meal. One product-level statement only.
      */}
			<p
				className="border-subtle/20 text-muted border-t px-4 py-2.5 text-center font-mono text-2xs font-medium"
				data-testid="imprint-estimated-disclosure"
			>
				Nutrition values are estimates and can be edited.
			</p>
		</div>
	)
}
