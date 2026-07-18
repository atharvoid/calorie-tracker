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

const STATUS_DOT: Record<string, string> = {
  "no-data": "bg-elevated",
  unconfigured: "bg-muted",
  under: "bg-partial",
  within: "bg-paid",
  over: "bg-danger",
}

type SortOption = "newest" | "oldest" | "kcal-high" | "kcal-low"
type FilterOption = "all" | "logged" | "under" | "within" | "over"

type Props = {
  summaries: DailyNutritionSummary[]
  sort: SortOption
  filter: FilterOption
  onSortChange: (sort: SortOption) => void
  onFilterChange: (filter: FilterOption) => void
  onSelectDate?: (date: string) => void
}

export function HistoryTable({
  summaries,
  sort,
  filter,
  onSortChange,
  onFilterChange,
  onSelectDate,
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
                onClick={() => onSelectDate?.(s.date)}
                className="border-b border-subtle last:border-0 hover:bg-elevated/20 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2 text-secondary">{s.date}</td>
                <td className="px-3 py-2 font-mono tabular text-primary">
                  {s.totals !== null ? s.totals.kcal.toLocaleString("en-IN") : "—"}
                </td>
                <td className="px-3 py-2 font-mono tabular text-secondary">
                  {s.goal.targetKcal !== null ? s.goal.targetKcal.toLocaleString("en-IN") : "—"}
                </td>
                <td className={cn("px-3 py-2 text-xs font-medium", STATUS_COLOR[s.status] ?? "text-muted")}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[s.status] ?? "bg-elevated")}
                      aria-hidden
                    />
                    <span>{STATUS_LABEL[s.status] ?? s.status}</span>
                  </div>
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

      {/* Mobile cards — no SVG, status badge only */}
      <div className="sm:hidden space-y-2.5">
        {summaries.map((s) => (
          <div
            key={s.date}
            onClick={() => onSelectDate?.(s.date)}
            className="rounded-xl border border-subtle bg-surface p-3.5 cursor-pointer hover:bg-elevated/20 transition-all active:scale-[0.99] flex flex-col justify-between gap-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-primary">{s.date}</p>
                <span className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-1",
                  s.status === "within" ? "bg-paid/10 text-paid" :
                  s.status === "over" ? "bg-danger/10 text-danger" :
                  s.status === "under" ? "bg-partial/10 text-partial" : "bg-elevated text-muted"
                )}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </div>

              <div className="text-right">
                <p className="font-mono text-base font-extrabold tabular text-primary leading-none">
                  {s.totals !== null ? `${s.totals.kcal.toLocaleString("en-IN")}` : "—"}{" "}
                  <span className="text-[10px] text-muted font-normal">kcal</span>
                </p>
                {s.goal.targetKcal !== null && (
                  <p className="text-[10px] text-muted font-medium mt-1">
                    of {s.goal.targetKcal.toLocaleString("en-IN")} target
                  </p>
                )}
              </div>
            </div>

            {s.totals !== null && (
              <div className="flex items-center justify-between border-t border-subtle/50 pt-2 flex-wrap gap-2">
                <div className="flex gap-2.5 text-[10px] text-muted font-semibold tabular">
                  <span>P: <strong className="text-secondary">{s.totals.proteinG.toFixed(0)}g</strong></span>
                  <span>C: <strong className="text-secondary">{s.totals.carbsG.toFixed(0)}g</strong></span>
                  <span>F: <strong className="text-secondary">{s.totals.fatG.toFixed(0)}g</strong></span>
                </div>

                <span className="text-[9px] text-muted bg-elevated/80 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {s.mealCount} {s.mealCount === 1 ? "meal" : "meals"}
                </span>
              </div>
            )}

            {s.totals === null && (
              <div className="border-t border-subtle/50 pt-2 text-[10px] text-muted italic">
                No meals logged for this date. Tap to log.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
