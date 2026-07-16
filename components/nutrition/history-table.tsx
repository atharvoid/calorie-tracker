"use client"

import { cn } from "@/lib/utils"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"

const STATUS_LABEL: Record<string, string> = {
  "no-data": "—",
  unconfigured: "No target",
  under: "Under",
  within: "On track",
  over: "Over",
}

const STATUS_COLOR: Record<string, string> = {
  "no-data": "text-muted",
  unconfigured: "text-muted",
  under: "text-partial",
  within: "text-paid",
  over: "text-danger",
}

type SortOption = "newest" | "oldest" | "kcal-high" | "kcal-low"
type FilterOption = "all" | "logged" | "under" | "within" | "over"

type Props = {
  summaries: DailyNutritionSummary[]
  sort: SortOption
  filter: FilterOption
  onSortChange: (sort: SortOption) => void
  onFilterChange: (filter: FilterOption) => void
}

export function HistoryTable({
  summaries,
  sort,
  filter,
  onSortChange,
  onFilterChange,
}: Props) {
  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "kcal-high", label: "Highest calories" },
    { value: "kcal-low", label: "Lowest calories" },
  ]

  const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
    { value: "all", label: "All days" },
    { value: "logged", label: "Logged only" },
    { value: "under", label: "Under target" },
    { value: "within", label: "On track" },
    { value: "over", label: "Over target" },
  ]

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded-lg border border-subtle bg-elevated px-3 py-1.5 text-xs text-secondary"
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as FilterOption)}
          className="rounded-lg border border-subtle bg-elevated px-3 py-1.5 text-xs text-secondary"
          aria-label="Filter by status"
        >
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {summaries.length === 0 && (
        <p className="text-sm text-muted text-center py-8">No data matches your filter.</p>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle">
              {["Date", "Calories", "Target", "Status", "Protein", "Carbs", "Fat", "Items"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr
                key={s.date}
                className="border-b border-subtle last:border-0 hover:bg-elevated/20"
              >
                <td className="px-3 py-2 text-secondary">{s.date}</td>
                <td className="px-3 py-2 font-mono tabular text-primary">
                  {s.totals !== null ? s.totals.kcal.toLocaleString("en-IN") : "—"}
                </td>
                <td className="px-3 py-2 font-mono tabular text-secondary">
                  {s.goal.targetKcal !== null ? s.goal.targetKcal.toLocaleString("en-IN") : "—"}
                </td>
                <td className={cn("px-3 py-2 text-xs font-medium", STATUS_COLOR[s.status] ?? "text-muted")}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </td>
                <td className="px-3 py-2 font-mono tabular text-secondary">
                  {s.totals !== null ? `${s.totals.proteinG.toFixed(1)}g` : "—"}
                </td>
                <td className="px-3 py-2 font-mono tabular text-secondary">
                  {s.totals !== null ? `${s.totals.carbsG.toFixed(1)}g` : "—"}
                </td>
                <td className="px-3 py-2 font-mono tabular text-secondary">
                  {s.totals !== null ? `${s.totals.fatG.toFixed(1)}g` : "—"}
                </td>
                <td className="px-3 py-2 font-mono tabular text-secondary">
                  {s.mealCount > 0 ? s.mealCount : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {summaries.map((s) => (
          <div
            key={s.date}
            className="rounded-xl border border-subtle bg-surface p-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-primary">{s.date}</p>
                <p className={cn("text-xs mt-0.5", STATUS_COLOR[s.status] ?? "text-muted")}>
                  {STATUS_LABEL[s.status] ?? ""}
                </p>
              </div>
              <p className="font-mono text-lg font-bold tabular text-primary">
                {s.totals !== null ? `${s.totals.kcal.toLocaleString("en-IN")} kcal` : "—"}
              </p>
            </div>
            {s.totals !== null && (
              <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-muted tabular">
                <span>P {s.totals.proteinG.toFixed(1)}g</span>
                <span>C {s.totals.carbsG.toFixed(1)}g</span>
                <span>F {s.totals.fatG.toFixed(1)}g</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
