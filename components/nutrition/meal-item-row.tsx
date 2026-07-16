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
    <div className="relative flex items-start gap-3 px-4 py-3">
      {/* Food info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-primary">{item.name}</span>
          {item.grams !== null && (
            <span className="shrink-0 text-xs text-muted tabular">{item.grams}g</span>
          )}
        </div>
        {item.notes && (
          <p className="mt-0.5 text-xs text-muted italic">
            {item.notes}
          </p>
        )}
      </div>

      {/* Macros */}
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-semibold tabular text-primary">
          {item.kcal.toLocaleString("en-IN")} kcal
        </p>
        <p className="text-xs text-muted tabular">
          P {item.proteinG.toFixed(1)}g
        </p>
      </div>

      {/* Actions menu */}
      {(onDelete || onEdit) && (
        <div className="relative">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false) }}
            className="ml-1 mt-0.5 rounded p-1 text-muted hover:text-primary hover:bg-elevated"
            aria-label="Meal item actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 min-w-[120px] rounded-xl border border-subtle bg-elevated shadow-lg">
              {onEdit && (
                <button
                  onClick={() => { setMenuOpen(false); onEdit(item.id) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-surface rounded-t-xl"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm rounded-b-xl",
                    confirmDelete
                      ? "bg-danger/10 text-danger font-semibold"
                      : "text-secondary hover:text-danger hover:bg-surface"
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
