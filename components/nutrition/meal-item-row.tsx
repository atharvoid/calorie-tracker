"use client"

import { useState } from "react"
import { MoreHorizontal, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { MealItemDTO } from "@/lib/nutrition-types"

type Props = {
	item: MealItemDTO
	onDelete?: (id: string) => void
	onEdit?: (id: string) => void
}

export function MealItemRow({ item, onDelete, onEdit }: Props) {
	const [menuOpen, setMenuOpen] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)

	async function handleDelete() {
		if (!confirmDelete) {
			setConfirmDelete(true)
			return
		}
		setDeleting(true)
		try {
			const res = await fetch(`/api/nutrition/items/${item.id}`, { method: "DELETE" })
			if (!res.ok) throw new Error("Delete failed")
			toast.success(`Removed ${item.name}`, {
				description: "Removed from your log. Google Sheets backup is append-only and not updated.",
			})
			onDelete?.(item.id)
		} catch {
			toast.error("Couldn't delete item")
		} finally {
			setDeleting(false)
			setConfirmDelete(false)
			setMenuOpen(false)
		}
	}

	return (
		<div className="relative flex min-h-[56px] items-center justify-between gap-3 px-4 py-3">
			{/* Food info */}
			<div className="min-w-0 flex-1">
				<span className="text-primary line-clamp-2 text-sm leading-snug font-semibold break-words">
					{item.name}
				</span>
				<div className="text-muted mt-0.5 flex items-center gap-1.5 text-2xs font-medium">
					{item.grams !== null && <span className="tabular font-mono">{item.grams}g</span>}
					{item.grams !== null && item.notes && <span>·</span>}
					{item.notes && <span className="max-w-[180px] truncate italic">{item.notes}</span>}
				</div>
			</div>

			{/* Calories & Protein right aligned */}
			<div className="shrink-0 pl-2 text-right">
				<p className="tabular text-primary font-mono text-sm leading-tight font-bold">
					{item.kcal.toLocaleString("en-IN")}{" "}
					<span className="text-muted text-2xs font-normal">kcal</span>
				</p>
				<p className="text-muted tabular mt-0.5 text-2xs font-medium">
					P {item.proteinG.toFixed(1)}g
				</p>
			</div>

			{/* Actions menu */}
			{(onDelete || onEdit) && (
				<div className="relative shrink-0">
					<button
						onClick={() => {
							setMenuOpen(!menuOpen)
							setConfirmDelete(false)
						}}
						className="text-muted hover:text-primary hover:bg-elevated ml-1 flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
						aria-label="Meal item actions"
					>
						<MoreHorizontal className="h-5 w-5" />
					</button>

					{menuOpen && (
						<div className="border-subtle bg-elevated animate-in fade-in slide-in-from-top-2 absolute top-11 right-0 z-20 min-w-[130px] rounded-xl border shadow-xl duration-150">
							{onEdit && (
								<button
									onClick={() => {
										setMenuOpen(false)
										onEdit(item.id)
									}}
									className="text-secondary hover:text-primary hover:bg-surface flex h-11 w-full items-center gap-2 rounded-t-xl px-3.5 text-left text-xs font-semibold transition-colors"
								>
									<Pencil className="text-muted h-4 w-4" /> Edit
								</button>
							)}
							{onDelete && (
								<button
									onClick={handleDelete}
									disabled={deleting}
									className={cn(
										"flex h-11 w-full items-center gap-2 rounded-b-xl px-3.5 text-left text-xs font-semibold transition-colors",
										confirmDelete
											? "bg-danger/15 text-danger"
											: "text-secondary hover:text-danger hover:bg-surface"
									)}
								>
									<Trash2 className={cn("h-4 w-4", confirmDelete ? "text-danger" : "text-muted")} />
									{deleting ? "Deleting…" : confirmDelete ? "Confirm" : "Delete"}
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
