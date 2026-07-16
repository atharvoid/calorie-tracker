"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, Lightbulb } from "lucide-react"
import { Panel } from "@/components/ui/panel"
import { EmptyState } from "@/components/ui/empty-state"
import { CalorieProgress } from "./calorie-progress"
import { MacroSummary } from "./macro-summary"
import { MealGroup } from "./meal-group"
import {
  localDate,
  addDays,
  isFuture,
  isToday,
  formatShortDate,
} from "@/lib/nutrition-date"
import type { DailyNutritionSummary, MealGroupDTO } from "@/lib/nutrition-types"

const TZ = "Asia/Kolkata"

type DayData = {
  summary: DailyNutritionSummary
  mealGroups: MealGroupDTO[]
  insights: string[]
}

type Props = {
  initialDate?: string
}

export function TodayView({ initialDate }: Props) {
  const today = localDate(TZ)
  const [date, setDate] = useState(initialDate ?? today)
  const [data, setData] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/nutrition/day?date=${d}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(body?.error?.message ?? "Failed to load")
      }
      const json = await res.json() as DayData
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(date)
  }, [date, load])

  // Exposed for realtime updates
  const refresh = useCallback(() => {
    void load(date)
  }, [date, load])

  function goToPrev() {
    setDate((d) => addDays(d, -1))
  }
  function goToNext() {
    if (!isFuture(addDays(date, 1), TZ)) setDate((d) => addDays(d, 1))
  }
  function goToToday() {
    setDate(today)
  }

  const nextDisabled = isFuture(addDays(date, 1), TZ)
  const dateLabel = isToday(date, TZ) ? "Today" : formatShortDate(date)

  function handleDeleteItem(id: string) {
    if (!data) return
    setData({
      ...data,
      mealGroups: data.mealGroups
        .map((g) => ({
          ...g,
          items: g.items.filter((it) => it.id !== id),
          subtotal: {
            ...g.subtotal,
            itemCount: g.items.filter((it) => it.id !== id).length,
          },
        }))
        .filter((g) => g.items.length > 0),
    })
    // Reload to get accurate totals
    setTimeout(() => void load(date), 300)
  }

  return (
    <div className="space-y-4">
      {/* Date navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToPrev}
          className="rounded-lg p-2 text-muted hover:text-primary hover:bg-elevated"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 text-center">
          <p className="font-semibold text-primary">{dateLabel}</p>
          <p className="text-xs text-muted">{date}</p>
        </div>

        <button
          onClick={goToNext}
          disabled={nextDisabled}
          className="rounded-lg p-2 text-muted hover:text-primary hover:bg-elevated disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {!isToday(date, TZ) && (
          <button
            onClick={goToToday}
            className="ml-1 rounded-lg px-2 py-1 text-xs text-accent hover:text-accent-hover border border-subtle"
          >
            Today
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <Panel className="flex h-[280px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </Panel>
      )}

      {/* Error state */}
      {!loading && error && (
        <Panel>
          <p className="text-sm text-danger">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Try again
          </button>
        </Panel>
      )}

      {/* Main content */}
      {!loading && !error && data && (
        <>
          <Panel>
            <CalorieProgress summary={data.summary} />
          </Panel>

          <Panel>
            <MacroSummary totals={data.summary.totals} goal={data.summary.goal} />
          </Panel>

          {/* Meal groups */}
          {data.mealGroups.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted px-1">
                Meals
              </p>
              {data.mealGroups.map((group, i) => (
                <MealGroup
                  key={group.mealType ?? `group-${i}`}
                  group={group}
                  onDeleteItem={handleDeleteItem}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No meals logged yet"
              hint={
                isToday(date, TZ)
                  ? "Send a message to your Telegram bot to log your meals."
                  : "No meals were logged on this day."
              }
              className="h-[160px]"
            />
          )}

          {/* Insights */}
          {data.insights.length > 0 && (
            <Panel>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-primary">Insights</p>
              </div>
              <ul className="space-y-2">
                {data.insights.slice(0, 2).map((insight, i) => (
                  <li key={i} className="flex gap-2 text-sm text-secondary">
                    <span className="text-accent mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
