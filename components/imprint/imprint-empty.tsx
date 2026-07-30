"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRIMARY_BTN } from "@/lib/ui"
import { VIEWBOX, SAFE } from "../../lib/imprint/constants"

interface ImprintEmptyProps {
	onLogMeal?: () => void
}

export function ImprintEmpty({ onLogMeal }: ImprintEmptyProps) {
	// Renders a faint editorial time rule on the canvas, overlayed with standard HTML prompts
	return (
		<div className="border-subtle bg-surface relative overflow-hidden rounded-xl border">
			{/* Visual Canvas Backdrop */}
			<svg
				viewBox={VIEWBOX}
				className="text-muted/30 pointer-events-none h-auto max-h-[300px] w-full select-none"
			>
				{/* Baseline timeline */}
				<line
					x1={SAFE.left}
					y1={520 - SAFE.bottom}
					x2={1000 - SAFE.right}
					y2={520 - SAFE.bottom}
					stroke="currentColor"
					strokeWidth="1.5"
					strokeDasharray="4 4"
				/>

				{/* Faint time ticks */}
				{[360, 720, 1080].map((min) => {
					const x = SAFE.left + (min / 1440) * 880
					return (
						<g key={min} className="opacity-40">
							<line
								x1={x}
								y1={SAFE.top}
								x2={x}
								y2={520 - SAFE.bottom}
								stroke="currentColor"
								strokeWidth="1"
								strokeDasharray="2 2"
							/>
							<text
								x={x}
								y={520 - SAFE.bottom + 22}
								textAnchor="middle"
								className="fill-current font-mono text-2xs font-bold"
							>
								{min === 360 ? "06:00" : min === 720 ? "12:00" : "18:00"}
							</text>
						</g>
					)
				})}
			</svg>

			{/* HTML Overlay with primary action */}
			<div className="bg-surface/20 absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-[0.5px]">
				<p className="text-secondary mb-3 font-mono text-sm font-semibold tracking-tight">
					No meals logged for this day.
				</p>
				{onLogMeal && (
					<Button onClick={onLogMeal} className={PRIMARY_BTN}>
						<Plus className="mr-2 h-4 w-4" /> Log a meal
					</Button>
				)}
			</div>
		</div>
	)
}
