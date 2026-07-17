"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Panel } from "@/components/ui/panel"
import { WeekNavigator } from "./week-navigator"
import { TodayView } from "./today-view"
import { HistoryTable } from "./history-table"
import {
  mondayOfWeek,
  sundayOfWeek,
  localDate,
  isFuture,
} from "@/lib/nutrition-date"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"

const TZ = "Asia/Kolkata"

type SortOption = "newest" | "oldest" | "kcal-high" | "kcal-low"
type FilterOption = "all" | "logged" | "under" | "within" | "over"

type ApiResponse = { summaries: DailyNutritionSummary[]; total: number }

export function HistoryView() {
  const today = localDate(TZ)
  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeek(today))
  const [selectedDate, setSelectedDate] = useState<string | null>(today)
  const [weekSummaries, setWeekSummaries] = useState<DailyNutritionSummary[]>([])
  const [weekLoading, setWeekLoading] = useState(true)
  const [sort, setSort] = useState<SortOption>("newest")
  const [filter, setFilter] = useState<FilterOption>("all")
  const [historyData, setHistoryData] = useState<DailyNutritionSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Load current week summaries
  const loadWeek = useCallback(async (monday: string) => {
    const sunday = sundayOfWeek(monday)
    setWeekLoading(true)
    try {
      const res = await fetch(
        `/api/nutrition/history?start=${monday}&end=${sunday}&sort=oldest&status=all`
      )
      if (!res.ok) return
      const json = await res.json() as ApiResponse
      setWeekSummaries(json.summaries)
    } finally {
      setWeekLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWeek(weekMonday)
  }, [weekMonday, loadWeek])

  // Load last 4 weeks history for table
  const loadHistory = useCallback(async (s: SortOption, f: FilterOption) => {
    const end = today
    // Go back 28 days
    const start = new Date()
    start.setDate(start.getDate() - 28)
    const startStr = start.toLocaleDateString("en-CA", { timeZone: TZ })

    setHistoryLoading(true)
    try {
      const res = await fetch(
        `/api/nutrition/history?start=${startStr}&end=${end}&sort=${s}&status=${f}`
      )
      if (!res.ok) return
      const json = await res.json() as ApiResponse
      setHistoryData(json.summaries)
    } finally {
      setHistoryLoading(false)
    }
  }, [today])

  useEffect(() => {
    void loadHistory(sort, filter)
  }, [sort, filter, loadHistory])

  function handleWeekChange(monday: string) {
    setWeekMonday(monday)
    // Auto-select first non-future day in the new week
    const sunday = sundayOfWeek(monday)
    const nonFuture = !isFuture(sunday, TZ)
      ? sunday
      : !isFuture(today, TZ)
      ? today
      : null
    setSelectedDate(nonFuture)
  }

  function handleSelectDate(d: string) {
    setSelectedDate(d)
    const newMonday = mondayOfWeek(d)
    if (newMonday !== weekMonday) {
      setWeekMonday(newMonday)
    }
  }

  return (
    <div className="space-y-6">
      {/* Week navigator */}
      <Panel>
        {weekLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : (
          <WeekNavigator
            weekMonday={weekMonday}
            summaries={weekSummaries}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onWeekChange={handleWeekChange}
          />
        )}
      </Panel>

      {/* Selected day detail */}
      {selectedDate && (
        <div>
          <TodayView key={selectedDate} initialDate={selectedDate} />
        </div>
      )}

      {/* History table */}
      <div>
        <p className="mb-3 text-sm font-medium text-primary">Last 28 days</p>
        {historyLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : (
          <HistoryTable
            summaries={historyData}
            sort={sort}
            filter={filter}
            onSortChange={setSort}
            onFilterChange={setFilter}
            onSelectDate={handleSelectDate}
          />
        )}
      </div>
    </div>
  )
}
