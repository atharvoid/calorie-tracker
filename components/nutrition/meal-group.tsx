"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
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
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div>
          <span className="font-medium text-primary">{label}</span>
          {timeLabel && (
            <span className="ml-1 text-xs text-muted">{timeLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-sm font-semibold tabular text-primary">
              {group.subtotal.kcal.toLocaleString("en-IN")} kcal
            </p>
            <p className="text-xs text-muted tabular">
              P {group.subtotal.proteinG.toFixed(1)}g
              {" "}C {group.subtotal.carbsG.toFixed(1)}g
              {" "}F {group.subtotal.fatG.toFixed(1)}g
            </p>
          </div>
          <span className="text-muted">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
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
