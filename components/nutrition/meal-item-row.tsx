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
    <div className="relative flex items-center justify-between gap-3 px-4 py-3 min-h-[56px]">
      {/* Food info */}
      <div className="min-w-0 flex-1">
        <span className="break-words line-clamp-2 text-sm font-semibold text-primary leading-snug">
          {item.name}
        </span>
        <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium mt-0.5">
          {item.grams !== null && (
            <span className="font-mono tabular">{item.grams}g</span>
          )}
          {item.grams !== null && item.notes && <span>·</span>}
          {item.notes && (
            <span className="italic truncate max-w-[180px]">{item.notes}</span>
          )}
        </div>
      </div>

      {/* Calories & Protein right aligned */}
      <div className="shrink-0 text-right pl-2">
        <p className="font-mono text-sm font-bold tabular text-primary leading-tight">
          {item.kcal.toLocaleString("en-IN")}{" "}
          <span className="text-[10px] text-muted font-normal">kcal</span>
        </p>
        <p className="text-[11px] text-muted font-medium tabular mt-0.5">
          P {item.proteinG.toFixed(1)}g
        </p>
      </div>

      {/* Actions menu */}
      {(onDelete || onEdit) && (
        <div className="relative shrink-0">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false) }}
            className="ml-1 rounded-lg h-11 w-11 flex items-center justify-center text-muted hover:text-primary hover:bg-elevated transition-colors"
            aria-label="Meal item actions"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-20 min-w-[130px] rounded-xl border border-subtle bg-elevated shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
              {onEdit && (
                <button
                  onClick={() => { setMenuOpen(false); onEdit(item.id) }}
                  className="flex w-full items-center gap-2 h-11 px-3.5 text-xs font-semibold text-secondary hover:text-primary hover:bg-surface rounded-t-xl transition-colors text-left"
                >
                  <Pencil className="h-4 w-4 text-muted" /> Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={cn(
                    "flex w-full items-center gap-2 h-11 px-3.5 text-xs font-semibold rounded-b-xl transition-colors text-left",
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
