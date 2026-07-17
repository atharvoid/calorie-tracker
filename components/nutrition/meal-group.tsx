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
    <div className="rounded-xl border border-subtle bg-surface">
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-elevated/10 rounded-xl"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1 pr-2">
          <span className="font-semibold text-primary">{label}</span>
          <span className="text-[11px] text-muted ml-1.5 font-medium">
            ({group.subtotal.itemCount} {group.subtotal.itemCount === 1 ? "item" : "items"})
          </span>
          {timeLabel && (
            <span className="block sm:inline sm:ml-2 text-[10px] sm:text-xs text-muted font-normal bg-elevated px-1.5 py-0.5 rounded w-max mt-0.5 sm:mt-0">
              {group.timeHint}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-mono text-sm font-bold tabular text-primary leading-tight">
              {group.subtotal.kcal.toLocaleString("en-IN")} <span className="text-[10px] text-muted font-normal">kcal</span>
            </p>
            <p className="text-[11px] text-muted font-medium tabular mt-0.5">
              P {group.subtotal.proteinG.toFixed(1)}g
              {" "}C {group.subtotal.carbsG.toFixed(1)}g
              {" "}F {group.subtotal.fatG.toFixed(1)}g
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
        <div className="divide-y divide-subtle border-t border-subtle">
          {group.items.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              onDelete={onDeleteItem}
              onEdit={onEditItem}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Re-export icons so parent doesn't need to import
export { Trash2, Pencil }
