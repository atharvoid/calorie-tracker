"use client"

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  sundayOfWeek,
  addDays,
  dateRange,
  formatWeekLabel,
  isToday,
  isFuture,
  formatWeekday,
  formatMonthDay,
  mondayOfWeek,
  localDate,
} from "@/lib/nutrition-date"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"

const TZ = "Asia/Kolkata"

const STATUS_DOT: Record<string, string> = {
  "no-data": "bg-elevated",
  unconfigured: "bg-muted",
  under: "bg-partial",
  within: "bg-paid",
  over: "bg-danger",
}

type Props = {
  /** Currently selected week's Monday date */
  weekMonday: string
  /** All summaries for this week (may have missing days) */
  summaries: DailyNutritionSummary[]
  /** Selected day */
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onWeekChange: (monday: string) => void
}

export function WeekNavigator({
  weekMonday,
  summaries,
  selectedDate,
  onSelectDate,
  onWeekChange,
}: Props) {
  const sunday = sundayOfWeek(weekMonday)
  const weekDates = dateRange(weekMonday, sunday)
  const summaryByDate = new Map(summaries.map((s) => [s.date, s]))

  function goPrev() {
    onWeekChange(addDays(weekMonday, -7))
  }
  function goNext() {
    const nextMonday = addDays(weekMonday, 7)
    // Don't navigate to a future week where all days are in the future
    const nextSunday = addDays(weekMonday, 13)
    if (!isFuture(nextSunday, TZ) || !isFuture(nextMonday, TZ)) {
      onWeekChange(nextMonday)
    }
  }

  const allNextFuture = isFuture(addDays(weekMonday, 7), TZ)

  const selectedSummary = selectedDate ? summaryByDate.get(selectedDate) : null

  return (
    <div>
      {/* Week header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={goPrev}
          className="rounded-lg p-1.5 text-muted hover:text-primary hover:bg-elevated transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>
        <p className="text-sm font-semibold text-secondary">
          {formatWeekLabel(weekMonday, sunday)}
        </p>
        <button
          onClick={goNext}
          disabled={allNextFuture}
          className="rounded-lg p-1.5 text-muted hover:text-primary hover:bg-elevated disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Quick Navigation Controls */}
      <div className="mb-4 flex items-center justify-between text-xs border-b border-subtle/50 pb-2">
        <button
          onClick={() => onWeekChange(mondayOfWeek(localDate(TZ)))}
          className="text-accent font-semibold hover:underline bg-transparent border-0 cursor-pointer focus:outline-none"
        >
          This week
        </button>
        <button
          onClick={() => {
            const input = document.getElementById("history-date-picker") as HTMLInputElement
            if (input) {
              if (typeof input.showPicker === "function") {
                input.showPicker()
              } else {
                input.click()
              }
            }
          }}
          className="text-secondary hover:text-primary bg-transparent border-0 cursor-pointer flex items-center gap-1 font-semibold focus:outline-none"
        >
          <Calendar className="h-3.5 w-3.5" />
          Jump to date
          <input
            id="history-date-picker"
            type="date"
            max={localDate(TZ)}
            value={selectedDate || ""}
            onChange={(e) => {
              if (e.target.value) onSelectDate(e.target.value)
            }}
            className="sr-only"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date) => {
          const summary = summaryByDate.get(date)
          const future = isFuture(date, TZ)
          const today = isToday(date, TZ)
          const selected = date === selectedDate
          const hasData = summary?.totals !== null && summary !== undefined
          const kcal = summary?.totals?.kcal ?? null
          const status = summary?.status ?? "no-data"

          return (
            <button
              key={date}
              onClick={() => !future && onSelectDate(date)}
              disabled={future}
              aria-label={`${date}${today ? " (today)" : ""}: ${kcal !== null ? `${kcal} kcal, ${status}` : "no data"}`}
              className={cn(
                "flex flex-col items-center rounded-xl py-2 px-1 text-center transition-colors focus:outline-none",
                selected
                  ? "bg-accent/10 ring-1 ring-accent"
                  : "hover:bg-elevated",
                future && "opacity-40 cursor-not-allowed",
                today && !selected && "ring-1 ring-muted/50"
              )}
            >
              <span className="text-[10px] sm:text-xs text-muted uppercase font-semibold">
                {formatWeekday(date).slice(0, 1)}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-sm font-bold",
                  today ? "text-accent" : "text-secondary"
                )}
              >
                {formatMonthDay(date).split(" ")[0]}
              </span>

              {/* Status dot */}
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 rounded-full",
                  STATUS_DOT[status] ?? "bg-elevated"
                )}
                aria-hidden
              />

              {/* kcal or em dash - hidden on mobile, shown on tablet/desktop */}
              <span className="mt-0.5 font-mono text-[9px] sm:text-[10px] tabular text-muted hidden sm:inline">
                {hasData ? `${(kcal ?? 0).toLocaleString("en-IN")}` : "—"}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected Day Calorie Summary below strip (mobile only) */}
      {selectedSummary && (
        <div className="mt-3 flex items-center justify-between border-t border-subtle/50 pt-2 text-xs sm:hidden">
          <span className="text-secondary font-medium">
            Selected: <span className="text-primary font-semibold">{selectedDate}</span>
          </span>
          <span className="font-mono tabular text-primary font-bold">
            {selectedSummary.totals !== null ? (
              <>
                {selectedSummary.totals.kcal.toLocaleString("en-IN")} kcal
                {selectedSummary.goal.targetKcal !== null && (
                  <span className="text-muted font-normal text-[10px] ml-1">
                    / {selectedSummary.goal.targetKcal.toLocaleString("en-IN")} target
                  </span>
                )}
              </>
            ) : (
              "Not logged"
            )}
          </span>
        </div>
      )}
    </div>
  )
}
