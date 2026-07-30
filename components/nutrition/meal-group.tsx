"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react"
import type { MealGroupDTO } from "@/lib/nutrition-types"
import { MealItemRow } from "./meal-item-row"

type Props = {
	group: MealGroupDTO
	onDeleteItem?: (id: string) => void
	onEditItem?: (id: string) => void
}

export function MealGroup({ group, onDeleteItem, onEditItem }: Props) {
	const [expanded, setExpanded] = useState(true)

	if (group.items.length === 0) return null

	const label = group.mealType ?? "Other"
	const timeLabel = group.timeHint ? ` · ${group.timeHint}` : ""

	return (
		<div className="border-subtle bg-surface rounded-xl border">
			{/* Group header */}
			<button
				onClick={() => setExpanded(!expanded)}
				className="hover:bg-elevated/10 flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left transition-colors"
				aria-expanded={expanded}
			>
				<div className="min-w-0 flex-1 pr-2">
					<span className="text-primary font-semibold">{label}</span>
					<span className="text-muted ml-1.5 text-2xs font-medium">
						({group.subtotal.itemCount} {group.subtotal.itemCount === 1 ? "item" : "items"})
					</span>
					{timeLabel && (
						<span className="text-muted bg-elevated mt-0.5 block w-max rounded px-1.5 py-0.5 text-2xs font-normal sm:mt-0 sm:ml-2 sm:inline sm:text-xs">
							{group.timeHint}
						</span>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-3">
					<div className="text-right">
						<p className="tabular text-primary font-mono text-sm leading-tight font-bold">
							{group.subtotal.kcal.toLocaleString("en-IN")}{" "}
							<span className="text-muted text-2xs font-normal">kcal</span>
						</p>
						<p className="text-muted tabular mt-0.5 text-2xs font-medium">
							P {group.subtotal.proteinG.toFixed(1)}g C {group.subtotal.carbsG.toFixed(1)}g F{" "}
							{group.subtotal.fatG.toFixed(1)}g
						</p>
					</div>
					<span className="text-muted">
						{expanded ? (
							<ChevronUp className="h-4.5 w-4.5" />
						) : (
							<ChevronDown className="h-4.5 w-4.5" />
						)}
					</span>
				</div>
			</button>

			{/* Expandable item list */}
			{expanded && (
				<div className="divide-subtle border-subtle divide-y border-t">
					{group.items.map((item) => (
						<MealItemRow key={item.id} item={item} onDelete={onDeleteItem} onEdit={onEditItem} />
					))}
				</div>
			)}
		</div>
	)
}

// Re-export icons so parent doesn't need to import
export { Trash2, Pencil }
